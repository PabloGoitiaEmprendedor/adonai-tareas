import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { taskTitle, dueDate } = await req.json();

    const [contextRes, profileRes, tasksRes, goalsRes, contextsRes, foldersRes, blocksRes] = await Promise.all([
      supabase.from("user_context").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("tasks").select("id, title, priority, urgency, importance, status, due_date, context_id, estimated_minutes, folder_id").eq("user_id", userId).eq("status", "pending").limit(20),
      supabase.from("goals").select("id, title, horizon, active").eq("user_id", userId).eq("active", true),
      supabase.from("contexts").select("id, name").eq("user_id", userId),
      supabase.from("folders").select("id, name").eq("user_id", userId),
      supabase.from("time_blocks").select("id, title, start_time, end_time, color, block_date").eq("user_id", userId).gte("block_date", new Date().toISOString().split("T")[0]).order("start_time"),
    ]);

    const userContext = contextRes.data;
    const profile = profileRes.data;
    const goals = goalsRes.data || [];
    const contexts = contextsRes.data || [];
    const folders = foldersRes.data || [];
    const timeBlocks = blocksRes.data || [];

    const contextList = contexts.map((c: any) => `${c.name} (id: ${c.id})`).join(", ");
    const goalsList = goals.map((g: any) => `${g.title} [id: ${g.id}] (${g.horizon})`).join(", ");
    const foldersList = folders.map((f: any) => `${f.name} (id: ${f.id})`).join(", ");
    const blocksList = timeBlocks.map((b: any) => `${b.title} [id: ${b.id}] (${b.start_time}-${b.end_time} el ${b.block_date})`).join(", ");

    const todayStr = new Date().toISOString().split("T")[0];
    const systemPrompt = `Eres Adonai, un asistente de productividad experto. Hoy es ${todayStr}.
    Tu trabajo es analizar la entrada del usuario y clasificarla siguiendo estas reglas:
    1. Extraer UNA SOLA tarea clara y accionable.
    2. Crear un título conciso (máx 60 caracteres) sin fechas.
    3. Extraer fecha (YYYY-MM-DD) o marcar como incierta.
    4. Clasificar importancia/urgencia.
    5. Asignar carpeta, contexto o bloque de tiempo si corresponde.
    6. Detectar patrones de recurrencia (frecuencia, intervalo, días).

    CONTEXTO DEL USUARIO:
    - Nombre: ${profile?.name || "Usuario"}
    - Ocupación: ${userContext?.occupation || "No especificada"}
    - Metas Activas: ${goalsList || "Ninguna"}
    - Carpetas: ${foldersList || "Ninguna"}
    - Bloques: ${blocksList || "Ninguno"}

    RESPONDE ÚNICAMENTE EN FORMATO JSON.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt + `\n\nAnaliza y clasifica esto: "${taskTitle}"${dueDate ? ` (fecha sugerida: ${dueDate})` : ""}` }] }
        ],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: {
            type: "object",
            properties: {
              refined_title: { type: "string" },
              description: { type: "string" },
              due_date: { type: "string", nullable: true },
              importance: { type: "boolean" },
              urgency: { type: "boolean" },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              estimated_minutes: { type: "number" },
              context_id: { type: "string", nullable: true },
              goal_id: { type: "string", nullable: true },
              folder_id: { type: "string", nullable: true },
              time_block_id: { type: "string", nullable: true },
              suggest_new_folder_name: { type: "string", nullable: true },
              recurrence: {
                type: "object",
                nullable: true,
                properties: {
                  frequency: { type: "string", enum: ["daily", "weekly", "monthly", "yearly"] },
                  interval: { type: "number" },
                  days_of_week: { type: "array", items: { type: "number" } },
                  day_of_month: { type: "number" }
                }
              },
              is_date_uncertain: { type: "boolean" },
              reasoning: { type: "string" }
            },
            required: ["refined_title", "description", "importance", "urgency", "priority", "estimated_minutes", "reasoning", "is_date_uncertain"]
          }
        }
      })
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      throw new Error("Gemini classification failed");
    }

    const aiResult = await response.json();
    const classification = JSON.parse(aiResult.candidates[0].content.parts[0].text);

    // Validation and Auto-creation logic (Same as before)
    if (classification.context_id && !contexts.find((c: any) => c.id === classification.context_id)) classification.context_id = null;
    if (classification.goal_id && !goals.find((g: any) => g.id === classification.goal_id)) classification.goal_id = null;
    if (classification.folder_id && !folders.find((f: any) => f.id === classification.folder_id)) classification.folder_id = null;

    if (!classification.folder_id && classification.suggest_new_folder_name) {
      const { data: newFolder } = await supabase.from("folders").insert({ user_id: userId, name: classification.suggest_new_folder_name }).select().maybeSingle();
      if (newFolder) classification.folder_id = newFolder.id;
    }

    if (classification.recurrence) {
      const rec = classification.recurrence;
      const { data: rule } = await supabase.from("recurrence_rules").insert({
        user_id: userId,
        frequency: rec.frequency,
        interval: rec.interval || 1,
        days_of_week: rec.days_of_week || [],
        day_of_month: rec.day_of_month || null,
        start_date: dueDate || new Date().toISOString().split("T")[0],
      }).select().maybeSingle();
      if (rule) classification.recurrence_id = rule.id;
    }

    return new Response(JSON.stringify(classification), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-task error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

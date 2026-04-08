import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const [contextRes, profileRes, tasksRes, goalsRes, contextsRes] = await Promise.all([
      supabase.from("user_context").select("*").eq("user_id", userId).single(),
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("tasks").select("id, title, priority, urgency, importance, status, due_date, context_id, estimated_minutes").eq("user_id", userId).eq("status", "pending").limit(20),
      supabase.from("goals").select("id, title, horizon, active").eq("user_id", userId).eq("active", true),
      supabase.from("contexts").select("id, name").eq("user_id", userId),
    ]);

    const userContext = contextRes.data;
    const profile = profileRes.data;
    const existingTasks = tasksRes.data || [];
    const goals = goalsRes.data || [];
    const contexts = contextsRes.data || [];

    const contextList = contexts.map((c: any) => `${c.name} (id: ${c.id})`).join(", ");
    const goalsList = goals.map((g: any) => `${g.title} [id: ${g.id}] (${g.horizon})`).join(", ");

    const systemPrompt = `Eres Adonai, un asistente de productividad experto. Tu trabajo es:
1. Analizar lo que el usuario dice (puede ser una transcripción de voz larga y desordenada) y extraer la TAREA real.
2. Crear un título claro, conciso y accionable para la tarea (máximo 60 caracteres).
3. Si hay detalles adicionales, crear una descripción breve.
4. Clasificar la tarea automáticamente.

IMPORTANTE: El usuario puede dictar algo largo como "oye mira necesito que mañana me acuerde de ir al banco a sacar la tarjeta nueva porque la otra se me venció". Tú debes convertir eso en:
- Título: "Ir al banco por tarjeta nueva"
- Descripción: "La tarjeta anterior está vencida"

METODOLOGÍAS: Eisenhower, Eat the Frog, 80/20, GTD.

CONTEXTO DEL USUARIO:
- Nombre: ${profile?.name || "Usuario"}
- Ocupación: ${userContext?.occupation || "No especificada"}
- Industria: ${userContext?.industry || "No especificada"}
- Horario: ${userContext?.work_hours || "9:00-17:00"}
- Metas: ${userContext?.personal_goals || "No definidas"}
- Estilo: ${userContext?.work_style || "No definido"}
- Energía: ${userContext?.energy_patterns || "No definidos"}
- Compromisos: ${userContext?.recurring_commitments || "No definidos"}
- Prioridades: ${userContext?.priorities_summary || "No definidas"}
- Áreas: ${JSON.stringify(userContext?.life_areas || [])}
- Patrones: ${JSON.stringify(userContext?.ai_learned_patterns || [])}

METAS ACTIVAS: ${goalsList || "Ninguna"}
CONTEXTOS: ${contextList || "Ninguno"}

TAREAS PENDIENTES:
${existingTasks.map((t: any) => `- ${t.title} (${t.priority}, fecha: ${t.due_date})`).join("\n") || "Ninguna"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analiza y clasifica esto: "${taskTitle}"${dueDate ? ` (fecha sugerida: ${dueDate})` : ""}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_task",
              description: "Analiza la entrada del usuario, genera un título limpio y descripción, y clasifica la tarea",
              parameters: {
                type: "object",
                properties: {
                  refined_title: { type: "string", description: "Título claro y conciso de la tarea (máx 60 chars). NO es una transcripción, es un título procesado y mejorado." },
                  description: { type: "string", description: "Descripción breve con detalles adicionales extraídos de lo que dijo el usuario. Vacío si no hay detalles extra." },
                  importance: { type: "boolean" },
                  urgency: { type: "boolean" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  estimated_minutes: { type: "number" },
                  context_id: { type: "string", description: "ID del contexto más apropiado, o null" },
                  goal_id: { type: "string", description: "ID de la meta relacionada, o null" },
                  reasoning: { type: "string", description: "1 oración explicando la clasificación" },
                },
                required: ["refined_title", "description", "importance", "urgency", "priority", "estimated_minutes", "reasoning"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_task" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI classification failed");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const classification = JSON.parse(toolCall.function.arguments);

    if (classification.context_id) {
      const valid = contexts.find((c: any) => c.id === classification.context_id);
      if (!valid) classification.context_id = null;
    }
    if (classification.goal_id) {
      const valid = goals.find((g: any) => g.id === classification.goal_id);
      if (!valid) classification.goal_id = null;
    }

    // Learn pattern
    const patterns = userContext?.ai_learned_patterns || [];
    const newPattern = {
      task: classification.refined_title,
      classification: { priority: classification.priority, urgency: classification.urgency, importance: classification.importance },
      timestamp: new Date().toISOString(),
    };
    const updatedPatterns = [...patterns.slice(-49), newPattern];
    await supabase.from("user_context").update({ ai_learned_patterns: updatedPatterns, updated_at: new Date().toISOString() }).eq("user_id", userId);

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

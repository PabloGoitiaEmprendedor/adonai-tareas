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

    const [contextRes, profileRes, tasksRes, goalsRes, contextsRes, foldersRes, blocksRes] = await Promise.all([
      supabase.from("user_context").select("*").eq("user_id", userId).single(),
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("tasks").select("id, title, priority, urgency, importance, status, due_date, context_id, estimated_minutes, folder_id").eq("user_id", userId).eq("status", "pending").limit(20),
      supabase.from("goals").select("id, title, horizon, active").eq("user_id", userId).eq("active", true),
      supabase.from("contexts").select("id, name").eq("user_id", userId),
      supabase.from("folders").select("id, name").eq("user_id", userId),
      supabase.from("time_blocks").select("id, title, start_time, end_time, color, block_date").eq("user_id", userId).gte("block_date", new Date().toISOString().split("T")[0]).order("start_time"),
    ]);

    const userContext = contextRes.data;
    const profile = profileRes.data;
    const existingTasks = tasksRes.data || [];
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

Tu trabajo es:
1. Analizar lo que el usuario dice (puede ser una transcripción de voz larga y desordenada) y extraer la TAREA real.
2. Crear un título claro, conciso y accionable para la tarea (máximo 60 caracteres). El título NO debe incluir fechas ni información temporal.
3. Si hay detalles adicionales, crear una descripción breve.
4. EXTRAER LA FECHA: Analiza cuidadosamente cuándo el usuario quiere hacer la tarea. "hoy" = ${todayStr}, "mañana" = día siguiente, "el lunes" = próximo lunes, "el 15 de julio" = 2026-07-15, etc. Devuelve la fecha en formato YYYY-MM-DD en el campo due_date.
5. Clasificar la tarea automáticamente.
6. ASIGNAR A UNA CARPETA adecuada (si aplica).
7. ASIGNAR A UN BLOQUE DE TIEMPO (time_block). SIEMPRE analiza si la tarea corresponde a uno de los BLOQUES DE TIEMPO ACTIVOS (ej. es una reunión y hay un bloque de reuniones, es algo profundo y hay un bloque 'Focus'). Asigna el "time_block_id" existente que mejor encaje. Si la tarea es en una hora específica que no tiene bloque, usa suggest_new_time_block para crear uno. Si la tarea es genérica y no tienes bloques que encajen, déjalo null.

EJEMPLO: El usuario dicta "oye mira necesito que mañana me acuerde de ir al banco a sacar la tarjeta nueva porque la otra se me venció". Resultado:
- refined_title: "Ir al banco por tarjeta nueva"
- description: "La tarjeta anterior está vencida"
- due_date: (fecha de mañana en YYYY-MM-DD)

PATRONES DE RECURRENCIA a detectar:
- "todos los días" → frequency: daily, interval: 1
- "cada lunes y miércoles" → frequency: weekly, interval: 1, days_of_week: [1, 3]
- "cada 2 semanas" → frequency: weekly, interval: 2
- "cada mes" → frequency: monthly, interval: 1
- "el 15 de cada mes" → frequency: monthly, interval: 1, day_of_month: 15
- "cada año" → frequency: yearly, interval: 1
- "de lunes a viernes" → frequency: weekly, interval: 1, days_of_week: [1, 2, 3, 4, 5]

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
CARPETAS: ${foldersList || "Ninguna"}
BLOQUES DE TIEMPO ACTIVOS: ${blocksList || "Ninguno programado"}

TAREAS PENDIENTES:
${existingTasks.map((t: any) => `- ${t.title} (${t.priority}, fecha: ${t.due_date}, carpeta: ${t.folder_id || 'sin carpeta'})`).join("\n") || "Ninguna"}`;

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
              description: "Analiza la entrada del usuario, genera un título limpio y descripción, clasifica la tarea, asigna carpeta y detecta recurrencia",
              parameters: {
                type: "object",
                properties: {
                  refined_title: { type: "string", description: "Título claro y conciso de la tarea (máx 60 chars). NO incluir fechas, recurrencia ni contexto temporal." },
                  description: { type: "string", description: "Descripción breve con detalles adicionales. Vacío si no hay detalles extra." },
                  due_date: { type: "string", description: "Fecha en formato YYYY-MM-DD. Analiza lo que dice el usuario: 'hoy', 'mañana', 'el lunes', 'el 15 de julio', etc. Si no menciona fecha, devuelve null." },
                  importance: { type: "boolean" },
                  urgency: { type: "boolean" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  estimated_minutes: { type: "number" },
                  context_id: { type: "string", description: "ID del contexto más apropiado, o null" },
                  goal_id: { type: "string", description: "ID de la meta relacionada, o null" },
                  folder_id: { type: "string", description: "ID de la carpeta existente más apropiada, o null si ninguna aplica" },
                  time_block_id: { type: "string", description: "ID del bloque de tiempo existente, o null" },
                  suggest_new_time_block: { 
                    type: "object", 
                    description: "Si el usuario quiere agendar en una hora que NO existe como bloque todavía, genera los detalles para crear el bloque. IMPORTANTE: Usa HH:MM en 24h.",
                    properties: {
                      title: { type: "string", description: "Nombre del bloque, ej. 'Bloque Foco', 'Reuniones'" },
                      start_time: { type: "string", description: "HH:MM, ej. '14:00'" },
                      end_time: { type: "string", description: "HH:MM, ej. '16:00'" },
                      color: { type: "string", description: "Color hex, ej. '#4caf50'" }
                    },
                    required: ["title", "start_time", "end_time"]
                  },
                  suggest_new_folder_name: { type: "string", description: "Si no hay carpeta adecuada, sugiere un nombre para crear una nueva. Vacío si ya hay carpeta." },
                  recurrence: {
                    type: "object",
                    description: "Regla de recurrencia si el usuario menciona un patrón recurrente. Null si no es recurrente.",
                    properties: {
                      frequency: { type: "string", enum: ["daily", "weekly", "monthly", "yearly"] },
                      interval: { type: "number", description: "Cada cuántas unidades (1 = cada, 2 = cada 2, etc.)" },
                      days_of_week: { type: "array", items: { type: "number" }, description: "Usa JS getDay(): 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado" },
                      day_of_month: { type: "number", description: "Día del mes (1-31)" },
                    },
                    required: ["frequency", "interval"],
                  },
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

    // Validate context_id
    if (classification.context_id) {
      const valid = contexts.find((c: any) => c.id === classification.context_id);
      if (!valid) classification.context_id = null;
    }
    // Validate goal_id
    if (classification.goal_id) {
      const valid = goals.find((g: any) => g.id === classification.goal_id);
      if (!valid) classification.goal_id = null;
    }
    // Validate folder_id
    if (classification.folder_id) {
      const valid = folders.find((f: any) => f.id === classification.folder_id);
      if (!valid) classification.folder_id = null;
    }

    // Auto-create suggested folder if no existing folder matched
    if (!classification.folder_id && classification.suggest_new_folder_name) {
      const { data: newFolder } = await supabase
        .from("folders")
        .insert({ user_id: userId, name: classification.suggest_new_folder_name })
        .select()
        .single();
      if (newFolder) {
        classification.folder_id = newFolder.id;
        classification.created_new_folder = classification.suggest_new_folder_name;
      }
    }

    // Auto-create suggested time block if no returning ID
    if (!classification.time_block_id && classification.suggest_new_time_block) {
        const { data: newBlock } = await supabase
          .from("time_blocks")
          .insert({ 
            user_id: userId, 
            title: classification.suggest_new_time_block.title,
            start_time: classification.suggest_new_time_block.start_time,
            end_time: classification.suggest_new_time_block.end_time,
            color: classification.suggest_new_time_block.color || '#4caf50',
            block_date: classification.due_date || todayStr
          })
          .select()
          .single();
        if (newBlock) {
          classification.time_block_id = newBlock.id;
        }
    }

    // Create recurrence rule if detected
    if (classification.recurrence) {
      const rec = classification.recurrence;
      const { data: rule } = await supabase
        .from("recurrence_rules")
        .insert({
          user_id: userId,
          frequency: rec.frequency,
          interval: rec.interval || 1,
          days_of_week: rec.days_of_week || [],
          day_of_month: rec.day_of_month || null,
          start_date: dueDate || new Date().toISOString().split("T")[0],
        })
        .select()
        .single();
      if (rule) {
        classification.recurrence_id = rule.id;
      }
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

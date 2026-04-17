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

IMPORTANTE: Si la entrada del usuario parece contener varias tareas separadas, PRIORIZA y genera UNA SOLA tarea (la más importante o la primera). Solo puedes devolver un objeto de tarea. No intentes meter una lista de tareas en un solo título.

Tu trabajo es:
1. Analizar lo que el usuario dice (puede ser una transcripción de voz larga y desordenada) y extraer la TAREA real.
2. Crear un título claro, conciso y accionable para la tarea (máximo 60 caracteres). El título NO debe incluir fechas ni información temporal.
3. Si hay detalles adicionales, crear una descripción breve.
4. EXTRAER LA FECHA: Analiza cuidadosamente cuándo el usuario quiere hacer la tarea. "hoy" = ${todayStr}, "mañana" = día siguiente, "el lunes" = próximo lunes, "el 15 de julio" = 2026-07-15, etc. Devuelve la fecha en formato YYYY-MM-DD en el campo due_date.
5. Clasificar la tarea automáticamente.
6. ASIGNAR A UNA CARPETA adecuada (si aplica).
7. ASIGNAR A UN BLOQUE DE TIEMPO (time_block). SIEMPRE analiza si la tarea corresponde a uno de los BLOQUES DE TIEMPO ACTIVOS (ej. es una reunión y hay un bloque de reuniones, es algo profundo y hay un bloque 'Focus'). Asigna el "time_block_id" existente que mejor encaje. Si la tarea es en una hora específica que no tiene bloque, usa suggest_new_time_block para crear uno. SI LA TAREA ES RECURRENTE (ej. cada lunes), el bloque que sugieras TAMBIÉN debe ser recurrente (is_recurring: true) con los mismos días de la semana. Si la tarea es genérica y no tienes bloques que encajen, déjalo null.
8. VALIDACIÓN DE FECHA: Si el usuario NO especifica cuándo hacer la tarea (ni hoy, ni mañana, ni recurrente, ni nada), pon 'is_date_uncertain' en true y deja 'due_date' en null. No adivines si no hay pistas claras.

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
TU REGLA DE ORO PARA LA CLASIFICACIÓN (SÉ ESTRICTO):
1. CARPETAS: Mira la lista de CARPETAS arriba. Si el usuario dice "ponlo en la carpeta X" o si el tema encaja perfectamente, USALA. Si no encaja en ninguna pero es un tema recurrente nuevo, sugiere crear una en 'suggest_new_folder_name'.
2. PRIORIDAD (Urgencia e Importancia): 
   - IMPORTANTE = Afecta a largo plazo, a sus metas, o a su carrera/negocio.
   - URGENTE = Tiene un deadline inmediato (hoy/mañana) o consecuencias graves si no se hace pronto.
   - Analiza el tono del usuario: "¡Urgente!", "Nece3. RECURRENCIA (VITAL): Si el usuario dice "cada X", "todos los", "X veces por semana", "diariamente", "los lunes", "el 1 de cada mes", etc., ESTÁS OBLIGADO a llenar el objeto 'recurrence'. No lo ignores. 
   - Ejemplo: "Ir al gym cada lunes y miércoles" -> frequency: weekly, interval: 1, days_of_week: [1, 3]
   - Ejemplo: "Pagar internet cada 30 de mes" -> frequency: monthly, interval: 1, day_of_month: 30
   - Ejemplo: "Sacar la basura todos los días" -> frequency: daily, interval: 1
4. CONTEXTO: Usa lo que sabes de su ocupación (${userContext?.occupation}) e industria para decidir si algo es importante.
5. TÍTULO MINIMALISTA: Crea títulos de máximo 5 palabras. Si el usuario da muchos detalles, ponlos en 'description', NUNCA en el título. El título debe ser una acción simple (ej: 'Revisar reporte' en lugar de 'Revisar el reporte de ventas del mes pasado para la junta de mañana').

TAREAS PENDIENTES (PARA REFERENCIA DE ESTILO):
${existingTasks.map((t: any) => `- ${t.title} (Prioridad: ${t.priority}, Urgencia: ${t.urgency}, Importancia: ${t.importance}, Carpeta: ${t.folder_id || 'sin carpeta'})`).join("\n") || "Ninguna"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analiza y clasifica esto: "${taskTitle}"${dueDate ? ` (fecha sugerida: ${dueDate})` : ""}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_task",
              description: "Analiza la entrada del usuario, genera un título limpio y descripción, clasifica la tarea, asigna carpeta y detecta CUALQUIER patrón de repetición/recurrencia mencionado.",
              parameters: {
                type: "object",
                properties: {
                  refined_title: { type: "string", description: "Título ultra-conciso y accionable (máximo 4-5 palabras). NUNCA incluyas fechas, recurrencia ni detalles explicativos aquí." },
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
                      color: { type: "string", description: "Color hex, ej. '#4caf50'" },
                      is_recurring: { type: "boolean", description: "Si el bloque debe repetirse periódicamente" },
                      days_of_week: { type: "array", items: { type: "number" }, description: "Días de la semana si es recurrente. 0=Dom, 1=Lun, ..., 6=Sab." }
                    },
                    required: ["title", "start_time", "end_time"]
                  },
                  suggest_new_folder_name: { type: "string", description: "Si no hay carpeta adecuada, sugiere un nombre para crear una nueva. Vacío si ya hay carpeta." },
                  recurrence: {
                    type: "object",
                    description: "SIEMPRE que el usuario mencione repetición (cada día, semanal, cada X tiempo), llena este objeto. Null solo si es una tarea única.",
                    properties: {
                      frequency: { type: "string", enum: ["daily", "weekly", "monthly", "yearly"], description: "Frecuencia de la repetición." },
                      interval: { type: "number", description: "Cada cuántas unidades (1 = cada semana/día, 2 = cada 2 semanas/días, etc.)" },
                      days_of_week: { type: "array", items: { type: "number" }, description: "Días de la semana si es weekly. 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab." },
                      day_of_month: { type: "number", description: "Día del mes (1-31) si es monthly." },
                    },
                    required: ["frequency", "interval"],
                  },
                  is_date_uncertain: { type: "boolean", description: "True si el usuario no mencionó ninguna fecha ni patrón de recurrencia claro." },
                  reasoning: { type: "string", description: "1 oración explicando la clasificación" },
                },
                required: ["refined_title", "description", "importance", "urgency", "priority", "estimated_minutes", "reasoning", "is_date_uncertain"],
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
        const isRecBlock = !!classification.suggest_new_time_block.is_recurring;
        const { data: newBlock } = await supabase
          .from("time_blocks")
          .insert({ 
            user_id: userId, 
            title: classification.suggest_new_time_block.title,
            start_time: classification.suggest_new_time_block.start_time,
            end_time: classification.suggest_new_time_block.end_time,
            color: classification.suggest_new_time_block.color || '#4caf50',
            block_date: isRecBlock ? null : (classification.due_date || todayStr),
            is_recurring: isRecBlock,
            days_of_week: classification.suggest_new_time_block.days_of_week || []
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

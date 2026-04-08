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

    // Get user from token
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

    // Fetch user context, profile, existing tasks, goals, contexts
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
    const goalsList = goals.map((g: any) => `${g.title} (${g.horizon})`).join(", ");

    const systemPrompt = `Eres Adonai, un asistente de productividad experto. Conoces al usuario y clasificas sus tareas automáticamente.

METODOLOGÍAS QUE APLICAS:
- Matriz de Eisenhower (urgente/importante)
- "Eat the Frog" de Brian Tracy (tareas difíciles primero)
- Regla del 80/20 de Pareto
- Time-blocking
- Getting Things Done (GTD) de David Allen

CONTEXTO DEL USUARIO:
- Nombre: ${profile?.name || "Usuario"}
- Ocupación: ${userContext?.occupation || "No especificada"}
- Industria: ${userContext?.industry || "No especificada"}
- Horario de trabajo: ${userContext?.work_hours || "9:00-17:00"}
- Metas personales: ${userContext?.personal_goals || "No definidas"}
- Estilo de trabajo: ${userContext?.work_style || "No definido"}
- Patrones de energía: ${userContext?.energy_patterns || "No definidos"}
- Compromisos recurrentes: ${userContext?.recurring_commitments || "No definidos"}
- Prioridades: ${userContext?.priorities_summary || "No definidas"}
- Áreas de vida: ${JSON.stringify(userContext?.life_areas || [])}
- Patrones aprendidos: ${JSON.stringify(userContext?.ai_learned_patterns || [])}

METAS ACTIVAS: ${goalsList || "Ninguna"}
CONTEXTOS DISPONIBLES: ${contextList || "Ninguno"}

TAREAS PENDIENTES ACTUALES (para entender la carga):
${existingTasks.map((t: any) => `- ${t.title} (prioridad: ${t.priority}, urgente: ${t.urgency}, importante: ${t.importance}, fecha: ${t.due_date})`).join("\n") || "Ninguna"}

INSTRUCCIONES:
Analiza la tarea que el usuario quiere crear y devuelve la clasificación usando la función classify_task.
- Determina si es urgente e importante basándote en el contexto del usuario, sus metas, y la fecha.
- Estima el tiempo en minutos de forma realista.
- Sugiere el contexto más apropiado de los disponibles.
- Asigna la prioridad: high (urgente+importante o importante), medium (urgente o sin datos), low (ni urgente ni importante).
- Si la tarea está relacionada con una meta activa, vincúlala.
- Considera la carga actual del usuario al clasificar.`;

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
          { role: "user", content: `Clasifica esta tarea: "${taskTitle}"${dueDate ? ` (fecha: ${dueDate})` : ""}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_task",
              description: "Clasifica una tarea con prioridad, urgencia, importancia, tiempo estimado y contexto",
              parameters: {
                type: "object",
                properties: {
                  importance: { type: "boolean", description: "¿Es importante para las metas del usuario?" },
                  urgency: { type: "boolean", description: "¿Es urgente?" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  estimated_minutes: { type: "number", description: "Tiempo estimado en minutos" },
                  context_id: { type: "string", description: "ID del contexto más apropiado, o null" },
                  goal_id: { type: "string", description: "ID de la meta relacionada, o null" },
                  reasoning: { type: "string", description: "Breve explicación de por qué se clasificó así (1 oración en español)" },
                },
                required: ["importance", "urgency", "priority", "estimated_minutes", "reasoning"],
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
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intenta en unos segundos" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI classification failed");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const classification = JSON.parse(toolCall.function.arguments);

    // Validate context_id and goal_id exist
    if (classification.context_id) {
      const validCtx = contexts.find((c: any) => c.id === classification.context_id);
      if (!validCtx) classification.context_id = null;
    }
    if (classification.goal_id) {
      const validGoal = goals.find((g: any) => g.id === classification.goal_id);
      if (!validGoal) classification.goal_id = null;
    }

    // Learn from this interaction - update ai_learned_patterns
    const patterns = userContext?.ai_learned_patterns || [];
    const newPattern = {
      task: taskTitle,
      classification: { priority: classification.priority, urgency: classification.urgency, importance: classification.importance },
      timestamp: new Date().toISOString(),
    };
    // Keep last 50 patterns
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

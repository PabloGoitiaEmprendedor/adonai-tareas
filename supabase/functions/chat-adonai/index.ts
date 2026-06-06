import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GROQ_API_BASE = "https://api.groq.com/openai/v1";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Tool Definitions ─────────────────────────────────────────────

const ADONAI_CORE_BEHAVIOR = `
## Identidad
Eres Adonai AI, el asistente inteligente de la plataforma Adonai. No eres un chatbot generico: eres el cerebro operativo personal del usuario. Actuas como copiloto de productividad, adaptado a su forma de trabajar, escribir tareas, priorizar y tomar decisiones.

## Proposito
Ayudas al usuario a ejecutar mas con menos friccion. Cuando puedas tomar accion dentro de Adonai, actua en vez de explicar pasos. Confirma brevemente lo que hiciste.

## Forma de responder
- Responde siempre en el idioma del usuario.
- Habla como un coach-amigo inteligente: cercano, natural, con criterio, sin sonar corporativo ni robotico.
- Se directo, calido y preciso. Puedes usar frases humanas cortas como "te entiendo", "vamos con esto" o "perfecto" cuando encaje.
- Para saludos o mensajes simples, responde con naturalidad y abre la conversacion con una pregunta util.
- Respuestas conversacionales: normalmente 2-5 lineas, salvo que el usuario pida analisis, planificacion o detalle.
- Usa listas cortas solo cuando realmente ayuden.
- Personaliza con el contexto disponible sin decir "accedi a tus datos".
- Si el usuario esta frustrado, reconoce brevemente el estado y vuelve a una accion concreta.

## Memoria
Aprende preferencias, habitos, objetivos, estilo de comunicacion, patrones de postergacion, energia y metodos de productividad. A medida que conoces mas al usuario, adapta tono, nivel de empuje, sugerencias y prioridades.
Cuando detectes algo relevante y estable, usa save_memory en silencio. Nunca respondas al usuario con "memoria guardada" ni menciones memorias internas salvo que el usuario pregunte.
No inventes datos: si no sabes algo, consultalo con herramientas o dilo claramente.

## Acciones
Puedes gestionar tareas, eventos, cuadernos, metas, contextos y mensajes de amigos/grupos usando herramientas. Nunca elimines ni hagas acciones irreversibles sin confirmacion explicita.

## Enfoque
No des consejos genericos si tienes contexto. Prioriza ejecucion, claridad, siguiente paso y bajo ruido. Si el usuario pide organizar la semana, consultar pendientes o planificar, usa herramientas antes de responder.
`;

const ADONAI_CONVERSATIONAL_COACH_BEHAVIOR = `
## Experiencia conversacional esperada
La experiencia debe sentirse al nivel de un chat moderno tipo ChatGPT o Gemini, pero con identidad Adonai: un coach personal que conoce la vida operativa del usuario.

Principios:
- Conversa primero, opera despues. Si el usuario solo quiere hablar, conversa. Si pide una accion, ejecuta.
- Responde con presencia: entiende la intencion emocional y practica, no solo las palabras.
- Mantente cercano sin exagerar confianza. No uses frases motivacionales vacias.
- Haz una pregunta de seguimiento solo cuando desbloquee una mejor ayuda. No cierres cada respuesta con preguntas genericas.
- Si el usuario esta confundido, reduce friccion: propone el siguiente paso mas pequeno.
- Si el usuario pide ideas o plan, actua como coach: prioriza, ordena, detecta bloqueo y sugiere una accion concreta.
- Si hay memoria o contexto del usuario, usalo de forma natural, como si ya lo conocieras. No expliques que tienes memoria.
- Si hay poco contexto, aprende con preguntas ligeras y utiles.
- Evita respuestas frias como "Listo: ...". Convierte acciones y datos en lenguaje humano.
`;

const truncateForPrompt = (value: string | null | undefined, max = 1400) => {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, max)}\n[recortado]` : text;
};

const formatMemoryProfileForPrompt = (profile: Record<string, unknown>): string => {
  const lines: string[] = [];

  for (const [category, value] of Object.entries(profile)) {
    if (Array.isArray(value) && value.length > 0) {
      const facts = value
        .filter(item => typeof item === "string" && item.trim())
        .slice(0, 8)
        .map(item => `  - ${truncateForPrompt(String(item), 180)}`)
        .join("\n");
      if (facts) lines.push(`- ${category}:\n${facts}`);
    } else if (typeof value === "string" && value.trim()) {
      lines.push(`- ${category}: ${truncateForPrompt(value, 220)}`);
    }
  }

  return lines.join("\n");
};

const getLearningStage = (memoryCount: number, profile: Record<string, unknown>) => {
  const profileItems = Object.values(profile).reduce((total, value) => {
    if (Array.isArray(value)) return total + value.length;
    return total + (value ? 1 : 0);
  }, 0);
  const total = memoryCount + profileItems;

  if (total >= 18) return "alto contexto: ya conoces bastantes preferencias y patrones; personaliza con decision.";
  if (total >= 6) return "en crecimiento: ya hay senales utiles; adapta tono y sugerencias sin asumir de mas.";
  return "inicial: conoce al usuario con preguntas ligeras cuando haga falta.";
};

interface Tool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<{ success: boolean; message: string; data?: unknown }>;
}

interface ToolContext {
  supabase: ReturnType<typeof createClient>;
  userId: string;
}

const TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Guarda una memoria privada del usuario solo cuando diga una preferencia, habito, objetivo, estilo de comunicacion o patron relevante. No guardar saludos, preguntas simples ni mensajes casuales.",
      parameters: {
        type: "object",
        properties: {
          fact: { type: "string", description: "Hecho concreto que se debe recordar" },
          category: {
            type: "string",
            enum: ["preferencia", "habito", "agenda", "objetivo", "comunicacion", "metodologia", "general"],
            description: "Categoria de la memoria",
          },
          confidence: { type: "number", description: "Confianza entre 0 y 1" },
        },
        required: ["fact"],
      },
    },
    handler: async (args, { supabase, userId }) => {
      const fact = String(args.fact || "").trim();
      if (fact.length < 4) return { success: false, message: "Memoria demasiado corta" };
      if (/^(hola|buenas|hey|hello|saludo|el usuario saluda)/i.test(fact)) {
        return { success: true, message: "No habia una memoria relevante que guardar" };
      }
      const category = String(args.category || "general");
      const confidence = typeof args.confidence === "number" ? Math.max(0, Math.min(1, args.confidence)) : 0.75;

      const { data: existing } = await supabase.from("chat_memories")
        .select("id")
        .eq("user_id", userId)
        .eq("fact", fact)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from("chat_memories").insert({
          user_id: userId,
          fact,
          category,
          confidence,
          source: "agent_tool",
        });
        if (error) return { success: false, message: `Error al guardar memoria: ${error.message}` };
      }

      const { data: memoryProfile } = await supabase.from("chat_user_memory_profiles")
        .select("profile")
        .eq("user_id", userId)
        .maybeSingle();

      const currentProfile = (memoryProfile?.profile || {}) as Record<string, unknown>;
      const bucket = Array.isArray(currentProfile[category]) ? currentProfile[category] as string[] : [];
      const nextBucket = [fact, ...bucket.filter(item => item !== fact)].slice(0, 30);
      const nextProfile = { ...currentProfile, [category]: nextBucket };

      await supabase.from("chat_user_memory_profiles").upsert({
        user_id: userId,
        profile: nextProfile,
        updated_at: new Date().toISOString(),
      });

      return { success: true, message: "Memoria guardada", data: { fact, category, confidence } };
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Crea una nueva tarea para el usuario",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título de la tarea" },
          description: { type: "string", description: "Descripción detallada de la tarea" },
          due_date: { type: "string", description: "Fecha de vencimiento (YYYY-MM-DD)" },
          estimated_minutes: { type: "number", description: "Minutos estimados" },
          importance: { type: "boolean", description: "Es importante" },
          urgency: { type: "boolean", description: "Es urgente" },
          folder_id: { type: "string", description: "ID de la carpeta/cuaderno" },
          goal_id: { type: "string", description: "ID de la meta asociada" },
          context_id: { type: "string", description: "ID del contexto" },
        },
        required: ["title"],
      },
    },
    handler: async (args, { supabase, userId }) => {
      const { data, error } = await supabase.from("tasks").insert({
        user_id: userId,
        title: args.title as string,
        description: args.description as string || null,
        due_date: args.due_date as string || null,
        estimated_minutes: args.estimated_minutes as number || null,
        importance: args.importance as boolean || null,
        urgency: args.urgency as boolean || null,
        folder_id: args.folder_id as string || null,
        goal_id: args.goal_id as string || null,
        context_id: args.context_id as string || null,
        status: "pending",
      }).select().single();

      if (error) return { success: false, message: `Error al crear tarea: ${error.message}` };
      return { success: true, message: `Tarea "${data.title}" creada`, data };
    },
  },
  {
    type: "function",
    function: {
      name: "get_tasks",
      description: "Obtiene las tareas del usuario. Filtra por estado, fecha o carpeta.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "done"], description: "Filtrar por estado" },
          due_date: { type: "string", description: "Fecha específica (YYYY-MM-DD)" },
          folder_id: { type: "string", description: "ID de carpeta" },
          limit: { type: "number", description: "Máximo de resultados" },
        },
      },
    },
    handler: async (args, { supabase, userId }) => {
      let query = supabase
        .from("tasks")
        .select("id,title,description,status,due_date,importance,urgency,estimated_minutes,folder_id,goal_id")
        .eq("user_id", userId);
      if (args.status) query = query.eq("status", args.status);
      if (args.due_date) query = query.eq("due_date", args.due_date);
      if (args.folder_id) query = query.eq("folder_id", args.folder_id);
      if (args.limit) query = query.limit(args.limit as number);
      else query = query.limit(20);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) return { success: false, message: `Error: ${error.message}` };
      const safeData = (data || []).filter(Boolean);
      const pending = safeData.filter(t => t.status === "pending").length;
      const done = safeData.filter(t => t.status === "done").length;
      const compactTasks = safeData.slice(0, 20).map((task, index) => ({
        n: index + 1,
        id: task.id,
        title: task.title,
        status: task.status,
        due_date: task.due_date,
        importance: task.importance,
        urgency: task.urgency,
      }));
      const list = compactTasks.map((task) => {
        const priority = task.importance && task.urgency
          ? "Importante/Urgente"
          : task.urgency
            ? "Urgente/No importante"
            : task.importance
              ? "Importante/No urgente"
              : "No urgente/No importante";
        return `${task.n}. ${task.title}${task.due_date ? ` (${task.due_date})` : ""} - ${priority}`;
      }).join("\n");
      return {
        success: true,
        message: `Encontradas ${safeData.length} tareas (${pending} pendientes, ${done} completadas)${list ? `\n\n${list}` : ""}`,
        data: compactTasks,
      };
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Marca una tarea como completada",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "ID de la tarea" },
        },
        required: ["task_id"],
      },
    },
    handler: async (args, { supabase, userId }) => {
      const { data, error } = await supabase.from("tasks").update({
        status: "done",
        completed_at: new Date().toISOString(),
      }).eq("id", args.task_id as string).eq("user_id", userId).select().single();

      if (error) return { success: false, message: `Error: ${error.message}` };
      return { success: true, message: `Tarea "${data.title}" completada`, data };
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Actualiza campos de una tarea existente",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "ID de la tarea" },
          title: { type: "string" },
          description: { type: "string" },
          due_date: { type: "string" },
          estimated_minutes: { type: "number" },
          importance: { type: "boolean" },
          urgency: { type: "boolean" },
          status: { type: "string", enum: ["pending", "done"] },
          folder_id: { type: "string" },
          goal_id: { type: "string" },
        },
        required: ["task_id"],
      },
    },
    handler: async (args, { supabase, userId }) => {
      const updates: Record<string, unknown> = {};
      const fields = ["title", "description", "due_date", "estimated_minutes", "importance", "urgency", "status", "folder_id", "goal_id"];
      for (const f of fields) {
        if (args[f] !== undefined) updates[f] = args[f];
      }
      const { data, error } = await supabase.from("tasks").update(updates).eq("id", args.task_id as string).eq("user_id", userId).select().single();
      if (error) return { success: false, message: `Error: ${error.message}` };
      return { success: true, message: `Tarea "${data.title}" actualizada`, data };
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Elimina (soft-delete) una tarea moviéndola a la papelera",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "ID de la tarea" },
        },
        required: ["task_id"],
      },
    },
    handler: async (args, { supabase, userId }) => {
      const { data, error } = await supabase.from("tasks").update({ status: "deleted" }).eq("id", args.task_id as string).eq("user_id", userId).select().single();
      if (error) return { success: false, message: `Error: ${error.message}` };
      return { success: true, message: `Tarea "${data.title}" eliminada`, data };
    },
  },
  {
    type: "function",
    function: {
      name: "get_folders",
      description: "Obtiene los cuadernos/carpetas del usuario",
      parameters: { type: "object", properties: {} },
    },
    handler: async (_args, { supabase, userId }) => {
      const { data, error } = await supabase.from("folders").select("*").eq("user_id", userId);
      if (error) return { success: false, message: `Error: ${error.message}` };
      return { success: true, message: `${data.length} cuadernos encontrados`, data };
    },
  },
  {
    type: "function",
    function: {
      name: "get_goals",
      description: "Obtiene las metas activas del usuario",
      parameters: { type: "object", properties: {} },
    },
    handler: async (_args, { supabase, userId }) => {
      const { data, error } = await supabase.from("goals").select("*").eq("user_id", userId).eq("active", true);
      if (error) return { success: false, message: `Error: ${error.message}` };
      return { success: true, message: `${data.length} metas activas`, data };
    },
  },
  {
    type: "function",
    function: {
      name: "create_event",
      description: "Crea un bloque de tiempo/evento en el calendario",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título del evento" },
          block_date: { type: "string", description: "Fecha (YYYY-MM-DD)" },
          start_time: { type: "string", description: "Hora de inicio (HH:mm)" },
          end_time: { type: "string", description: "Hora de fin (HH:mm)" },
          color: { type: "string", description: "Color hex (ej: #5B7CFA)" },
        },
        required: ["title", "block_date", "start_time", "end_time"],
      },
    },
    handler: async (args, { supabase, userId }) => {
      const { data, error } = await supabase.from("time_blocks").insert({
        user_id: userId,
        title: args.title as string,
        block_date: args.block_date as string,
        start_time: args.start_time as string,
        end_time: args.end_time as string,
        color: args.color as string || "#5B7CFA",
      }).select().single();

      if (error) return { success: false, message: `Error al crear evento: ${error.message}` };
      return { success: true, message: `Evento "${data.title}" creado`, data };
    },
  },
  {
    type: "function",
    function: {
      name: "get_time_blocks",
      description: "Obtiene los bloques de tiempo/eventos del usuario",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Fecha específica (YYYY-MM-DD)" },
          start_date: { type: "string", description: "Inicio de rango (YYYY-MM-DD)" },
          end_date: { type: "string", description: "Fin de rango (YYYY-MM-DD)" },
          limit: { type: "number" },
        },
      },
    },
    handler: async (args, { supabase, userId }) => {
      let query = supabase.from("time_blocks").select("*").eq("user_id", userId);
      if (args.date) query = query.eq("block_date", args.date);
      if (args.start_date) query = query.gte("block_date", args.start_date);
      if (args.end_date) query = query.lte("block_date", args.end_date);
      query = query.order("block_date").order("start_time").limit(args.limit as number || 30);

      const { data, error } = await query;
      if (error) return { success: false, message: `Error: ${error.message}` };
      return { success: true, message: `${data.length} eventos encontrados`, data };
    },
  },
  {
    type: "function",
    function: {
      name: "get_contexts",
      description: "Obtiene los contextos del usuario (lugares, estados mentales)",
      parameters: { type: "object", properties: {} },
    },
    handler: async (_args, { supabase, userId }) => {
      const { data, error } = await supabase.from("contexts").select("*").eq("user_id", userId);
      if (error) return { success: false, message: `Error: ${error.message}` };
      return { success: true, message: `${data.length} contextos`, data };
    },
  },
  {
    type: "function",
    function: {
      name: "get_friend_conversations",
      description: "Lista los chats y grupos de amigos del usuario para poder enviar mensajes.",
      parameters: { type: "object", properties: {} },
    },
    handler: async (_args, { supabase, userId }) => {
      const { data: memberships, error } = await supabase
        .from("friend_conversation_members")
        .select("conversation_id, role, unread_count, created_at")
        .eq("user_id", userId);
      if (error) return { success: false, message: `Error al listar chats: ${error.message}` };

      const ids = (memberships || []).map((item: any) => item.conversation_id);
      if (ids.length === 0) return { success: true, message: "No hay chats todavia", data: [] };

      const { data: conversations, error: convError } = await supabase
        .from("friend_conversations")
        .select("id, type, title, updated_at, created_at")
        .in("id", ids)
        .order("updated_at", { ascending: false });
      if (convError) return { success: false, message: `Error al listar chats: ${convError.message}` };

      const data = (conversations || []).map((conversation: any) => ({
        ...conversation,
        me: memberships?.find((item: any) => item.conversation_id === conversation.id),
      }));

      return { success: true, message: "Chats de amigos obtenidos", data };
    },
  },
  {
    type: "function",
    function: {
      name: "send_friend_message",
      description: "Envia un mensaje de texto a un chat o grupo de amigos existente.",
      parameters: {
        type: "object",
        properties: {
          conversation_id: { type: "string", description: "ID del chat o grupo" },
          body: { type: "string", description: "Mensaje que se enviara" },
        },
        required: ["conversation_id", "body"],
      },
    },
    handler: async (args, { supabase, userId }) => {
      const conversationId = String(args.conversation_id || "").trim();
      const body = String(args.body || "").trim();
      if (!conversationId || !body) return { success: false, message: "conversation_id y body son requeridos" };

      const { data: member, error: memberError } = await supabase
        .from("friend_conversation_members")
        .select("conversation_id")
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)
        .maybeSingle();
      if (memberError || !member) return { success: false, message: "No tienes acceso a ese chat" };

      const { data, error } = await supabase.from("friend_messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        kind: "text",
        body,
        payload: {},
      }).select().single();
      if (error) return { success: false, message: `Error al enviar mensaje: ${error.message}` };

      await supabase.from("friend_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
      const { data: otherMembers } = await supabase
        .from("friend_conversation_members")
        .select("user_id, unread_count")
        .eq("conversation_id", conversationId)
        .neq("user_id", userId);
      for (const member of otherMembers || []) {
        await supabase
          .from("friend_conversation_members")
          .update({ unread_count: Number(member.unread_count || 0) + 1 })
          .eq("conversation_id", conversationId)
          .eq("user_id", member.user_id);
      }

      return { success: true, message: "Mensaje enviado", data };
    },
  },
];

// ─── System Prompt Builder ────────────────────────────────────────

async function buildSystemPrompt(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const dayName = dayNames[now.getDay()];

  const [profileRes, contextRes, tasksRes, goalsRes, foldersRes, blocksRes, memoriesRes, memoryProfileRes, globalPromptRes, globalInsightsRes, methodologiesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_context").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("tasks").select("id, title, status, due_date, importance, urgency, priority, folder_id, goal_id, estimated_minutes").eq("user_id", userId).eq("status", "pending").limit(8),
    supabase.from("goals").select("id, title, horizon, description").eq("user_id", userId).eq("active", true).limit(6),
    supabase.from("folders").select("id, name").eq("user_id", userId).limit(12),
    supabase.from("time_blocks").select("id, title, block_date, start_time, end_time, color").eq("user_id", userId).gte("block_date", today).order("block_date").limit(8),
    supabase.from("chat_memories").select("fact, category").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
    supabase.from("chat_user_memory_profiles").select("profile").eq("user_id", userId).maybeSingle(),
    supabase.from("chat_global_prompts").select("prompt").eq("is_active", true).maybeSingle(),
    supabase.from("chat_global_insights").select("title, insight, category, weight").eq("is_active", true).order("weight", { ascending: false }).limit(5),
    supabase.from("chat_prompt_methodologies").select("name, content").eq("is_active", true).order("created_at", { ascending: false }).limit(3),
  ]);

  const profile = profileRes.data;
  const userCtx = contextRes.data;
  const pendingTasks = (tasksRes.data || []).filter(Boolean);
  const goals = goalsRes.data || [];
  const folders = foldersRes.data || [];
  const blocks = blocksRes.data || [];
  const memories = memoriesRes.data || [];
  const memoryProfile = (memoryProfileRes.data?.profile || {}) as Record<string, unknown>;
  const globalPrompt = globalPromptRes.data?.prompt;
  const globalInsights = globalInsightsRes.data || [];
  const methodologies = methodologiesRes.data || [];

  const blocksToday = blocks.filter(b => b.block_date === today);

  const sections: string[] = [];

  sections.push(ADONAI_CORE_BEHAVIOR);
  sections.push(ADONAI_CONVERSATIONAL_COACH_BEHAVIOR);

  if (globalPrompt) {
    sections.push(`\n## Prompt global activo del admin\nEstas instrucciones vienen del panel de admin de Adonai y forman parte del comportamiento base del agente. Integralas con tu identidad de coach conversacional:\n${truncateForPrompt(globalPrompt, 2400)}`);
  }
  sections.push(`Hoy es ${dayName} ${today}.`);
  sections.push(`Usuario: ${profile?.name || "Usuario"}`);
  sections.push(`Ocupación: ${userCtx?.occupation || "No especificada"}`);
  sections.push(`Estilo de trabajo: ${userCtx?.work_style || "No especificado"}`);
  sections.push(`Nivel de estrés: ${userCtx?.stress_level || "No especificado"}`);

  sections.push(`Estado de aprendizaje del usuario: ${getLearningStage(memories.length, memoryProfile)}`);

  if (goals.length > 0) {
    sections.push(`\n## Metas activas\n${goals.map(g => `- ${g.title} [${g.horizon}]${g.description ? `: ${truncateForPrompt(g.description, 180)}` : ""} (id: ${g.id})`).join("\n")}`);
  }

  if (folders.length > 0) {
    sections.push(`\n## Cuadernos\n${folders.map(f => `- ${f.name} (id: ${f.id})`).join("\n")}`);
  }

  if (pendingTasks.length > 0) {
    sections.push(`\n## Tareas pendientes hoy\n${pendingTasks.map(t => {
      const labels = [];
      if (t.importance) labels.push("importante");
      if (t.urgency) labels.push("urgente");
      const label = labels.length ? ` [${labels.join(", ")}]` : "";
      return `- ${t?.title || "Tarea sin titulo"}${t?.due_date === today ? " (HOY)" : t?.due_date ? ` (${t.due_date})` : ""}${label} (id: ${t?.id || "sin-id"})`;
    }).join("\n")}`);
  }

  if (blocksToday.length > 0) {
    sections.push(`\n## Bloques de tiempo hoy\n${blocksToday.map(b => `- ${b.start_time}–${b.end_time}: ${b.title}`).join("\n")}`);
  }

  if (memories.length > 0) {
    sections.push(`\n## Lo que sé del usuario\n${memories.map(m => `- [${m.category}] ${m.fact}`).join("\n")}`);
  }

  if (Object.keys(memoryProfile).length > 0) {
    const formattedProfile = formatMemoryProfileForPrompt(memoryProfile);
    if (formattedProfile) {
      sections.push(`\n## Perfil aprendido del usuario\nUsa esto para adaptar tono, prioridades, sugerencias y nivel de detalle. No menciones que viene de memoria privada.\n${formattedProfile}`);
    }
  }

  if (globalInsights.length > 0) {
    sections.push(`\n## Insights globales anonimizados\n${globalInsights.map(i => `- [${i.category}] ${i.title}: ${truncateForPrompt(i.insight, 180)}`).join("\n")}`);
  }

  if (methodologies.length > 0) {
    sections.push(`\n## Metodologias activas del desarrollador\n${methodologies.map(m => `### ${m.name}\n${truncateForPrompt(m.content, 500)}`).join("\n\n")}`);
  }

  sections.push(`
## Capacidades
Puedes ejecutar acciones directamente:
- Crear, listar, completar, actualizar y eliminar tareas
- Crear y consultar eventos/bloques de tiempo
- Listar cuadernos, metas y contextos del usuario
- Enviar mensajes a amigos o grupos cuando tengas el ID del chat
- Extraer y recordar preferencias y patrones del usuario con save_memory

## Reglas
1. Siempre confirma antes de ejecutar acciones destructivas (eliminar).
2. Sé conversacional y natural en español, pero también preciso y directo.
3. Cuando el usuario mencione preferencias, hábitos o patrones, extráelos y guárdalos con la herramienta save_memory.
4. Referencia las tareas por su título, no solo por ID.
5. Si preguntas por "mi semana" o "mis pendientes", consulta las tareas automáticamente.
6. Ofrece sugerencias proactivas basadas en el contexto del usuario.
7. Usa lenguaje motivacional cuando completes tareas importantes.
8. Nunca respondas al usuario con resultados internos como "Memoria guardada".
9. Si una herramienta se ejecuta, traduce el resultado a una respuesta humana, breve y clara.
10. Cuando el usuario solo conversa, no fuerces acciones ni listas; responde como una conversacion natural.`);

  return sections.join("\n");
}

// ─── Memory Extraction ────────────────────────────────────────────

async function extractAndStoreMemories(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  message: string,
  response: string,
): Promise<void> {
  // Use a simple regex/pattern approach to extract facts
  const facts: Array<{ fact: string; category: string }> = [];

  // Pattern: user mentions preferences or habits
  const prefPatterns = [
    /(?:prefiero|me gusta|me encanta|disfruto|odio|no me gusta)\s+(.+?)(?:\.|,|$)/gi,
    /(?:suelo|normalmente|generalmente|casi siempre|casi nunca)\s+(.+?)(?:\.|,|$)/gi,
    /mi (?:horario|rutina|trabajo|casa|oficina|tiempo)\s+(?:es|de|ideal|preferido)\s+(.+?)(?:\.|,|$)/gi,
  ];

  for (const pattern of prefPatterns) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].trim().length > 5) {
        facts.push({ fact: match[1].trim(), category: "preferencia" });
      }
    }
  }

  // Pattern: time-related preferences
  const timePattern = /(?:a las|desde las|hasta las|de\s+\d+\s+a\s+\d+)/gi;
  if (timePattern.test(message)) {
    facts.push({ fact: `Mencionó horario: "${message.slice(0, 80)}"`, category: "horario" });
  }

  const goalPatterns = [
    /(?:quiero|necesito|estoy intentando|mi objetivo es|mi meta es)\s+(.+?)(?:\.|,|$)/gi,
  ];
  for (const pattern of goalPatterns) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].trim().length > 8) {
        facts.push({ fact: match[1].trim(), category: "objetivo" });
      }
    }
  }

  const communicationPatterns = [
    /(?:hablame|respondeme|resp[oó]ndeme|prefiero que me hables|me gusta que me respondas)\s+(.+?)(?:\.|,|$)/gi,
  ];
  for (const pattern of communicationPatterns) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].trim().length > 5) {
        facts.push({ fact: match[1].trim(), category: "comunicacion" });
      }
    }
  }

  for (const f of facts) {
    const { data: existing } = await supabase.from("chat_memories")
      .select("id")
      .eq("user_id", userId)
      .eq("fact", f.fact)
      .maybeSingle();

    if (!existing) {
      await supabase.from("chat_memories").insert({
        user_id: userId,
        fact: f.fact,
        category: f.category,
        source: "chat",
        confidence: 0.6,
      });
    }
  }

  if (facts.length > 0) {
    const { data: memoryProfile } = await supabase.from("chat_user_memory_profiles")
      .select("profile")
      .eq("user_id", userId)
      .maybeSingle();

    const currentProfile = (memoryProfile?.profile || {}) as Record<string, unknown>;
    const nextProfile: Record<string, unknown> = { ...currentProfile };

    for (const f of facts) {
      const bucket = Array.isArray(nextProfile[f.category]) ? nextProfile[f.category] as string[] : [];
      nextProfile[f.category] = [f.fact, ...bucket.filter(item => item !== f.fact)].slice(0, 30);
    }

    await supabase.from("chat_user_memory_profiles").upsert({
      user_id: userId,
      profile: nextProfile,
      updated_at: new Date().toISOString(),
    });
  }
}

// ─── Groq API Call with Streaming ─────────────────────────────────

function summarizeToolResults(toolResults: Array<{ name: string; result: { success: boolean; message: string; data?: unknown } }>): string {
  return toolResults
    .map((item) => `${item.result.success ? "Listo" : "No pude hacerlo"}: ${item.result.message}`)
    .join("\n\n");
}

type GroqApiError = Error & { status?: number; details?: string };

function isGroqRateLimitError(error: unknown): error is GroqApiError {
  return error instanceof Error && (error as GroqApiError).status === 429;
}

function buildRateLimitReply(message: string): string {
  const trimmed = message.trim().toLowerCase();
  if (/^(hola|buenas|hey|hello|ola)\b/.test(trimmed)) {
    return "Hola. Ahora mismo estoy con mucha carga, pero ya te leo. ¿Qué necesitas hacer?";
  }

  return "Ahora mismo estoy temporalmente limitado por el modelo y no quiero darte una respuesta a medias. Vuelve a intentarlo en unos minutos y seguimos.";
}

function buildMemoryOnlyReply(message: string): string {
  const trimmed = message.trim().toLowerCase();
  if (/^(hola|buenas|hey|hello|ola)\b/.test(trimmed)) {
    return "Hola. ¿En qué te ayudo hoy?";
  }

  return "Listo. ¿Qué necesitas hacer ahora?";
}

function buildRateLimitReplySafe(message: string): string {
  const trimmed = message.trim().toLowerCase();
  if (/^(hola|buenas|hey|hello|ola)\b/.test(trimmed)) {
    return "Hola. Ahora mismo estoy con mucha carga, pero ya te leo. Que necesitas hacer?";
  }

  return "Ahora mismo estoy temporalmente limitado por el modelo y no quiero darte una respuesta a medias. Vuelve a intentarlo en unos minutos y seguimos.";
}

function buildMemoryOnlyReplySafe(message: string): string {
  const trimmed = message.trim().toLowerCase();
  if (/^(hola|buenas|hey|hello|ola)\b/.test(trimmed)) {
    return "Hola. En que te ayudo hoy?";
  }

  return "Listo. Que necesitas hacer ahora?";
}

type ChatMessage = { role: string; content: string };

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(String(text || "").length / 4));
}

function estimateMessageTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, msg) => total + estimateTokens(msg.content) + 4, 0);
}

function buildUsagePayload(inputTokens: number, outputTokens: number) {
  const safeInput = Math.max(0, Math.round(inputTokens));
  const safeOutput = Math.max(0, Math.round(outputTokens));
  return {
    inputTokens: safeInput,
    outputTokens: safeOutput,
    totalTokens: safeInput + safeOutput,
    estimated: true,
  };
}

type ToolCall = { id: string; type: string; function: { name: string; arguments: string } };
type ToolCallDelta = {
  index?: number;
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
};

async function buildDirectTaskReply(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  message: string,
): Promise<string | null> {
  const normalized = message.toLowerCase();
  const asksTasks = /\b(tareas?|pendientes?|cosas por hacer|que tengo|qu[eé] tengo)\b/i.test(normalized);
  if (!asksTasks) return null;

  const asksToday = /\b(hoy|dia|d[ií]a)\b/i.test(normalized);
  const asksPending = /\b(pendientes?|por hacer|sin completar)\b/i.test(normalized) || asksToday;
  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("tasks")
    .select("title,status,due_date,importance,urgency")
    .eq("user_id", userId)
    .limit(12);

  if (asksPending) query = query.eq("status", "pending");
  if (asksToday) query = query.eq("due_date", today);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("direct task query error:", error.message);
    return "Ahora mismo no pude revisar tus tareas. Intentalo de nuevo en un momento.";
  }

  const tasks = data || [];
  if (tasks.length === 0) {
    return asksToday
      ? "No tienes tareas pendientes para hoy."
      : "No encontre tareas pendientes ahora mismo.";
  }

  const intro = asksToday
    ? `Tienes ${tasks.length} tarea${tasks.length === 1 ? "" : "s"} pendiente${tasks.length === 1 ? "" : "s"} para hoy:`
    : `Tienes ${tasks.length} tarea${tasks.length === 1 ? "" : "s"} pendiente${tasks.length === 1 ? "" : "s"}:`;

  const list = tasks.map((task, index) => {
    const flags = [];
    if (task.importance) flags.push("importante");
    if (task.urgency) flags.push("urgente");
    const suffix = flags.length ? ` (${flags.join(", ")})` : "";
    const due = !asksToday && task.due_date ? ` - ${task.due_date}` : "";
    return `${index + 1}. ${task.title}${due}${suffix}`;
  }).join("\n");

  return `${intro}\n${list}`;
}

async function saveDirectChatTurn(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sessionId: string | undefined,
  userMessage: string,
  assistantMessage: string,
) {
  if (!sessionId) return;

  const { data: existingSession } = await supabase.from("chat_sessions")
    .select("messages, title")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  const now = new Date().toISOString();
  if (existingSession) {
    const messages = [
      ...(existingSession.messages as Array<unknown> || []),
      { role: "user", content: userMessage, timestamp: now },
      { role: "assistant", content: assistantMessage, timestamp: now },
    ];
    const title = existingSession.title || userMessage.slice(0, 60);
    await supabase.from("chat_sessions").update({
      messages,
      title,
      updated_at: now,
    }).eq("id", sessionId);
  } else {
    await supabase.from("chat_sessions").insert({
      id: sessionId,
      user_id: userId,
      title: userMessage.slice(0, 60),
      messages: [
        { role: "user", content: userMessage, timestamp: now },
        { role: "assistant", content: assistantMessage, timestamp: now },
      ],
    });
  }
}

async function* streamChatCompletion(
  groqKey: string,
  model: string,
  messages: ChatMessage[],
  tools: Tool[],
  signal?: AbortSignal,
): AsyncGenerator<string | { tool_calls: ToolCallDelta[] }> {
  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 500,
  };

  if (tools.length > 0) {
    body.tools = tools.map(t => ({ type: t.type, function: t.function }));
    body.tool_choice = "auto";
  }

  const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Groq API error ${response.status}`) as GroqApiError;
    error.status = response.status;
    error.details = text;
    throw error;
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const jsonStr = trimmed.slice(6).trim();
      if (jsonStr === "[DONE]") return;

      try {
        const chunk = JSON.parse(jsonStr);
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          yield delta.content;
        }

        if (delta.tool_calls) {
          yield { tool_calls: delta.tool_calls };
        }
      } catch {
        // parse error, skip
      }
    }
  }
}

// ─── Main Handler ─────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");
    const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || DEFAULT_GROQ_MODEL;

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

    const { message, sessionId, sessionHistory } = await req.json();
    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const directTaskReply = await buildDirectTaskReply(supabase, userId, message);
    if (directTaskReply) {
      await saveDirectChatTurn(supabase, userId, sessionId, message, directTaskReply);
      const encoder = new TextEncoder();
      const usage = buildUsagePayload(estimateTokens(message), estimateTokens(directTaskReply));

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", text: directTaskReply })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "usage", usage })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", content: directTaskReply })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete" })}\n\n`));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const systemPrompt = await buildSystemPrompt(supabase, userId);

    const groqMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add session history (last 20 messages for context)
    if (sessionHistory && Array.isArray(sessionHistory)) {
      const recent = sessionHistory
        .filter((msg: any) => msg?.role === "user" || msg?.role === "assistant")
        .map((msg: any) => ({
          role: msg.role,
          content: truncateForPrompt(String(msg.content || "").replace(/Groq API error.*$/gis, "[error anterior omitido]"), 900),
        }))
        .slice(-10);
      for (const msg of recent) {
        if (msg.role === "user" || msg.role === "assistant") {
          groqMessages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    groqMessages.push({ role: "user", content: message });

    // Save session to DB
    if (sessionId) {
      const { data: existingSession } = await supabase.from("chat_sessions")
        .select("messages")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingSession) {
        const updatedMessages = [...(existingSession.messages as Array<unknown> || []), { role: "user", content: message, timestamp: new Date().toISOString() }];
        await supabase.from("chat_sessions").update({
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        }).eq("id", sessionId);
      } else {
        await supabase.from("chat_sessions").insert({
          id: sessionId,
          user_id: userId,
          messages: [{ role: "user", content: message, timestamp: new Date().toISOString() }],
        });
      }
    }

    // Stream + Tool loop
    const collectedContent: string[] = [];
    let finalContent = "";
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let estimatedInputTokens = estimateMessageTokens(groqMessages);
          let estimatedOutputTokens = 0;
          const generator = streamChatCompletion(GROQ_API_KEY, GROQ_MODEL, groqMessages, TOOLS);

          let accumulatedToolCalls: ToolCall[] = [];

          for await (const chunk of generator) {
            if (typeof chunk === "string") {
              collectedContent.push(chunk);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", text: chunk })}\n\n`));
            } else if (chunk.tool_calls) {
              for (const tc of chunk.tool_calls) {
                const index = typeof tc.index === "number" ? tc.index : accumulatedToolCalls.length;
                const existing = accumulatedToolCalls[index] || (tc.id ? accumulatedToolCalls.find(t => t.id === tc.id) : undefined);
                if (existing) {
                  existing.id = tc.id || existing.id;
                  existing.type = tc.type || existing.type;
                  existing.function.name += tc.function?.name || "";
                  existing.function.arguments += tc.function?.arguments || "";
                } else {
                  accumulatedToolCalls[index] = {
                    id: tc.id || `tool-call-${index}`,
                    type: tc.type || "function",
                    function: {
                      name: tc.function?.name || "",
                      arguments: tc.function?.arguments || "",
                    },
                  };
                }
              }
            }
          }

          finalContent = collectedContent.join("");
          estimatedOutputTokens += estimateTokens(finalContent);
          accumulatedToolCalls = accumulatedToolCalls.filter(tc => tc?.function?.name);

          // Process tool calls if any
          if (accumulatedToolCalls.length > 0) {
            const toolCtx: ToolContext = { supabase, userId };
            const toolResults: Array<{ name: string; result: { success: boolean; message: string; data?: unknown } }> = [];

            for (const tc of accumulatedToolCalls) {
              const tool = TOOLS.find(t => t.function.name === tc.function.name);
              if (tool) {
                let args: Record<string, unknown> = {};
                try {
                  const parsedArgs = JSON.parse(tc.function.arguments || "{}");
                  args = parsedArgs && typeof parsedArgs === "object" && !Array.isArray(parsedArgs) ? parsedArgs : {};
                } catch {
                  args = {};
                }
                const result = await tool.handler(args, toolCtx);
                toolResults.push({ name: tc.function.name, result });

                if (tc.function.name !== "save_memory") {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_result", tool: tc.function.name, result })}\n\n`));
                }
              }
            }

            if (toolResults.length > 0) {
              const toolSummary = summarizeToolResults(toolResults.filter(tr => tr.name !== "save_memory"));
              finalContent = toolSummary
                ? (finalContent ? `${finalContent}\n\n${toolSummary}` : toolSummary)
                : finalContent;
            }

            const nonMemoryToolResults = toolResults.filter(tr => tr.name !== "save_memory");

            // If there were non-memory tool calls, get a follow-up response from Groq
            if (nonMemoryToolResults.length > 0) {
              groqMessages.push({ role: "assistant", content: finalContent || "" });
              groqMessages.push({
                role: "user",
                content: `Resultados internos de acciones ya ejecutadas:\n${nonMemoryToolResults.map(tr => `- ${tr.name}: ${JSON.stringify(tr.result)}`).join("\n")}`,
              });

              finalContent = "";
              // Simple follow-up without tool calls
              try {
                const followUpMessages = [
                  ...groqMessages,
                  { role: "user", content: "Responde al usuario como Adonai: coach-amigo cercano, natural y util. Integra los resultados sin decir 'herramienta', sin JSON y sin mencionar save_memory ni memorias internas. Si hubo una accion, confirma en lenguaje humano y ofrece el siguiente paso mas util." },
                ];
                estimatedInputTokens += estimateMessageTokens(followUpMessages);
                const followUpGen = streamChatCompletion(GROQ_API_KEY, GROQ_MODEL, followUpMessages, [], new AbortController().signal);

                for await (const chunk of followUpGen) {
                  if (typeof chunk === "string") {
                    finalContent += chunk;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", text: chunk })}\n\n`));
                  }
                }
                estimatedOutputTokens += estimateTokens(finalContent);
              } catch (err) {
                console.error("chat-adonai follow-up error:", err instanceof Error ? err.message : err);
                const visibleSummary = summarizeToolResults(nonMemoryToolResults);
                finalContent = visibleSummary || "Hola. Ya estoy listo para ayudarte con tus tareas, agenda y prioridades.";
                estimatedOutputTokens += estimateTokens(finalContent);
              }
            } else if (!finalContent.trim()) {
              finalContent = buildMemoryOnlyReplySafe(message);
              estimatedOutputTokens += estimateTokens(finalContent);
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "usage", usage: buildUsagePayload(estimatedInputTokens, estimatedOutputTokens) })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", content: finalContent })}\n\n`));

          // Extract and store memories
          await extractAndStoreMemories(supabase, userId, message, finalContent);

          // Save assistant response to session
          if (sessionId) {
            const { data: sess } = await supabase.from("chat_sessions")
              .select("messages, title")
              .eq("id", sessionId)
              .eq("user_id", userId)
              .maybeSingle();

            if (sess) {
              const msgs = sess.messages as Array<unknown> || [];
              // Only add if last message isn't already this response
              const lastMsg = msgs[msgs.length - 1] as Record<string, unknown> | undefined;
              if (lastMsg?.role !== "assistant") {
                msgs.push({ role: "assistant", content: finalContent, timestamp: new Date().toISOString() });
              }
              let title = sess.title;
              if (title === "Nueva conversación" && msgs.length >= 2) {
                const firstUserMsg = (msgs as Array<Record<string, unknown>>).find(m => m.role === "user");
                title = typeof firstUserMsg?.content === "string" ? firstUserMsg.content.slice(0, 60) : title;
              }
              await supabase.from("chat_sessions").update({
                messages: msgs,
                title,
                updated_at: new Date().toISOString(),
              }).eq("id", sessionId);
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete" })}\n\n`));
        } catch (err) {
          if (isGroqRateLimitError(err)) {
            const fallback = buildRateLimitReplySafe(message);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "usage", usage: buildUsagePayload(estimateMessageTokens(groqMessages), estimateTokens(fallback)) })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", text: fallback })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", content: fallback })}\n\n`));
            console.warn("chat-adonai rate limited by Groq; served fallback reply");
            return;
          }

          const errMsg = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: errMsg })}\n\n`));
          console.error("chat-adonai stream error:", errMsg);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error("chat-adonai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

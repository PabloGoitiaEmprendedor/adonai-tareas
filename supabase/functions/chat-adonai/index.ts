import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GROQ_API_BASE = "https://api.groq.com/openai/v1";

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
- Se directo, calido y preciso.
- Respuestas conversacionales: maximo 3-4 lineas salvo que el usuario pida analisis o planificacion.
- Usa listas cortas cuando haya varias cosas.
- Personaliza con el contexto disponible sin decir "accedi a tus datos".
- Si el usuario esta frustrado, reconoce brevemente el estado y vuelve a una accion concreta.

## Memoria
Aprende preferencias, habitos, objetivos, estilo de comunicacion, patrones de postergacion y metodos de productividad. Cuando detectes algo relevante, usa save_memory. No inventes datos: si no sabes algo, consultalo con herramientas o dilo claramente.

## Acciones
Puedes gestionar tareas, eventos, cuadernos, metas, contextos y mensajes de amigos/grupos usando herramientas. Nunca elimines ni hagas acciones irreversibles sin confirmacion explicita.

## Enfoque
No des consejos genericos si tienes contexto. Prioriza ejecucion, claridad, siguiente paso y bajo ruido. Si el usuario pide organizar la semana, consultar pendientes o planificar, usa herramientas antes de responder.
`;

const truncateForPrompt = (value: string | null | undefined, max = 1400) => {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, max)}\n[recortado]` : text;
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
  sections.push(`Hoy es ${dayName} ${today}.`);
  sections.push(`Usuario: ${profile?.name || "Usuario"}`);
  sections.push(`Ocupación: ${userCtx?.occupation || "No especificada"}`);
  sections.push(`Estilo de trabajo: ${userCtx?.work_style || "No especificado"}`);
  sections.push(`Nivel de estrés: ${userCtx?.stress_level || "No especificado"}`);

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
    sections.push(`\n## Perfil estructurado de memoria privada\n${truncateForPrompt(JSON.stringify(memoryProfile), 900)}`);
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
7. Usa lenguaje motivacional cuando completes tareas importantes.`);

  if (globalPrompt) {
    sections.push(`\n## Instrucciones adicionales del desarrollador\n${truncateForPrompt(globalPrompt, 1200)}`);
  }

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

async function* streamChatCompletion(
  groqKey: string,
  messages: Array<{ role: string; content: string }>,
  tools: Tool[],
  signal?: AbortSignal,
): AsyncGenerator<string | { tool_calls: Array<{ id: string; type: string; function: { name: string; arguments: string } }> }> {
  const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      tools: tools.map(t => ({ type: t.type, function: t.function })),
      tool_choice: "auto",
      stream: true,
      temperature: 0.7,
      max_tokens: 900,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq API error ${response.status}: ${text}`);
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

    const systemPrompt = await buildSystemPrompt(supabase, userId);

    const groqMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add session history (last 20 messages for context)
    if (sessionHistory && Array.isArray(sessionHistory)) {
      const recent = sessionHistory
        .filter((msg: any) => msg?.role === "user" || msg?.role === "assistant")
        .map((msg: any) => ({
          role: msg.role,
          content: truncateForPrompt(String(msg.content || "").replace(/Groq API error.*$/gis, "[error anterior omitido]"), 500),
        }))
        .slice(-8);
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
          const generator = streamChatCompletion(GROQ_API_KEY, groqMessages, TOOLS);

          let accumulatedToolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }> = [];

          for await (const chunk of generator) {
            if (typeof chunk === "string") {
              collectedContent.push(chunk);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", text: chunk })}\n\n`));
            } else if (chunk.tool_calls) {
              for (const tc of chunk.tool_calls) {
                const existing = accumulatedToolCalls.find(t => t.id === tc.id);
                if (existing) {
                  existing.function.arguments += tc.function?.arguments || "";
                } else {
                  accumulatedToolCalls.push(tc);
                }
              }
            }
          }

          finalContent = collectedContent.join("");

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

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_result", tool: tc.function.name, result })}\n\n`));
              }
            }

            if (toolResults.length > 0) {
              const toolSummary = summarizeToolResults(toolResults);
              finalContent = finalContent ? `${finalContent}\n\n${toolSummary}` : toolSummary;
            }

            // If there were tool calls, get a follow-up response from Groq
            if (false && toolResults.length > 0) {
              groqMessages.push({ role: "assistant", content: finalContent || "" });
              groqMessages.push({
                role: "user",
                content: `Resultados de herramientas ejecutadas:\n${toolResults.map(tr => `- ${tr.name}: ${JSON.stringify(tr.result)}`).join("\n")}`,
              });

              // Simple follow-up without tool calls
              try {
                const followUpGen = streamChatCompletion(GROQ_API_KEY, [
                  ...groqMessages,
                  { role: "user", content: "Resume lo que acabo de hacer y confirma si hay algo más que necesite." },
                ], [], new AbortController().signal);

                for await (const chunk of followUpGen) {
                  if (typeof chunk === "string") {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "followup", text: chunk })}\n\n`));
                  }
                }
              } catch {
                // Follow-up is optional
              }
            }
          }

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

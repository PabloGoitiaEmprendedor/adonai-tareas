import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, getRequiredEnv, getUserFromRequest, jsonResponse } from "../_shared/notion.ts";

const FOLDER_COLORS = ["#5B7CFA", "#6FCF97", "#F4B860", "#EB5757", "#7C97FF", "#9CA3AF"];

const normalizeId = (value?: string | null) => String(value || "").replace(/-/g, "").toLowerCase();
const normalizeTitle = (value?: string | null) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const mappingKey = (mapping: any) =>
  `${normalizeId(mapping.notion_database_id || mapping.database_id || mapping.notion_data_source_id || mapping.data_source_id)}:${normalizeTitle(mapping.notion_title || mapping.database_title || mapping.title)}`;

const taskCompletenessScore = (task: any) =>
  Number(Boolean(task?.title)) +
  Number(Boolean(task?.due_date)) +
  Number(typeof task?.urgency === "boolean") +
  Number(typeof task?.importance === "boolean");

const dedupeTaskInputs = (tasks: any[]) => {
  const byPage = new Map<string, any>();

  for (const task of tasks) {
    if (!task?.notion_page_id) continue;
    const current = byPage.get(task.notion_page_id);
    if (!current || taskCompletenessScore(task) >= taskCompletenessScore(current)) {
      byPage.set(task.notion_page_id, task);
    }
  }

  return Array.from(byPage.values());
};

const cleanupDuplicateMappings = async (supabase: any, userId: string, preferredMappingIds = new Set<string>()) => {
  const { data: mappings, error } = await supabase
    .from("notion_database_mappings")
    .select("id, notion_database_id, notion_data_source_id, notion_title, folder_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const groups = new Map<string, any[]>();
  for (const mapping of mappings || []) {
    const key = mappingKey(mapping);
    groups.set(key, [...(groups.get(key) || []), mapping]);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const keeper = [...group].sort((a, b) => {
      const preferredA = preferredMappingIds.has(a.id) ? 0 : 1;
      const preferredB = preferredMappingIds.has(b.id) ? 0 : 1;
      if (preferredA !== preferredB) return preferredA - preferredB;
      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    })[0];

    for (const duplicate of group) {
      if (duplicate.id === keeper.id) continue;

      await supabase
        .from("notion_page_tasks")
        .update({ mapping_id: keeper.id, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("mapping_id", duplicate.id);

      if (duplicate.folder_id && duplicate.folder_id !== keeper.folder_id) {
        await supabase
          .from("tasks")
          .update({ folder_id: keeper.folder_id })
          .eq("user_id", userId)
          .eq("folder_id", duplicate.folder_id);
      }

      await supabase
        .from("notion_database_mappings")
        .delete()
        .eq("user_id", userId)
        .eq("id", duplicate.id);

      if (duplicate.folder_id && duplicate.folder_id !== keeper.folder_id) {
        await supabase
          .from("folders")
          .delete()
          .eq("user_id", userId)
          .eq("id", duplicate.folder_id);
      }
    }
  }
};

const findExistingMapping = async (supabase: any, userId: string, taskInput: any, folderName: string) => {
  const { data: sourceMapping, error: sourceError } = await supabase
    .from("notion_database_mappings")
    .select("*")
    .eq("user_id", userId)
    .eq("notion_data_source_id", taskInput.data_source_id)
    .maybeSingle();
  if (sourceError) throw sourceError;
  if (sourceMapping) return sourceMapping;

  const { data: databaseMappings, error: databaseError } = await supabase
    .from("notion_database_mappings")
    .select("*")
    .eq("user_id", userId)
    .eq("notion_database_id", taskInput.database_id);
  if (databaseError) throw databaseError;

  const matchingMapping = (databaseMappings || []).find((mapping: any) =>
    normalizeTitle(mapping.notion_title) === normalizeTitle(folderName)
  );
  if (!matchingMapping) return null;

  await supabase
    .from("notion_database_mappings")
    .update({
      notion_data_source_id: taskInput.data_source_id,
      notion_title: folderName,
      sync_direction: "two_way",
      enabled: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchingMapping.id);

  return { ...matchingMapping, notion_data_source_id: taskInput.data_source_id, notion_title: folderName };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(getRequiredEnv("SUPABASE_URL"), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const user = await getUserFromRequest(req, supabase);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const tasks = dedupeTaskInputs(Array.isArray(body.tasks) ? body.tasks : []);
    if (tasks.length === 0) return jsonResponse({ error: "No tasks to import" }, 400);

    await cleanupDuplicateMappings(supabase, user.id);

    let foldersCreated = 0;
    let tasksCreated = 0;
    let tasksUpdated = 0;
    const mappingBySource = new Map<string, any>();
    const touchedMappingIds = new Set<string>();

    for (const taskInput of tasks) {
      if (!taskInput.title || !taskInput.due_date || typeof taskInput.urgency !== "boolean" || typeof taskInput.importance !== "boolean") {
        return jsonResponse({ error: "Every imported task needs title, due_date, urgency and importance" }, 400);
      }

      let mapping = mappingBySource.get(taskInput.data_source_id);
      if (!mapping) {
        const folderName = taskInput.database_title || "Notion";
        mapping = await findExistingMapping(supabase, user.id, taskInput, folderName);

        if (!mapping) {
          const { data: folder, error: folderError } = await supabase
            .from("folders")
            .insert({
              user_id: user.id,
              name: folderName,
              color: FOLDER_COLORS[Math.abs(folderName.length) % FOLDER_COLORS.length],
              icon: "notion",
            })
            .select()
            .single();

          if (folderError) throw folderError;
          foldersCreated += 1;

          const { data: newMapping, error: mappingError } = await supabase
            .from("notion_database_mappings")
            .insert({
              user_id: user.id,
              notion_database_id: taskInput.database_id,
              notion_data_source_id: taskInput.data_source_id,
              notion_title: folderName,
              sync_direction: "two_way",
              folder_id: folder.id,
            })
            .select()
            .single();

          if (mappingError) throw mappingError;
          mapping = newMapping;
        }

        mappingBySource.set(taskInput.data_source_id, mapping);
      }
      touchedMappingIds.add(mapping.id);

      const { data: existingLink } = await supabase
        .from("notion_page_tasks")
        .select("task_id")
        .eq("user_id", user.id)
        .eq("notion_page_id", taskInput.notion_page_id)
        .maybeSingle();

      const taskData = {
        title: taskInput.title,
        description: taskInput.description || null,
        status: taskInput.status || "pending",
        priority: taskInput.urgency && taskInput.importance ? "high" : taskInput.urgency || taskInput.importance ? "medium" : "low",
        urgency: taskInput.urgency,
        importance: taskInput.importance,
        due_date: taskInput.due_date,
        link: taskInput.link || null,
        folder_id: mapping.folder_id,
        source_type: "text",
        completed_at: taskInput.status === "done" ? new Date().toISOString() : null,
      };

      if (existingLink) {
        const { error: updateError } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", existingLink.task_id)
          .eq("user_id", user.id);
        if (updateError) throw updateError;

        await supabase
          .from("notion_page_tasks")
          .update({
            notion_last_edited_time: taskInput.notion_last_edited_time || null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("notion_page_id", taskInput.notion_page_id);
        tasksUpdated += 1;
        continue;
      }

      const { data: createdTask, error: taskError } = await supabase
        .from("tasks")
        .insert({ ...taskData, user_id: user.id })
        .select()
        .single();

      if (taskError) throw taskError;

      const { error: linkError } = await supabase.from("notion_page_tasks").insert({
        user_id: user.id,
        mapping_id: mapping.id,
        notion_page_id: taskInput.notion_page_id,
        notion_last_edited_time: taskInput.notion_last_edited_time || null,
        task_id: createdTask.id,
      });
      if (linkError) throw linkError;
      tasksCreated += 1;
    }

    for (const mapping of mappingBySource.values()) {
      await supabase
        .from("notion_database_mappings")
        .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", mapping.id);
    }

    await cleanupDuplicateMappings(supabase, user.id, touchedMappingIds);

    return jsonResponse({ ok: true, folders_created: foldersCreated, tasks_created: tasksCreated, tasks_updated: tasksUpdated });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});

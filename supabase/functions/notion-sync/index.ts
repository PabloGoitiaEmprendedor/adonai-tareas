import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  corsHeaders,
  getRequiredEnv,
  getUserFromRequest,
  jsonResponse,
  notionHeaders,
  pageDueDate,
  pageStatus,
  pageTitle,
  richTextToPlain,
} from "../_shared/notion.ts";

const FOLDER_COLORS = ["#5B7CFA", "#6FCF97", "#F4B860", "#EB5757", "#7C97FF", "#9CA3AF"];

const notionPost = async (path: string, accessToken: string, body: unknown) => {
  const response = await fetch(`https://api.notion.com${path}`, {
    method: "POST",
    headers: notionHeaders(accessToken),
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `Notion request failed: ${path}`);
  return payload;
};

const findAccessibleDatabases = async (accessToken: string) => {
  const databases: any[] = [];
  let startCursor: string | undefined;

  do {
    const payload = await notionPost("/v1/search", accessToken, {
      filter: { property: "object", value: "database" },
      page_size: 100,
      start_cursor: startCursor,
    });

    databases.push(...(payload.results || []));
    startCursor = payload.has_more ? payload.next_cursor : undefined;
  } while (startCursor);

  return databases;
};

const getDatabaseTitle = (database: any) => richTextToPlain(database?.title || []) || "Base de Notion";

const getDataSources = (database: any) => {
  const sources = database?.data_sources || database?.dataSources || [];
  if (Array.isArray(sources) && sources.length > 0) {
    return sources.map((source: any) => ({
      id: source.id,
      title: richTextToPlain(source.title || []) || getDatabaseTitle(database),
    }));
  }

  return [{ id: database.id, title: getDatabaseTitle(database) }];
};

const queryPages = async (accessToken: string, dataSourceId: string) => {
  try {
    return await notionPost(`/v1/data_sources/${dataSourceId}/query`, accessToken, { page_size: 100 });
  } catch {
    return await notionPost(`/v1/databases/${dataSourceId}/query`, accessToken, { page_size: 100 });
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(getRequiredEnv("SUPABASE_URL"), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const user = await getUserFromRequest(req, supabase);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: connection, error: connectionError } = await supabase
      .from("notion_connections")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connectionError) throw connectionError;
    if (!connection) return jsonResponse({ error: "Notion is not connected" }, 400);
    const body = await req.json().catch(() => ({}));
    const selectedDataSourceIds = Array.isArray(body.data_source_ids)
      ? new Set(body.data_source_ids.map((id: unknown) => String(id)))
      : null;

    const databases = await findAccessibleDatabases(connection.access_token);
    let foldersCreated = 0;
    let tasksCreated = 0;
    let tasksUpdated = 0;
    let mappingsTouched = 0;

    for (const database of databases) {
      const databaseTitle = getDatabaseTitle(database);
      const dataSources = getDataSources(database);

      for (const dataSource of dataSources) {
        if (selectedDataSourceIds && !selectedDataSourceIds.has(dataSource.id)) continue;

        const title = dataSource.title || databaseTitle;
        const { data: existingMapping } = await supabase
          .from("notion_database_mappings")
          .select("*, folders(id)")
          .eq("user_id", user.id)
          .eq("notion_data_source_id", dataSource.id)
          .maybeSingle();

        let mapping = existingMapping;

        if (!mapping) {
          const { data: folder, error: folderError } = await supabase
            .from("folders")
            .insert({
              user_id: user.id,
              name: title,
              color: FOLDER_COLORS[Math.abs(title.length) % FOLDER_COLORS.length],
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
              notion_database_id: database.id,
              notion_data_source_id: dataSource.id,
              notion_title: title,
              sync_direction: "two_way",
              folder_id: folder.id,
            })
            .select()
            .single();

          if (mappingError) throw mappingError;
          mapping = newMapping;
        }

        mappingsTouched += 1;
        const pages = await queryPages(connection.access_token, dataSource.id);

        for (const page of pages.results || []) {
          if (page.object !== "page") continue;
          const title = pageTitle(page);
          const dueDate = pageDueDate(page);
          const status = pageStatus(page);

          const { data: existingLink } = await supabase
            .from("notion_page_tasks")
            .select("task_id, notion_last_edited_time")
            .eq("user_id", user.id)
            .eq("notion_page_id", page.id)
            .maybeSingle();

          if (existingLink) {
            if (existingLink.notion_last_edited_time !== page.last_edited_time) {
              const { error: updateError } = await supabase
                .from("tasks")
                .update({
                  title,
                  status,
                  due_date: dueDate,
                  completed_at: status === "done" ? new Date().toISOString() : null,
                })
                .eq("id", existingLink.task_id)
                .eq("user_id", user.id);
              if (updateError) throw updateError;

              await supabase
                .from("notion_page_tasks")
                .update({ notion_last_edited_time: page.last_edited_time, updated_at: new Date().toISOString() })
                .eq("user_id", user.id)
                .eq("notion_page_id", page.id);
              tasksUpdated += 1;
            }
            continue;
          }

          const { data: task, error: taskError } = await supabase
            .from("tasks")
            .insert({
              user_id: user.id,
              title,
              status,
              due_date: dueDate || new Date().toISOString().slice(0, 10),
              folder_id: mapping.folder_id,
              source_type: "text",
              completed_at: status === "done" ? new Date().toISOString() : null,
            })
            .select()
            .single();

          if (taskError) throw taskError;

          const { error: linkError } = await supabase.from("notion_page_tasks").insert({
            user_id: user.id,
            mapping_id: mapping.id,
            notion_page_id: page.id,
            notion_last_edited_time: page.last_edited_time,
            task_id: task.id,
          });
          if (linkError) throw linkError;
          tasksCreated += 1;
        }

        await supabase
          .from("notion_database_mappings")
          .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", mapping.id);
      }
    }

    return jsonResponse({
      ok: true,
      databases_found: databases.length,
      mappings_touched: mappingsTouched,
      folders_created: foldersCreated,
      tasks_created: tasksCreated,
      tasks_updated: tasksUpdated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});

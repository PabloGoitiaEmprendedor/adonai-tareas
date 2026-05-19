import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, getRequiredEnv, getUserFromRequest, jsonResponse, notionHeaders } from "../_shared/notion.ts";

const notionGet = async (path: string, accessToken: string) => {
  const response = await fetch(`https://api.notion.com${path}`, {
    method: "GET",
    headers: notionHeaders(accessToken),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `Notion request failed: ${path}`);
  return payload;
};

const notionPatch = async (path: string, accessToken: string, body: unknown) => {
  const response = await fetch(`https://api.notion.com${path}`, {
    method: "PATCH",
    headers: notionHeaders(accessToken),
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `Notion request failed: ${path}`);
  return payload;
};

const normalizeText = (value?: string | null) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const findPropertyEntry = (
  properties: Record<string, any>,
  type: string,
  keywords: string[] = [],
) => {
  const entries = Object.entries(properties || {});
  const exact = entries.find(([, prop]) => prop?.type === type);
  if (exact) return exact;

  const byKeyword = entries.find(([name]) => {
    const lower = normalizeText(name);
    return keywords.some((keyword) => lower.includes(keyword));
  });

  return byKeyword || null;
};

const firstLink = (value?: string | null) => String(value || "").split(/\s+/).map((part) => part.trim()).filter(Boolean)[0] || null;

const buildRichText = (links: string[]) =>
  links.map((url) => ({
    type: "text",
    text: {
      content: url,
      link: { url },
    },
  }));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(getRequiredEnv("SUPABASE_URL"), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const user = await getUserFromRequest(req, supabase);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const taskId = String(body.task_id || "");
    if (!taskId) return jsonResponse({ error: "task_id is required" }, 400);

    const { data: relation, error: relationError } = await supabase
      .from("notion_page_tasks")
      .select("notion_page_id, mapping_id")
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .maybeSingle();
    if (relationError) throw relationError;
    if (!relation) return jsonResponse({ ok: true, skipped: "not_linked" });

    const { data: mapping, error: mappingError } = await supabase
      .from("notion_database_mappings")
      .select("id, enabled, sync_direction")
      .eq("user_id", user.id)
      .eq("id", relation.mapping_id)
      .maybeSingle();
    if (mappingError) throw mappingError;
    if (!mapping || mapping.enabled === false) return jsonResponse({ ok: true, skipped: "mapping_disabled" });

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("title, due_date, link")
      .eq("user_id", user.id)
      .eq("id", taskId)
      .maybeSingle();
    if (taskError) throw taskError;
    if (!task) return jsonResponse({ error: "Task not found" }, 404);

    const { data: connection, error: connectionError } = await supabase
      .from("notion_connections")
      .select("access_token")
      .eq("user_id", user.id)
      .maybeSingle();
    if (connectionError) throw connectionError;
    if (!connection) return jsonResponse({ ok: true, skipped: "notion_not_connected" });

    const page = await notionGet(`/v1/pages/${relation.notion_page_id}`, connection.access_token);
    const properties = page?.properties || {};

    const titleProp = findPropertyEntry(properties, "title", ["title", "titulo", "nombre", "name"]);
    const dateProp = findPropertyEntry(properties, "date", ["due", "fecha", "date", "vence", "vencimiento"]);
    const linkProp = findPropertyEntry(properties, "url", ["link", "url", "enlace"]);
    const richTextLinkProp = linkProp ? null : findPropertyEntry(properties, "rich_text", ["link", "url", "enlace"]);

    const updateProperties: Record<string, any> = {};

    if (titleProp && typeof task.title === "string") {
      updateProperties[titleProp[0]] = {
        title: [
          {
            type: "text",
            text: { content: task.title },
          },
        ],
      };
    }

    if (dateProp && Object.prototype.hasOwnProperty.call(task, "due_date")) {
      updateProperties[dateProp[0]] = task.due_date
        ? { date: { start: task.due_date } }
        : { date: null };
    }

    if (Object.prototype.hasOwnProperty.call(task, "link")) {
      const normalizedLinks = String(task.link || "").split(/\s+/).map((part) => part.trim()).filter(Boolean);
      if (linkProp && linkProp[1]?.type === "url") {
        updateProperties[linkProp[0]] = { url: firstLink(task.link) };
      } else if (richTextLinkProp) {
        updateProperties[richTextLinkProp[0]] = {
          rich_text: normalizedLinks.length > 0 ? buildRichText(normalizedLinks) : [],
        };
      }
    }

    if (Object.keys(updateProperties).length === 0) {
      return jsonResponse({ ok: true, skipped: "nothing_to_sync" });
    }

    await notionPatch(`/v1/pages/${relation.notion_page_id}`, connection.access_token, {
      properties: updateProperties,
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});

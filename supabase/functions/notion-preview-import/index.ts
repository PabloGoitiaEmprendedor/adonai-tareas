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

const databaseTitle = (database: any) => richTextToPlain(database?.title || []) || "Base de Notion";

const normalizeId = (value?: string | null) => String(value || "").replace(/-/g, "").toLowerCase();
const normalizeTitle = (value?: string | null) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const getDataSources = (database: any) => {
  const sources = database?.data_sources || database?.dataSources || [];
  if (Array.isArray(sources) && sources.length > 0) {
    return sources.map((source: any) => ({
      id: source.id,
      title: richTextToPlain(source.title || []) || databaseTitle(database),
    }));
  }

  return [{ id: database.id, title: databaseTitle(database) }];
};

type ImportSource = {
  database_id: string;
  data_source_id: string;
  title: string;
  url?: string;
  aliases: string[];
  rank: number;
};

const sourceKey = (source: Pick<ImportSource, "database_id" | "data_source_id" | "title">) =>
  `${normalizeId(source.database_id || source.data_source_id)}:${normalizeTitle(source.title)}`;

const mergeImportSources = (sources: ImportSource[]) => {
  const byKey = new Map<string, ImportSource>();

  for (const source of sources) {
    const key = sourceKey(source);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, { ...source, aliases: Array.from(new Set(source.aliases.filter(Boolean))) });
      continue;
    }

    const preferred = source.rank > current.rank ? source : current;
    byKey.set(key, {
      ...preferred,
      aliases: Array.from(new Set([...current.aliases, ...source.aliases].filter(Boolean))),
      url: preferred.url || current.url,
    });
  }

  return Array.from(byKey.values());
};

const queryPages = async (accessToken: string, dataSourceId: string) => {
  try {
    return await notionPost(`/v1/data_sources/${dataSourceId}/query`, accessToken, { page_size: 100 });
  } catch {
    return await notionPost(`/v1/databases/${dataSourceId}/query`, accessToken, { page_size: 100 });
  }
};

const searchObjects = async (accessToken: string, objectType: string) => {
  const results: any[] = [];
  let startCursor: string | undefined;

  do {
    const payload = await notionPost("/v1/search", accessToken, {
      filter: { property: "object", value: objectType },
      page_size: 100,
      start_cursor: startCursor,
    });

    results.push(...(payload.results || []));
    startCursor = payload.has_more ? payload.next_cursor : undefined;
  } while (startCursor);

  return results;
};

const notionGet = async (path: string, accessToken: string) => {
  const response = await fetch(`https://api.notion.com${path}`, {
    method: "GET",
    headers: notionHeaders(accessToken),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `Notion request failed: ${path}`);
  return payload;
};

const findChildDatabases = async (accessToken: string, blockId: string, depth = 0) => {
  if (depth > 6) return [];

  const databases: any[] = [];
  let startCursor: string | undefined;

  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (startCursor) query.set("start_cursor", startCursor);
    const payload = await notionGet(`/v1/blocks/${blockId}/children?${query.toString()}`, accessToken);

    for (const block of payload.results || []) {
      if (block.type === "child_database") {
        databases.push({
          id: block.id,
          title: [{ plain_text: block.child_database?.title || "Base de Notion" }],
          url: block.url,
        });
      }

      if (block.has_children && block.type !== "child_database") {
        const nested = await findChildDatabases(accessToken, block.id, depth + 1).catch(() => []);
        databases.push(...nested);
      }
    }

    startCursor = payload.has_more ? payload.next_cursor : undefined;
  } while (startCursor);

  return databases;
};

const pagePriorityFlags = (page: any) => {
  const properties = page?.properties || {};
  const priorityProp = Object.entries(properties).find(([name, prop]: [string, any]) => {
    const lower = name.toLowerCase();
    return lower.includes("priority") || lower.includes("prioridad") || prop?.type === "select";
  })?.[1] as any;

  const raw = String(priorityProp?.select?.name || priorityProp?.status?.name || "").toLowerCase();
  if (["urgente importante", "urgent important", "alta", "high", "p1"].some((word) => raw.includes(word))) {
    return { urgency: true, importance: true };
  }
  if (["urgente", "urgent", "p2"].some((word) => raw.includes(word))) {
    return { urgency: true, importance: false };
  }
  if (["importante", "important", "media", "medium", "p3"].some((word) => raw.includes(word))) {
    return { urgency: false, importance: true };
  }
  if (["baja", "low", "normal", "p4"].some((word) => raw.includes(word))) {
    return { urgency: false, importance: false };
  }
  return { urgency: null, importance: null };
};

const pageDescription = (page: any) => {
  const properties = page?.properties || {};
  const textProp = Object.entries(properties).find(([name, prop]: [string, any]) => {
    const lower = name.toLowerCase();
    return lower.includes("description") || lower.includes("descripcion") || lower.includes("descripción") || prop?.type === "rich_text";
  })?.[1] as any;

  return richTextToPlain(textProp?.rich_text || []) || null;
};

const richTextLinks = (items: any[] = []) =>
  items
    .map((item) => item?.href || item?.text?.link?.url)
    .filter(isUserLink);

const isUserLink = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  if (!/^https?:\/\//i.test(value) && !/^mailto:/i.test(value) && !/^tel:/i.test(value)) return false;
  return !/https?:\/\/(www\.)?notion\.so/i.test(value);
};

const pageLinks = (page: any) => {
  const properties = page?.properties || {};
  const links = new Set<string>();

  for (const prop of Object.values(properties) as any[]) {
    if (prop?.type === "url" && isUserLink(prop.url)) links.add(prop.url);
    if (prop?.type === "email" && prop.email) links.add(`mailto:${prop.email}`);
    if (prop?.type === "phone_number" && prop.phone_number) links.add(`tel:${prop.phone_number}`);
    if (prop?.type === "rich_text") richTextLinks(prop.rich_text).forEach((url) => links.add(url));
    if (prop?.type === "title") richTextLinks(prop.title).forEach((url) => links.add(url));
  }

  return Array.from(links).join(" ") || null;
};

const blockLinks = async (accessToken: string, blockId: string, depth = 0): Promise<string[]> => {
  if (depth > 4) return [];

  const links = new Set<string>();
  let startCursor: string | undefined;

  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (startCursor) query.set("start_cursor", startCursor);
    const payload = await notionGet(`/v1/blocks/${blockId}/children?${query.toString()}`, accessToken);

    for (const block of payload.results || []) {
      const richText = block[block.type]?.rich_text || block[block.type]?.caption || [];
      richTextLinks(richText).forEach((url) => links.add(url));

      const url = block[block.type]?.url || block[block.type]?.href;
      if (isUserLink(url)) links.add(url);

      if (block.has_children) {
        const nested = await blockLinks(accessToken, block.id, depth + 1).catch(() => []);
        nested.forEach((nestedUrl) => links.add(nestedUrl));
      }
    }

    startCursor = payload.has_more ? payload.next_cursor : undefined;
  } while (startCursor);

  return Array.from(links);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(getRequiredEnv("SUPABASE_URL"), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const user = await getUserFromRequest(req, supabase);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const selectedIds = new Set((body.data_source_ids || []).map((id: unknown) => normalizeId(String(id))));
    if (selectedIds.size === 0) return jsonResponse({ error: "Select at least one Notion database" }, 400);

    const { data: connection, error: connectionError } = await supabase
      .from("notion_connections")
      .select("access_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connectionError) throw connectionError;
    if (!connection) return jsonResponse({ error: "Notion is not connected" }, 400);

    const [databaseResults, dataSourceResults, pageResults] = await Promise.all([
      searchObjects(connection.access_token, "database").catch(() => []),
      searchObjects(connection.access_token, "data_source").catch(() => []),
      searchObjects(connection.access_token, "page"),
    ]);

    const childDatabases = (await Promise.all(
      pageResults.map((page: any) => findChildDatabases(connection.access_token, page.id).catch(() => [])),
    )).flat();

    const tasks = [];
    const seenPageIds = new Set<string>();

    const dataSourceFallbacks = dataSourceResults.map((source: any) => ({
      id: source.parent?.database_id || source.id,
      title: source.title || [{ plain_text: source.name || "Base de Notion" }],
      data_sources: [{ id: source.id, title: source.title || [{ plain_text: source.name || "Base de Notion" }] }],
      url: source.url,
    }));

    const importSources = mergeImportSources(
      [...databaseResults, ...childDatabases, ...dataSourceFallbacks].flatMap((database: any) =>
        getDataSources(database).map((source: any) => ({
          database_id: database.id,
          data_source_id: source.id,
          title: source.title || databaseTitle(database),
          url: database.url,
          aliases: [database.id, source.id],
          rank: normalizeId(source.id) === normalizeId(database.id) ? 1 : 2,
        })),
      ),
    );

    for (const source of importSources) {
      if (!source.aliases.some((alias) => selectedIds.has(normalizeId(alias)))) continue;

        const pages = await queryPages(connection.access_token, source.data_source_id);
        for (const page of pages.results || []) {
          if (page.object !== "page") continue;
          if (seenPageIds.has(page.id)) continue;
          seenPageIds.add(page.id);

          const dueDate = pageDueDate(page);
          const priorityFlags = pagePriorityFlags(page);
          const propertyLinks = pageLinks(page);
          const contentLinks = await blockLinks(connection.access_token, page.id).catch(() => []);
          const link = Array.from(new Set([
            ...(propertyLinks ? propertyLinks.split(/\s+/).filter(Boolean) : []),
            ...contentLinks,
          ])).join(" ") || null;
          const missing = [
            !dueDate ? "due_date" : null,
            priorityFlags.urgency === null ? "priority" : null,
          ].filter(Boolean);

          tasks.push({
            notion_page_id: page.id,
            notion_last_edited_time: page.last_edited_time,
            database_id: source.database_id,
            data_source_id: source.data_source_id,
            database_title: source.title,
            title: pageTitle(page),
            description: pageDescription(page),
            status: pageStatus(page),
            due_date: dueDate,
            priority: null,
            urgency: priorityFlags.urgency,
            importance: priorityFlags.importance,
            link,
            url: null,
            missing,
          });
        }
    }

    const pageIds = tasks.map((task) => task.notion_page_id);
    let existingPageIds = new Set<string>();

    if (pageIds.length > 0) {
      const { data: existingLinks, error: existingLinksError } = await supabase
        .from("notion_page_tasks")
        .select("notion_page_id")
        .eq("user_id", user.id)
        .in("notion_page_id", pageIds);
      if (existingLinksError) throw existingLinksError;
      existingPageIds = new Set((existingLinks || []).map((link: any) => link.notion_page_id));
    }

    const tasksWithState = tasks.map((task) => ({
      ...task,
      is_existing: existingPageIds.has(task.notion_page_id),
      is_new: !existingPageIds.has(task.notion_page_id),
    }));

    return jsonResponse({
      tasks: tasksWithState,
      complete_count: tasksWithState.filter((task) => task.missing.length === 0).length,
      review_count: tasksWithState.filter((task) => task.missing.length > 0).length,
      new_count: tasksWithState.filter((task) => task.is_new).length,
      existing_count: tasksWithState.filter((task) => task.is_existing).length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});

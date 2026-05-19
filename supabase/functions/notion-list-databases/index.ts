import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  corsHeaders,
  getRequiredEnv,
  getUserFromRequest,
  jsonResponse,
  notionHeaders,
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
      data_source_id: source.id,
      title: richTextToPlain(source.title || []) || databaseTitle(database),
    }));
  }

  return [{ data_source_id: database.id, title: databaseTitle(database) }];
};

type DiscoveredDatabase = {
  database_id: string;
  data_source_id: string;
  title: string;
  url?: string;
  aliases: string[];
  rank: number;
};

const databaseKey = (database: Pick<DiscoveredDatabase, "database_id" | "data_source_id" | "title">) =>
  `${normalizeId(database.database_id || database.data_source_id)}:${normalizeTitle(database.title)}`;

const mergeDiscoveredDatabases = (databases: DiscoveredDatabase[]) => {
  const byKey = new Map<string, DiscoveredDatabase>();

  for (const database of databases) {
    const key = databaseKey(database);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, { ...database, aliases: Array.from(new Set(database.aliases.filter(Boolean))) });
      continue;
    }

    const preferred = database.rank > current.rank ? database : current;
    byKey.set(key, {
      ...preferred,
      aliases: Array.from(new Set([...current.aliases, ...database.aliases].filter(Boolean))),
      url: preferred.url || current.url,
    });
  }

  return Array.from(byKey.values());
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(getRequiredEnv("SUPABASE_URL"), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const user = await getUserFromRequest(req, supabase);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

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

    const databaseEntries = [...databaseResults, ...childDatabases].flatMap((database: any) =>
      getDataSources(database).map((source: any) => ({
        database_id: database.id,
        data_source_id: source.data_source_id,
        title: source.title,
        url: database.url,
        aliases: [database.id, source.data_source_id],
        rank: normalizeId(source.data_source_id) === normalizeId(database.id) ? 1 : 2,
      })),
    );

    const dataSourceEntries = dataSourceResults.map((source: any) => ({
      database_id: source.parent?.database_id || source.id,
      data_source_id: source.id,
      title: richTextToPlain(source.title || []) || source.name || "Base de Notion",
      url: source.url,
      aliases: [source.id, source.parent?.database_id].filter(Boolean),
      rank: 3,
    }));

    const uniqueDatabases = mergeDiscoveredDatabases([...databaseEntries, ...dataSourceEntries]);

    const { data: mappings } = await supabase
      .from("notion_database_mappings")
      .select("notion_database_id, notion_data_source_id, notion_title, enabled, last_synced_at")
      .eq("user_id", user.id);

    const mappingBySource = new Map((mappings || []).map((mapping: any) => [mapping.notion_data_source_id, mapping]));
    const mappingByDatabase = new Map((mappings || []).map((mapping: any) => [
      `${normalizeId(mapping.notion_database_id)}:${normalizeTitle(mapping.notion_title)}`,
      mapping,
    ]));

    return jsonResponse({
      databases: uniqueDatabases.map((database: any) => {
        const mapping = database.aliases.map((alias: string) => mappingBySource.get(alias)).find(Boolean)
          || mappingByDatabase.get(databaseKey(database));

        return {
          database_id: database.database_id,
          data_source_id: database.data_source_id,
          title: database.title,
          url: database.url,
          selected: mapping?.enabled ?? false,
          last_synced_at: mapping?.last_synced_at ?? null,
        };
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});

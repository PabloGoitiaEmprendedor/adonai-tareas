import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type NotionConnection = {
  workspace_name: string | null;
  workspace_id: string | null;
  updated_at: string | null;
};

type NotionMapping = {
  id: string;
  notion_database_id?: string;
  notion_data_source_id?: string;
  notion_title: string;
  folder_id: string;
  enabled: boolean;
  sync_direction: string;
  last_synced_at: string | null;
};

type NotionDatabase = {
  database_id: string;
  data_source_id: string;
  title: string;
  url?: string;
  selected: boolean;
  last_synced_at: string | null;
};

const normalizeNotionId = (value?: string | null) => String(value || "").replace(/-/g, "").toLowerCase();

const normalizeText = (value?: string | null) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");

const notionDatabaseKey = (database: NotionDatabase) => {
  const databaseId = normalizeNotionId(database.database_id || database.data_source_id);
  return `${databaseId}:${normalizeText(database.title)}`;
};

const notionMappingKey = (mapping: NotionMapping) => {
  const databaseId = normalizeNotionId(mapping.notion_database_id || mapping.notion_data_source_id || mapping.id);
  return `${databaseId}:${normalizeText(mapping.notion_title)}`;
};

const dedupeNotionDatabases = (databases: NotionDatabase[]) => {
  const byKey = new Map<string, NotionDatabase>();

  for (const database of databases) {
    const key = notionDatabaseKey(database);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, database);
      continue;
    }

    const currentIsFallback = normalizeNotionId(current.data_source_id) === normalizeNotionId(current.database_id);
    const nextIsFallback = normalizeNotionId(database.data_source_id) === normalizeNotionId(database.database_id);

    byKey.set(key, {
      ...(currentIsFallback && !nextIsFallback ? database : current),
      selected: current.selected || database.selected,
      last_synced_at: current.last_synced_at || database.last_synced_at,
      url: current.url || database.url,
    });
  }

  return Array.from(byKey.values());
};

const dedupeNotionMappings = (mappings: NotionMapping[]) => {
  const byKey = new Map<string, NotionMapping>();

  for (const mapping of mappings) {
    const key = notionMappingKey(mapping);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, mapping);
      continue;
    }

    byKey.set(key, {
      ...(current.last_synced_at ? current : mapping),
      enabled: current.enabled || mapping.enabled,
      last_synced_at: current.last_synced_at || mapping.last_synced_at,
    });
  }

  return Array.from(byKey.values());
};

const readableFunctionError = async (error: unknown) => {
  const fallback = error instanceof Error ? error.message : "No se pudo completar la operacion";
  const context = (error as { context?: Response })?.context;
  if (!context) return fallback;

  try {
    const payload = await context.clone().json();
    return payload?.error || payload?.message || fallback;
  } catch {
    return fallback;
  }
};

const invokeFunction = async <T>(name: string, body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(await readableFunctionError(error));
  return data as T;
};

export type NotionImportTask = {
  notion_page_id: string;
  notion_last_edited_time: string | null;
  database_id: string;
  data_source_id: string;
  database_title: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  priority: "high" | "medium" | "low" | null;
  urgency: boolean | null;
  importance: boolean | null;
  link?: string | null;
  url?: string;
  is_existing?: boolean;
  is_new?: boolean;
  missing: string[];
};

export const useNotionIntegration = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const connection = useQuery({
    queryKey: ["notion-connection", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("notion_connections" as any)
        .select("workspace_name, workspace_id, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as NotionConnection | null;
    },
  });

  const mappings = useQuery({
    queryKey: ["notion-mappings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notion_database_mappings" as any)
        .select("id, notion_database_id, notion_data_source_id, notion_title, folder_id, enabled, sync_direction, last_synced_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return dedupeNotionMappings((data || []) as NotionMapping[]);
    },
  });

  const databases = useQuery({
    queryKey: ["notion-databases", user?.id],
    enabled: !!user && !!connection.data,
    queryFn: async () => {
      const data = await invokeFunction<{ databases?: NotionDatabase[] }>("notion-list-databases", {});
      return dedupeNotionDatabases(data?.databases || []);
    },
  });

  const connect = useMutation({
    mutationFn: async () => {
      const redirectTo = `${window.location.origin}${window.location.pathname}#/settings?notion=connected`;
      const data = await invokeFunction<{ authorizationUrl?: string }>("notion-auth-start", { redirect_to: redirectTo });
      if (!data?.authorizationUrl) throw new Error("No se pudo iniciar la conexión con Notion");

      window.location.href = data.authorizationUrl;
    },
  });

  const sync = useMutation({
    mutationFn: async (dataSourceIds?: string[]) => {
      return await invokeFunction<{
        databases_found: number;
        mappings_touched: number;
        folders_created: number;
        tasks_created: number;
        tasks_updated: number;
      }>("notion-sync", dataSourceIds ? { data_source_ids: Array.from(new Set(dataSourceIds)) } : {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notion-connection"] });
      queryClient.invalidateQueries({ queryKey: ["notion-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["notion-databases"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const previewImport = useMutation({
    mutationFn: async (dataSourceIds: string[]) => {
      return await invokeFunction<{
        tasks: NotionImportTask[];
        complete_count: number;
        review_count: number;
        new_count: number;
        existing_count: number;
      }>(
        "notion-preview-import",
        { data_source_ids: Array.from(new Set(dataSourceIds)) },
      );
    },
  });

  const importReviewed = useMutation({
    mutationFn: async (tasks: NotionImportTask[]) => {
      return await invokeFunction<{ folders_created: number; tasks_created: number; tasks_updated: number }>(
        "notion-import-reviewed",
        { tasks },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notion-connection"] });
      queryClient.invalidateQueries({ queryKey: ["notion-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["notion-databases"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      await invokeFunction("notion-disconnect", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notion-connection"] });
      queryClient.invalidateQueries({ queryKey: ["notion-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["notion-databases"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return {
    connection: connection.data,
    databases: databases.data || [],
    databasesError: databases.error,
    mappings: mappings.data || [],
    isLoading: connection.isLoading || mappings.isLoading || databases.isLoading,
    connect,
    sync,
    previewImport,
    importReviewed,
    disconnect,
  };
};

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, getRequiredEnv, getUserFromRequest, jsonResponse } from "../_shared/notion.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(getRequiredEnv("SUPABASE_URL"), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const user = await getUserFromRequest(req, supabase);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const { data: pageLinks, error: linksError } = await supabase
      .from("notion_page_tasks")
      .select("task_id")
      .eq("user_id", user.id);
    if (linksError) throw linksError;

    const taskIds = (pageLinks || []).map((link: any) => link.task_id).filter(Boolean);
    if (taskIds.length > 0) {
      const { error: taskError } = await supabase
        .from("tasks")
        .delete()
        .eq("user_id", user.id)
        .in("id", taskIds);
      if (taskError) throw taskError;
    }

    const { data: mappings, error: mappingsError } = await supabase
      .from("notion_database_mappings")
      .select("folder_id")
      .eq("user_id", user.id);
    if (mappingsError) throw mappingsError;

    const folderIds = (mappings || []).map((mapping: any) => mapping.folder_id).filter(Boolean);

    await supabase.from("notion_page_tasks").delete().eq("user_id", user.id);
    await supabase.from("notion_database_mappings").delete().eq("user_id", user.id);
    await supabase.from("notion_oauth_states").delete().eq("user_id", user.id);
    await supabase.from("notion_connections").delete().eq("user_id", user.id);

    if (folderIds.length > 0) {
      const { error: folderError } = await supabase
        .from("folders")
        .delete()
        .eq("user_id", user.id)
        .in("id", folderIds);
      if (folderError) throw folderError;
    }

    return jsonResponse({
      ok: true,
      tasks_deleted: taskIds.length,
      folders_deleted: folderIds.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});

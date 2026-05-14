import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BACKUP_BUCKET = "backups";
const RETENTION_DAYS = 7;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dateStr = timestamp.slice(0, 10);

    const tables = [
      "tasks",
      "recurrence_rules",
      "goals",
      "folders",
      "contexts",
      "profiles",
      "usage_events",
      "user_achievements",
      "time_blocks",
      "image_captures",
      "folder_shares",
      "friendships",
      "experiment_metrics",
    ];

    const results: Record<string, { count: number; path: string }> = {};
    const errors: string[] = [];

    for (const table of tables) {
      try {
        let allRows: any[] = [];
        let offset = 0;
        const limit = 1000;

        while (true) {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .range(offset, offset + limit - 1);

          if (error) {
            errors.push(`${table}: ${error.message}`);
            break;
          }

          if (!data || data.length === 0) break;

          allRows = allRows.concat(data);
          offset += limit;
        }

        if (allRows.length > 0 || errors.length === 0) {
          const content = new TextEncoder().encode(JSON.stringify(allRows, null, 2));
          const filePath = `${dateStr}/${table}.json`;

          const { error: uploadError } = await supabase.storage
            .from(BACKUP_BUCKET)
            .upload(filePath, content, {
              contentType: "application/json",
              upsert: true,
            });

          if (uploadError) {
            errors.push(`${table} upload: ${uploadError.message}`);
          } else {
            results[table] = { count: allRows.length, path: filePath };
          }
        }
      } catch (err: any) {
        errors.push(`${table}: ${err.message}`);
      }
    }

    // Clean up old backups (older than RETENTION_DAYS)
    try {
      const { data: existingFiles } = await supabase.storage
        .from(BACKUP_BUCKET)
        .list();
      if (existingFiles) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
        const cutoffStr = cutoff.toISOString().slice(0, 10);

        for (const dir of existingFiles) {
          if (dir.name < cutoffStr) {
            const { data: files } = await supabase.storage
              .from(BACKUP_BUCKET)
              .list(dir.name);
            if (files && files.length > 0) {
              const paths = files.map(f => `${dir.name}/${f.name}`);
              await supabase.storage.from(BACKUP_BUCKET).remove(paths);
            }
          }
        }
      }
    } catch (_) {
      // non-critical: cleanup is best-effort
    }

    return new Response(JSON.stringify({
      success: errors.length === 0,
      timestamp,
      tables: results,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

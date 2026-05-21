import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) return null;
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: tokenData } = await supabaseAdmin
      .from("google_sheets_tokens")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tokenData) {
      return new Response(JSON.stringify({ error: "Google Sheets integration is not connected." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokenData.access_token;
    const now = new Date();

    if (new Date(tokenData.expires_at) <= now && tokenData.refresh_token) {
      console.log("Token expired. Refreshing token...");
      const newToken = await refreshAccessToken(tokenData.refresh_token);
      if (!newToken) {
        return new Response(JSON.stringify({ error: "Failed to refresh Google Sheets credentials." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      accessToken = newToken;
      await supabaseAdmin.from("google_sheets_tokens").update({
        access_token: newToken,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      }).eq("user_id", user.id);
    }

    const { spreadsheetUrl } = await req.json();
    if (!spreadsheetUrl) {
      return new Response(JSON.stringify({ error: "No se proporcionó la URL de la hoja de cálculo." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let spreadsheetId = spreadsheetUrl.trim();
    if (spreadsheetUrl.includes("docs.google.com/spreadsheets")) {
      const match = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        spreadsheetId = match[1];
      } else {
        return new Response(JSON.stringify({ error: "URL de Google Sheets inválida." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`Fetching spreadsheet data for ID: ${spreadsheetId}`);
    const sheetsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z1000`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!sheetsRes.ok) {
      const errDetail = await sheetsRes.json().catch(() => ({}));
      console.error("Sheets API error details:", errDetail);
      return new Response(JSON.stringify({ 
        error: "Error al acceder a Google Sheets. Verifica los permisos de la hoja.",
        details: errDetail 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await sheetsRes.json();
    const rows: string[][] = data.values || [];

    if (rows.length < 2) {
      return new Response(JSON.stringify({ 
        success: true, 
        importedCount: 0, 
        message: "No se encontraron tareas para importar (la hoja está vacía o solo tiene cabecera)." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse headers
    const rawHeaders = rows[0];
    const headers = rawHeaders.map(h => 
      (h || "").toLowerCase().trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    );

    console.log("Detected headers:", headers);

    const titleIndex = headers.findIndex(h => h.includes("titulo") || h.includes("tarea") || h.includes("nombre") || h.includes("task") || h.includes("name") || h.includes("title"));
    const descIndex = headers.findIndex(h => h.includes("desc") || h.includes("nota") || h.includes("detail") || h.includes("info") || h.includes("note"));
    const statusIndex = headers.findIndex(h => h.includes("estado") || h.includes("status") || h.includes("completad") || h.includes("hech") || h.includes("done"));
    const priorityIndex = headers.findIndex(h => h.includes("prioridad") || h.includes("priority"));
    const dueDateIndex = headers.findIndex(h => h.includes("fecha") || h.includes("vencimiento") || h.includes("limite") || h.includes("due") || h.includes("date"));

    const finalTitleIndex = titleIndex !== -1 ? titleIndex : 0;

    const tasksToInsert: any[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const title = row[finalTitleIndex];
      if (!title || title.trim() === "") continue;

      const description = descIndex !== -1 && row[descIndex] ? row[descIndex].trim() : null;

      let status = "pending";
      if (statusIndex !== -1 && row[statusIndex]) {
        const rawStatus = row[statusIndex].toLowerCase().trim();
        if (
          rawStatus.includes("hech") || 
          rawStatus.includes("done") || 
          rawStatus.includes("completad") || 
          rawStatus.includes("si") || 
          rawStatus.includes("yes") || 
          rawStatus === "x" || 
          rawStatus === "true" ||
          rawStatus === "1"
        ) {
          status = "done";
        }
      }

      let priority = "medium";
      if (priorityIndex !== -1 && row[priorityIndex]) {
        const rawPriority = row[priorityIndex].toLowerCase().trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        if (rawPriority.includes("alt") || rawPriority === "high" || rawPriority === "1" || rawPriority === "a") {
          priority = "high";
        } else if (rawPriority.includes("baj") || rawPriority === "low" || rawPriority === "3" || rawPriority === "b") {
          priority = "low";
        }
      }

      let due_date = null;
      if (dueDateIndex !== -1 && row[dueDateIndex]) {
        const rawDate = row[dueDateIndex].trim();
        // Simple attempt to parse date. Google Sheets might format as MM/DD/YYYY or DD/MM/YYYY or YYYY-MM-DD
        const parsedTimestamp = Date.parse(rawDate);
        if (!isNaN(parsedTimestamp)) {
          // Format as YYYY-MM-DD
          due_date = new Date(parsedTimestamp).toISOString().split('T')[0];
        }
      }

      tasksToInsert.push({
        user_id: user.id,
        title: title.trim(),
        description,
        status,
        priority,
        due_date,
        source_type: "text"
      });
    }

    if (tasksToInsert.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        importedCount: 0, 
        message: "No se encontraron filas con títulos de tareas válidos." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Inserting ${tasksToInsert.length} tasks into Adonai...`);
    const { error: insertError } = await supabaseAdmin
      .from("tasks")
      .insert(tasksToInsert);

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({
      success: true,
      importedCount: tasksToInsert.length,
      message: `¡Se importaron ${tasksToInsert.length} tareas con éxito!`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Import sheets error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getRequiredEnv, verifyOAuthState } from "../_shared/notion.ts";

const html = (title: string, body: string, redirectTo?: string) => `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #151820; color: #f7f7f7; font-family: Inter, system-ui, sans-serif; }
      main { width: min(420px, calc(100vw - 40px)); padding: 32px; border: 1px solid rgba(255,255,255,.12); border-radius: 24px; background: rgba(255,255,255,.04); }
      h1 { margin: 0 0 12px; font-size: 24px; }
      p { color: rgba(255,255,255,.72); line-height: 1.5; }
      a { color: #8ee66b; font-weight: 800; }
    </style>
    ${redirectTo ? `<script>setTimeout(() => window.location.replace(${JSON.stringify(redirectTo)}), 1200);</script>` : ""}
  </head>
  <body><main>${body}</main></body>
</html>`;

const responseHtml = (title: string, body: string, status = 200, redirectTo?: string) =>
  new Response(html(title, body, redirectTo), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response(html("Notion no conectado", "<h1>No se pudo conectar Notion</h1><p>Falta el código de autorización.</p>"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    const supabase = createClient(getRequiredEnv("SUPABASE_URL"), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const verifiedState = await verifyOAuthState(state);
    const { data: oauthState } = await supabase
      .from("notion_oauth_states")
      .select("*")
      .eq("state", state)
      .maybeSingle();
    const userId = oauthState?.user_id || verifiedState?.user_id;
    const redirectTo = oauthState?.redirect_to || verifiedState?.redirect_to || "https://webadonai.com/#/settings";

    if (!userId) {
      return responseHtml("Notion no conectado", "<h1>Sesión expirada</h1><p>Vuelve a iniciar la conexión desde Adonai.</p>", 400);
    }

    const clientId = getRequiredEnv("NOTION_CLIENT_ID");
    const clientSecret = getRequiredEnv("NOTION_CLIENT_SECRET");
    const redirectUri = getRequiredEnv("NOTION_REDIRECT_URI");
    const basic = btoa(`${clientId}:${clientSecret}`);

    const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenPayload = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenPayload?.error_description || tokenPayload?.message || "Notion OAuth failed");

    await supabase.from("notion_connections").upsert({
      user_id: userId,
      access_token: tokenPayload.access_token,
      refresh_token: tokenPayload.refresh_token || null,
      workspace_id: tokenPayload.workspace_id || null,
      workspace_name: tokenPayload.workspace_name || null,
      bot_id: tokenPayload.bot_id || null,
      owner: tokenPayload.owner || {},
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    await supabase.from("notion_oauth_states").delete().eq("state", state);

    return new Response(null, {
      status: 303,
      headers: {
        Location: redirectTo,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return responseHtml("Notion no conectado", `<h1>Error al conectar</h1><p>${message}</p>`, 500);
  }
});

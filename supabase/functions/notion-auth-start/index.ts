import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, createOAuthState, getRequiredEnv, getUserFromRequest, jsonResponse } from "../_shared/notion.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(getRequiredEnv("SUPABASE_URL"), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const user = await getUserFromRequest(req, supabase);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const clientId = getRequiredEnv("NOTION_CLIENT_ID");
    const redirectUri = getRequiredEnv("NOTION_REDIRECT_URI");
    const state = await createOAuthState({
      user_id: user.id,
      redirect_to: body.redirect_to || null,
      nonce: crypto.randomUUID(),
      exp: Date.now() + 60 * 60 * 1000,
    });

    await supabase.from("notion_oauth_states").insert({
      state,
      user_id: user.id,
      redirect_to: body.redirect_to || null,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    const authorizationUrl = new URL("https://api.notion.com/v1/oauth/authorize");
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("owner", "user");
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("state", state);

    return jsonResponse({ authorizationUrl: authorizationUrl.toString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});

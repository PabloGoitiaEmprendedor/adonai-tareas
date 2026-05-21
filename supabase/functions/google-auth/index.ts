import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const getScopes = (service?: string) => {
  if (service === "sheets") {
    return [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ].join(" ");
  }
  return [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/calendar",
  ].join(" ");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, code, redirect_uri, user_id, service } = await req.json();

    if (action === "get-url") {
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri,
        response_type: "code",
        scope: getScopes(service),
        access_type: "offline",
        prompt: "consent",
      });
      const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      return new Response(JSON.stringify({ url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      console.log("Processing callback with code and redirect_uri:", redirect_uri, "service:", service);
      
      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenRes.json();
      if (!tokenRes.ok) {
        console.error("Token exchange failed:", tokens);
        return new Response(JSON.stringify({ error: "Token exchange failed", details: tokens }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user info from Google to know which account is being linked
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userInfoRes.json();

      let targetUserId = user_id;

      // If no user_id provided, try to find user by email
      if (!targetUserId) {
        const { data: userByEmail } = await supabaseAdmin.auth.admin.getUserByEmail(userInfo.email);
        if (userByEmail?.user) {
          targetUserId = userByEmail.user.id;
        } else {
          // If still no user, we might need to create one (fallback)
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: userInfo.email,
            email_confirm: true,
            user_metadata: {
              full_name: userInfo.name,
              avatar_url: userInfo.picture,
            },
          });
          if (createError) throw createError;
          targetUserId = newUser.user.id;
        }
      }

      // Store tokens
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      const tokenTable = service === "sheets" ? "google_sheets_tokens" : "google_calendar_tokens";
      let refreshToken = tokens.refresh_token;

      if (!refreshToken) {
        const { data: existingToken } = await supabaseAdmin
          .from(tokenTable)
          .select("refresh_token")
          .eq("user_id", targetUserId)
          .maybeSingle();

        refreshToken = existingToken?.refresh_token;
      }

      const { error: tokenError } = await supabaseAdmin
        .from(tokenTable)
        .upsert({
          user_id: targetUserId,
          access_token: tokens.access_token,
          refresh_token: refreshToken || "",
          expires_at: expiresAt,
          email: userInfo.email,
        }, { onConflict: "user_id" });

      if (tokenError) {
        console.error("Error storing tokens:", tokenError);
        throw tokenError;
      }

      // Mark service as connected in settings
      // Check if setting row exists first
      const { data: existingSettings } = await supabaseAdmin
        .from("settings")
        .select("id")
        .eq("user_id", targetUserId)
        .single();

      const connectionField = service === "sheets" ? "sheets_connected" : "calendar_connected";

      if (existingSettings) {
        await supabaseAdmin.from("settings").update({ [connectionField]: true }).eq("user_id", targetUserId);
      } else {
        await supabaseAdmin.from("settings").insert({ user_id: targetUserId, [connectionField]: true });
      }

      return new Response(JSON.stringify({
        success: true,
        email: userInfo.email,
        name: userInfo.name,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disconnect") {
      let targetUserId = user_id;

      if (!targetUserId) {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("No authorization header");
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) throw new Error("Unauthorized");
        targetUserId = user.id;
      }

      const tokenTable = service === "sheets" ? "google_sheets_tokens" : "google_calendar_tokens";
      const connectionField = service === "sheets" ? "sheets_connected" : "calendar_connected";

      // Delete tokens
      const { error: tokenError } = await supabaseAdmin
        .from(tokenTable)
        .delete()
        .eq("user_id", targetUserId);

      if (tokenError) {
        console.error("Error deleting tokens:", tokenError);
        throw tokenError;
      }

      // Mark disconnected in settings
      const { error: settingsError } = await supabaseAdmin
        .from("settings")
        .update({ [connectionField]: false })
        .eq("user_id", targetUserId);

      if (settingsError) {
        console.error("Error updating settings:", settingsError);
        throw settingsError;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

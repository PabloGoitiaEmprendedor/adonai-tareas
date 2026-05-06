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

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
].join(" ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, code, redirect_uri, user_id } = await req.json();

    if (action === "get-url") {
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri,
        response_type: "code",
        scope: SCOPES,
        access_type: "offline",
        prompt: "consent",
      });
      const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      return new Response(JSON.stringify({ url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      console.log("Processing callback with code and redirect_uri:", redirect_uri);
      
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

      // Store calendar tokens
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      
      const { error: tokenError } = await supabaseAdmin
        .from("google_calendar_tokens")
        .upsert({
          user_id: targetUserId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || "",
          expires_at: expiresAt,
          email: userInfo.email,
        }, { onConflict: "user_id" });

      if (tokenError) {
        console.error("Error storing tokens:", tokenError);
        throw tokenError;
      }

      // Mark calendar as connected in settings
      // Check if setting row exists first
      const { data: existingSettings } = await supabaseAdmin
        .from("settings")
        .select("id")
        .eq("user_id", targetUserId)
        .single();

      if (existingSettings) {
        await supabaseAdmin.from("settings").update({ calendar_connected: true }).eq("user_id", targetUserId);
      } else {
        await supabaseAdmin.from("settings").insert({ user_id: targetUserId, calendar_connected: true });
      }

      return new Response(JSON.stringify({
        success: true,
        email: userInfo.email,
        name: userInfo.name,
      }), {
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

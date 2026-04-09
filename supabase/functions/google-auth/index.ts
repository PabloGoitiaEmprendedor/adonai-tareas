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
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, code, redirect_uri } = await req.json();

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

      // Get user info from Google
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userInfoRes.json();

      // Sign in or create user via Supabase Admin
      // First try to find existing user by email
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u: any) => u.email === userInfo.email);

      let userId: string;
      let sessionData: any;

      if (existingUser) {
        // Generate a session for existing user
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: userInfo.email,
        });
        if (error) throw error;

        // Sign in with the OTP token
        const { data: session, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: userInfo.email,
        });

        userId = existingUser.id;
        
        // Create a custom session token
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink", 
          email: userInfo.email,
        });
        
        sessionData = signInData;
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userInfo.email,
          email_confirm: true,
          user_metadata: {
            full_name: userInfo.name,
            avatar_url: userInfo.picture,
          },
        });
        if (createError) throw createError;
        userId = newUser.user.id;

        // Update profile with Google info
        await supabaseAdmin.from("profiles").update({
          name: userInfo.name,
          email: userInfo.email,
        }).eq("user_id", userId);

        sessionData = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: userInfo.email,
        });
      }

      // Store calendar tokens
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
      
      const { error: tokenError } = await supabaseAdmin
        .from("google_calendar_tokens")
        .upsert({
          user_id: userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || "",
          expires_at: expiresAt,
        }, { onConflict: "user_id" });

      if (tokenError) {
        console.error("Error storing tokens:", tokenError);
      }

      // Mark calendar as connected in settings
      await supabaseAdmin.from("settings").update({ calendar_connected: true }).eq("user_id", userId);

      // Return the magic link properties so frontend can verify
      return new Response(JSON.stringify({
        success: true,
        email: userInfo.email,
        name: userInfo.name,
        hashed_token: sessionData?.data?.properties?.hashed_token,
        verification_url: sessionData?.data?.properties?.action_link,
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

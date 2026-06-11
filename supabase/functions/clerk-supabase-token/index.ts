import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createClerkClient, verifyToken } from "npm:@clerk/backend@1.27.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ClerkUserResponse = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  imageUrl?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getBearerToken = (req: Request) => {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
};

const getPrimaryEmail = (user: ClerkUserResponse) =>
  user.primaryEmailAddress?.emailAddress || null;

const getDisplayName = (user: ClerkUserResponse) =>
  user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || null;

async function tryAdminCreateSession(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}/session`, {
      method: "POST",
      headers: { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" },
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      const text = await res.text();
      console.error("[clerk-supabase-token] admin session endpoint", res.status, text);
      return null;
    }
    const result = await res.json();
    return {
      access_token: result.access_token || result.accessToken,
      refresh_token: result.refresh_token || result.refreshToken,
    };
  } catch {
    return null;
  }
}

async function tryMagicLinkVerify(
  supabaseUrl: string,
  serviceRoleKey: string,
  supabaseAnonKey: string,
  email: string,
): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError) {
      console.error("[clerk-supabase-token] generateLink error:", linkError.message);
      return null;
    }
    if (!linkData?.properties) {
      console.error("[clerk-supabase-token] generateLink: no properties");
      return null;
    }

    const emailOtp = linkData.properties.email_otp as string;
    const actionLink = linkData.properties.action_link as string;

    let token = emailOtp;
    if (!token && actionLink) {
      try {
        const url = new URL(actionLink);
        token = url.searchParams.get("token") || url.searchParams.get("otp") || url.searchParams.get("confirmation_code");
      } catch { /* ignore */ }
    }
    if (!token) {
      console.error("[clerk-supabase-token] no token found");
      return null;
    }

    const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": supabaseAnonKey },
      body: JSON.stringify({ type: "magiclink", email, token, gotrue_meta_security: {} }),
    });

    if (!verifyRes.ok) {
      const text = await verifyRes.text();
      console.error("[clerk-supabase-token] verifyOtp failed", verifyRes.status, text);
      return null;
    }

    const result = await verifyRes.json();
    return { access_token: result.access_token, refresh_token: result.refresh_token };
  } catch (err) {
    console.error("[clerk-supabase-token] magic link error:", err);
    return null;
  }
}

async function tryPasswordSignIn(
  supabaseUrl: string,
  supabaseAnonKey: string,
  email: string,
  password: string,
): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": supabaseAnonKey },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[clerk-supabase-token] password sign-in failed", res.status, text);
      return null;
    }
    const result = await res.json();
    return { access_token: result.access_token, refresh_token: result.refresh_token };
  } catch (err) {
    console.error("[clerk-supabase-token] password sign-in error:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !clerkSecretKey) {
    return json({ error: "Server auth bridge is not configured" }, 500);
  }

  try {
    const bearerToken = getBearerToken(req);
    if (!bearerToken) return json({ error: "Unauthorized" }, 401);

    const claims = await verifyToken(bearerToken, { secretKey: clerkSecretKey });
    if (!claims.sub) return json({ error: "Invalid Clerk token" }, 401);

    const clerkClient = createClerkClient({ secretKey: clerkSecretKey });
    const clerkUser = await clerkClient.users.getUser(claims.sub);
    const email = getPrimaryEmail(clerkUser);
    if (!email) return json({ error: "Clerk user needs a primary email" }, 400);
    const name = getDisplayName(clerkUser);
    const avatarUrl = (clerkUser as any).imageUrl || null;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // --- STEP 1: Find user by multiple methods ---
    // A) By clerk_user_id in links table
    const { data: linkByClerk } = await supabaseAdmin
      .from("clerk_user_links")
      .select("internal_user_id,email")
      .eq("clerk_user_id", claims.sub)
      .maybeSingle();

    // B) By email in auth.users via SECURITY DEFINER function
    let authUserByEmail: Record<string, unknown> | null = null;
    let authQueryError: string | null = null;
    try {
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
        "find_user_by_email",
        { target_email: email.toLowerCase() },
      );
      if (rpcError) {
        authQueryError = rpcError.message;
        console.error("[clerk-supabase-token] RPC error:", rpcError.message);
      } else if (rpcData && rpcData.length > 0) {
        authUserByEmail = rpcData[0] as Record<string, unknown>;
      }
    } catch (e) {
      authQueryError = (e as Error).message;
      console.error("[clerk-supabase-token] RPC exception:", authQueryError);
    }

    // C) By email in links table (another Clerk user might have linked this email)
    const { data: linkByEmail } = await supabaseAdmin
      .from("clerk_user_links")
      .select("internal_user_id, email")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    // --- STEP 2: Determine internal_user_id ---
    let internalUserId: string | null = null;
    let authEmail = email;

    if (linkByClerk) {
      console.log("[clerk-supabase-token] found by clerk_user_id link");
      internalUserId = linkByClerk.internal_user_id;
      authEmail = linkByClerk.email || email;
      // If email lookup found a DIFFERENT user (the old one with data), re-link
      if (authUserByEmail && authUserByEmail.id !== internalUserId) {
        console.log("[clerk-supabase-token] re-linking to existing user found by email");
        internalUserId = authUserByEmail.id as string;
        authEmail = (authUserByEmail.email as string) || email;
      }
    } else if (authUserByEmail) {
      console.log("[clerk-supabase-token] found by email in auth.users (via RPC)");
      internalUserId = authUserByEmail.id as string;
      authEmail = (authUserByEmail.email as string) || email;
    } else if (linkByEmail) {
      console.log("[clerk-supabase-token] found by email in clerk_user_links (re-linking)");
      internalUserId = linkByEmail.internal_user_id;
      authEmail = linkByEmail.email || email;
    } else {
      console.log("[clerk-supabase-token] no existing user found, creating new one");
      console.log("[clerk-supabase-token] auth query error:", authQueryError);
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { clerk_user_id: claims.sub, full_name: name, auth_provider: "clerk" },
      });
      if (createError) throw createError;
      internalUserId = created.user.id;
      authEmail = created.user.email || email;
    }

    if (!internalUserId) throw new Error("Could not resolve internal user ID");

    // --- STEP 3: Fix auth.users flags (via SECURITY DEFINER function) ---
    if (authUserByEmail) {
      try {
        const { error: fixErr } = await supabaseAdmin.rpc("fix_auth_user", {
          p_user_id: internalUserId,
        });
        if (fixErr) {
          console.error("[clerk-supabase-token] fix_auth_user error:", fixErr.message);
        } else {
          console.log("[clerk-supabase-token] auth fixes applied via RPC");
        }
      } catch (e) {
        console.error("[clerk-supabase-token] fix_auth_user exception:", (e as Error).message);
      }
    } else {
      console.log("[clerk-supabase-token] skipping auth fixes (no auth record)");
    }

    // --- STEP 4: Upsert clerk_user_links ---
    await supabaseAdmin.from("clerk_user_links").upsert(
      { clerk_user_id: claims.sub, internal_user_id: internalUserId, email, name },
      { onConflict: "clerk_user_id" },
    );

    // --- STEP 5: Sync profile data ---
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("user_id,name,email,avatar_url,onboarding_completed")
      .eq("user_id", internalUserId)
      .maybeSingle();

    if (!existingProfile) {
      await supabaseAdmin.from("profiles").insert({
        user_id: internalUserId,
        email,
        name: name || undefined,
        avatar_url: avatarUrl,
      });
    } else {
      const profileUpdates: Record<string, string | null> = {};
      if (email && existingProfile.email !== email) profileUpdates.email = email;
      if (name && existingProfile.name !== name) profileUpdates.name = name;
      if (avatarUrl && existingProfile.avatar_url !== avatarUrl) profileUpdates.avatar_url = avatarUrl;
      if (Object.keys(profileUpdates).length > 0) {
        await supabaseAdmin.from("profiles").update(profileUpdates).eq("user_id", internalUserId);
      }
    }

    // --- STEP 6: Ensure seed data ---
    await supabaseAdmin.from("settings").upsert({ user_id: internalUserId }, { onConflict: "user_id" });
    await supabaseAdmin.from("experiment_metrics").upsert({ user_id: internalUserId }, { onConflict: "user_id" });

    const { data: contexts } = await supabaseAdmin
      .from("contexts")
      .select("id")
      .eq("user_id", internalUserId)
      .limit(1);

    if (!contexts || contexts.length === 0) {
      await supabaseAdmin.from("contexts").insert([
        { user_id: internalUserId, name: "Trabajo", color: "#4BE277" },
        { user_id: internalUserId, name: "Personal", color: "#4AE176" },
        { user_id: internalUserId, name: "Salud", color: "#FF8B7C" },
        { user_id: internalUserId, name: "Aprendizaje", color: "#C7C6C6" },
      ]);
    }

    // --- STEP 7: Create session ---
    if (!supabaseAnonKey) throw new Error("SUPABASE_ANON_KEY is not configured");
    if (!authEmail) throw new Error("No email available for sign-in");

    let session: { access_token: string; refresh_token: string } | null = null;

    // Strategy A: Admin session endpoint
    session = await tryAdminCreateSession(supabaseUrl, serviceRoleKey, internalUserId);
    console.log("[clerk-supabase-token] strategy A:", session ? "OK" : "FAIL");

    // Strategy B: generateLink + verifyOtp
    if (!session) {
      session = await tryMagicLinkVerify(supabaseUrl, serviceRoleKey, supabaseAnonKey, authEmail);
      console.log("[clerk-supabase-token] strategy B:", session ? "OK" : "FAIL");
    }

    // Strategy C: Set password + sign in
    if (!session) {
      console.log("[clerk-supabase-token] strategy C starting...");
      const pw = "Tmp_" + crypto.randomUUID() + "!";
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        internalUserId,
        { password: pw, email_confirm: true, app_metadata: { provider: "email" } },
      );
      if (updateErr) {
        console.error("[clerk-supabase-token] updateUserById error:", updateErr.message);
        const rawRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${internalUserId}`, {
          method: "PUT",
          headers: {
            "apikey": serviceRoleKey,
            "Authorization": `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password: pw, email_confirm: true }),
        });
        if (rawRes.ok) {
          console.log("[clerk-supabase-token] raw REST update OK");
        } else {
          const text = await rawRes.text();
          console.error("[clerk-supabase-token] raw REST update failed:", rawRes.status, text);
        }
      } else {
        console.log("[clerk-supabase-token] JS SDK update OK");
      }
      session = await tryPasswordSignIn(supabaseUrl, supabaseAnonKey, authEmail, pw);
      console.log("[clerk-supabase-token] strategy C:", session ? "OK" : "FAIL");
    }

    if (!session) throw new Error("All session creation strategies failed");

    return json({
      email: authEmail,
      internal_user_id: internalUserId,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: internalUserId,
        aud: "authenticated",
        role: "authenticated",
        email: authEmail,
        app_metadata: { provider: "clerk" },
        user_metadata: { clerk_user_id: claims.sub, full_name: name },
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[clerk-supabase-token]", msg);
    return json({ error: msg }, 500);
  }
});

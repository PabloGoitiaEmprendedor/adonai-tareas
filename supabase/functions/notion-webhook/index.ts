import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, getRequiredEnv, notionWebhookSignature, timingSafeEqual } from "../_shared/notion.ts";

const webhookEnabled = () => Deno.env.get("NOTION_WEBHOOK_ENABLED") === "true";
const optionalEnv = (name: string) => Deno.env.get(name) || null;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!webhookEnabled()) {
    return new Response(JSON.stringify({ ok: false, enabled: false }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody || "{}");
    const supabase = createClient(getRequiredEnv("SUPABASE_URL"), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const signature = req.headers.get("x-notion-signature") || req.headers.get("X-Notion-Signature");
    const incomingVerificationToken = payload?.verification_token || null;

    const { data: storedTokens } = await supabase
      .from("notion_webhook_events")
      .select("verification_token")
      .not("verification_token", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);

    const verificationToken =
      incomingVerificationToken ||
      optionalEnv("NOTION_WEBHOOK_VERIFICATION_TOKEN") ||
      storedTokens?.[0]?.verification_token ||
      null;

    if (signature) {
      if (!verificationToken) {
        return new Response(JSON.stringify({ error: "Webhook verification token is not configured" }), {
          status: 428,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expectedSignature = await notionWebhookSignature(rawBody, verificationToken);
      if (!timingSafeEqual(signature, expectedSignature)) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const event = {
      event_type: payload?.event_type || payload?.type || null,
      workspace_id: payload?.workspace_id || null,
      notion_user_id: payload?.user?.id || null,
      page_id: payload?.data?.id || payload?.page_id || null,
      database_id: payload?.data?.parent?.database_id || payload?.database_id || null,
      subscription_id: payload?.subscription_id || null,
      verification_token: payload?.verification_token || null,
      raw_payload: payload,
    };

    await supabase.from("notion_webhook_events").insert(event);

    return new Response(JSON.stringify({ ok: true, verification_token_received: !!incomingVerificationToken }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

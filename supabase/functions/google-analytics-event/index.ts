import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const GA_MEASUREMENT_ID = Deno.env.get("GA_MEASUREMENT_ID") || "G-1EB0BM6V81";
const GA_API_SECRET = Deno.env.get("GA_API_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sanitizeEventName = (value: unknown) => {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 40);

  return /^[a-zA-Z]/.test(normalized) ? normalized : "adonai_event";
};

const sanitizeParams = (params: Record<string, unknown> = {}) =>
  Object.fromEntries(
    Object.entries(params)
      .filter(([key, value]) => key && value !== undefined && value !== null)
      .slice(0, 25)
      .map(([key, value]) => [
        key.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 40),
        Array.isArray(value) || typeof value === "object" ? JSON.stringify(value).slice(0, 100) : value,
      ]),
  );

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!GA_API_SECRET) {
      return new Response(JSON.stringify({ error: "GA_API_SECRET is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const clientId = String(body.client_id || body.clientId || "");
    const eventName = sanitizeEventName(body.name || body.event_name || body.eventName);

    if (!clientId) {
      return new Response(JSON.stringify({ error: "client_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      client_id: clientId,
      user_id: body.user_id || body.userId || undefined,
      events: [
        {
          name: eventName,
          params: sanitizeParams(body.params),
        },
      ],
    };

    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google Analytics error: ${text || response.status}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
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

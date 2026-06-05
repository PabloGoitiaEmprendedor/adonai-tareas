import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.9.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const RISC_MANAGEMENT_AUDIENCE =
  "https://risc.googleapis.com/google.identity.risc.v1beta.RiscManagementService";

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const readServiceAccount = () => {
  const raw = Deno.env.get("GOOGLE_RISC_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("Missing GOOGLE_RISC_SERVICE_ACCOUNT_JSON");
  return JSON.parse(raw) as {
    client_email: string;
    private_key: string;
    private_key_id?: string;
  };
};

const getAllowedClientIds = () => {
  const ids = [Deno.env.get("GOOGLE_CLIENT_ID") || "", ...(Deno.env.get("GOOGLE_CLIENT_IDS") || "").split(/[,\s]+/)]
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(ids)];
};

const buildAuthToken = async () => {
  const serviceAccount = readServiceAccount();
  const privateKey = await importPKCS8(serviceAccount.private_key, "RS256");
  const issuedAt = Math.floor(Date.now() / 1000);

  return await new SignJWT({})
    .setProtectedHeader({
      alg: "RS256",
      typ: "JWT",
      ...(serviceAccount.private_key_id ? { kid: serviceAccount.private_key_id } : {}),
    })
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience(RISC_MANAGEMENT_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 3600)
    .sign(privateKey);
};

const registerStream = async () => {
  const token = await buildAuthToken();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");

  const receiverUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/google-risc-events`;
  const eventsRequested = [
    "https://schemas.openid.net/secevent/risc/event-type/verification",
    "https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required",
    "https://schemas.openid.net/secevent/risc/event-type/account-disabled",
    "https://schemas.openid.net/secevent/risc/event-type/account-enabled",
    "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
    "https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked",
    "https://schemas.openid.net/secevent/oauth/event-type/token-revoked",
  ];

  const response = await fetch("https://risc.googleapis.com/v1beta/stream:update", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      delivery: {
        delivery_method: "https://schemas.openid.net/secevent/risc/delivery-method/push",
        url: receiverUrl,
      },
      events_requested: eventsRequested,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`RISC registration failed (${response.status}): ${text}`);
  }

  return { receiverUrl, responseBody: text, clientIds: getAllowedClientIds() };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return jsonResponse({ ok: true, service: "google-risc-register" });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const result = await registerStream();
    return jsonResponse({ success: true, ...result }, 200);
  } catch (error) {
    console.error("Google RISC registration error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

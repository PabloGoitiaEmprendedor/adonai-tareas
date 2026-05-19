export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const NOTION_VERSION = "2026-03-11";

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const notionHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
  "Notion-Version": NOTION_VERSION,
});

export const hexEncode = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

export const timingSafeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
};

export const notionWebhookSignature = async (rawBody: string, verificationToken: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(verificationToken),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return `sha256=${hexEncode(new Uint8Array(digest))}`;
};

export const getRequiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};

const base64UrlEncode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

const hmac = async (payload: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64UrlEncode(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
};

export const createOAuthState = async (payload: Record<string, unknown>) => {
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await hmac(encodedPayload, getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
  return `${encodedPayload}.${signature}`;
};

export const verifyOAuthState = async (state: string) => {
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = await hmac(encodedPayload, getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
  if (signature !== expectedSignature) return null;

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)));
  if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
  return payload;
};

export const getUserFromRequest = async (req: Request, supabase: any) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error) throw error;
  return data.user;
};

export const richTextToPlain = (items: any[] = []) =>
  items.map((item) => item?.plain_text || "").join("").trim();

export const pageTitle = (page: any) => {
  const properties = page?.properties || {};
  const titleProp = Object.values(properties).find((prop: any) => prop?.type === "title") as any;
  const title = richTextToPlain(titleProp?.title || []);
  return title || "Tarea de Notion";
};

export const pageDueDate = (page: any) => {
  const properties = page?.properties || {};
  const dateProp = Object.values(properties).find((prop: any) => prop?.type === "date" && prop?.date?.start) as any;
  return dateProp?.date?.start?.slice(0, 10) || null;
};

export const pageStatus = (page: any) => {
  const properties = page?.properties || {};
  const statusProp = Object.values(properties).find((prop: any) => prop?.type === "status" || prop?.type === "checkbox") as any;

  if (statusProp?.type === "checkbox") return statusProp.checkbox ? "done" : "pending";

  const statusName = String(statusProp?.status?.name || "").toLowerCase();
  if (["done", "complete", "completed", "hecho", "terminado", "completado"].some((word) => statusName.includes(word))) {
    return "done";
  }
  return "pending";
};

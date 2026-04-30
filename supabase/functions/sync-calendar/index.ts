import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchCalendarEvents(accessToken: string, calendarId: string, timeMin?: string, timeMax?: string) {
  const items: any[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 7 * 86400000).toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "2500",
    });

    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Calendar API error:", err);
      throw new Error("Calendar API error");
    }

    const data = await response.json();
    items.push(...(data.items || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

async function fetchVisibleCalendarIds(accessToken: string, fallbackCalendarId: string) {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return [fallbackCalendarId];
  }

  const data = await response.json();
  const ids = (data.items || [])
    .filter((calendar: any) => calendar?.selected !== false && calendar?.accessRole !== "freeBusyReader")
    .map((calendar: any) => calendar.id)
    .filter(Boolean);

  return ids.length > 0 ? ids : [fallbackCalendarId];
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) return null;
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: tokenData } = await supabaseAdmin
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tokenData) {
      return new Response(JSON.stringify({ events: [], connected: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokenData.access_token;
    const now = new Date();

    if (new Date(tokenData.expires_at) <= now) {
      const newToken = await refreshAccessToken(tokenData.refresh_token);
      if (!newToken) {
        return new Response(JSON.stringify({ events: [], connected: false, error: "Token refresh failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      accessToken = newToken;
      await supabaseAdmin.from("google_calendar_tokens").update({
        access_token: newToken,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      }).eq("user_id", user.id);
    }

    const { timeMin, timeMax } = await req.json();
    const fallbackCalendarId = tokenData.calendar_id || "primary";
    const calendarIds = await fetchVisibleCalendarIds(accessToken, fallbackCalendarId);
    const calendarResults = await Promise.all(
      calendarIds.map((calendarId: string) => fetchCalendarEvents(accessToken, calendarId, timeMin, timeMax).catch(() => []))
    );

    const calendarItems = Array.from(
      new Map(calendarResults.flat().map((event: any) => [event.id, event])).values()
    ).sort((a: any, b: any) => {
      const aStart = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
      const bStart = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
      return aStart - bStart;
    });

    const events = calendarItems.map((e: any) => ({
      id: e.id,
      title: e.summary || "(Sin título)",
      description: e.description || "",
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location || "",
      allDay: !!e.start?.date,
      color: e.colorId || null,
      htmlLink: e.htmlLink,
    }));

    return new Response(JSON.stringify({ events, connected: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sync calendar error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

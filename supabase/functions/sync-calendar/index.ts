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

const GOOGLE_EVENT_COLORS: Record<string, string> = {
  "1": "#A4BDFC",
  "2": "#7AE7BF",
  "3": "#DBADFF",
  "4": "#FF887C",
  "5": "#FBD75B",
  "6": "#FFB878",
  "7": "#46D6DB",
  "8": "#E1E1E1",
  "9": "#5484ED",
  "10": "#51B749",
  "11": "#DC2127",
};

async function fetchCalendarEvents(accessToken: string, calendarId: string, calendarDefaultColor: string, timeMin?: string, timeMax?: string) {
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

  return items.map((e: any) => {
    const urls: string[] = [];
    const desc = e.description || '';
    const hrefRegex = /<a[^>]*href=["']([^"']+)["']/gi;
    let match;
    while ((match = hrefRegex.exec(desc)) !== null) {
      const href = match[1];
      if (!href.startsWith('https://www.google.com/url?')) {
        urls.push(href);
      }
    }
    const plainUrlRegex = /https?:\/\/[^\s<>"']+/g;
    while ((match = plainUrlRegex.exec(desc)) !== null) {
      const url = match[0];
      if (!url.startsWith('https://www.google.com/url?') && !urls.includes(url)) {
        urls.push(url);
      }
    }
    if (e.attachments && Array.isArray(e.attachments)) {
      e.attachments.forEach((att: any) => {
        if (att.fileUrl) urls.push(att.fileUrl);
      });
    }
    if (e.hangoutLink) {
      urls.push(e.hangoutLink);
    }
    if (e.conferenceData?.entryPoints && Array.isArray(e.conferenceData.entryPoints)) {
      e.conferenceData.entryPoints.forEach((ep: any) => {
        if (ep.uri) urls.push(ep.uri);
      });
    }
    if (e.location) {
      const locUrlRegex = /https?:\/\/[^\s<>"']+/g;
      while ((match = locUrlRegex.exec(e.location)) !== null) {
        let url = match[0].replace(/[.,;:!?)]+$/, '');
        if (!urls.includes(url)) {
          urls.push(url);
        }
      }
    }

    return {
      id: e.id,
      title: e.summary || "(Sin título)",
      description: desc,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location || "",
      allDay: !!e.start?.date,
      color: e.colorId ? (GOOGLE_EVENT_COLORS[e.colorId] || calendarDefaultColor) : calendarDefaultColor,
      links: [...new Set(urls)],
      recurrence: e.recurrence || [],
      reminders: e.reminders || null,
    };
  });
}

async function fetchVisibleCalendarIds(accessToken: string, fallbackCalendarId: string): Promise<{ id: string; color: string }[]> {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return [{ id: fallbackCalendarId, color: '#4285F4' }];
  }

  const data = await response.json();
  const calendars = (data.items || [])
    .filter((calendar: any) => calendar?.selected !== false && calendar?.accessRole !== "freeBusyReader")
    .map((calendar: any) => ({
      id: calendar.id,
      color: calendar.backgroundColor || '#4285F4',
    }))
    .filter((c: any) => c.id);

  return calendars.length > 0 ? calendars : [{ id: fallbackCalendarId, color: '#4285F4' }];
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in?: number } | null> {
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
  return { access_token: data.access_token, expires_in: data.expires_in };
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

    if (new Date(tokenData.expires_at) <= now && tokenData.refresh_token) {
      const refreshResult = await refreshAccessToken(tokenData.refresh_token);
      if (!refreshResult) {
        return new Response(JSON.stringify({ events: [], connected: false, error: "Token refresh failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      accessToken = refreshResult.access_token;
      const expiresIn = refreshResult.expires_in || 3600;
      await supabaseAdmin.from("google_calendar_tokens").update({
        access_token: refreshResult.access_token,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      }).eq("user_id", user.id);
    }

    const payload = await req.json();
    const action = payload.action || "fetch";
    const calendarId = payload.calendarId || tokenData.calendar_id || "primary";

    if (action === "fetch") {
      const { timeMin, timeMax } = payload;
      const calendars = await fetchVisibleCalendarIds(accessToken, calendarId);
      const calendarResults = await Promise.all(
        calendars.map((cal: any) => fetchCalendarEvents(accessToken, cal.id, cal.color, timeMin, timeMax).catch(() => []))
      );

      const events = Array.from(
        new Map(calendarResults.flat().map((event: any) => [event.id, event])).values()
      ).sort((a: any, b: any) => {
        const aStart = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
        const bStart = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
        return aStart - bStart;
      });

      return new Response(JSON.stringify({ events, connected: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create" || action === "update") {
      const { eventId, eventData } = payload;
      const url = action === "create"
        ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
        : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`;

      const res = await fetch(url, {
        method: action === "create" ? "POST" : "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to modify event");

      return new Response(JSON.stringify({ success: true, event: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { eventId } = payload;
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!res.ok) throw new Error("Failed to delete event");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
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

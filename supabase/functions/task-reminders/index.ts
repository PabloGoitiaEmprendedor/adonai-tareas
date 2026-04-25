import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // This function is intended to be called by a cron job or manual trigger
    // It finds high-priority pending tasks for users with email notifications enabled
    
    const { data: usersToRemind, error: usersError } = await supabase
      .from("settings")
      .select("user_id, email_notifications_enabled")
      .eq("email_notifications_enabled", true);

    if (usersError) throw usersError;

    const results = [];

    for (const settings of usersToRemind) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, name")
        .eq("user_id", settings.user_id)
        .single();

      if (!profile?.email) continue;

      const { data: tasks } = await supabase
        .from("tasks")
        .select("title, due_date")
        .eq("user_id", settings.user_id)
        .eq("status", "pending")
        .eq("importance", true)
        .limit(3);

      if (!tasks || tasks.length === 0) continue;

      if (RESEND_API_KEY) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Adonai <notificaciones@tu-dominio.com>",
            to: [profile.email],
            subject: `Adonai: Tienes ${tasks.length} tareas importantes pendientes`,
            html: `
              <h1>Hola ${profile.name || 'usuario'},</h1>
              <p>Aquí tienes un recordatorio de tus tareas más importantes para hoy:</p>
              <ul>
                ${tasks.map(t => `<li><strong>${t.title}</strong> (Fecha: ${t.due_date || 'Hoy'})</li>`).join('')}
              </ul>
              <p>¡Sigue así!</p>
            `,
          }),
        });
        results.push({ user: profile.email, sent: res.ok });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

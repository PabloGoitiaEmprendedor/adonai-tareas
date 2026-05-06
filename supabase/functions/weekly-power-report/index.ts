import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") || "https://app.adonai.so";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Metric Calculation (mirrors useWeeklySummary.ts) ---
const SECONDS_PER_ADONAI_CAPTURE = 10;
const SECONDS_PER_TRADITIONAL_CAPTURE = 120;
const SAVED_SECONDS_PER_TASK = SECONDS_PER_TRADITIONAL_CAPTURE - SECONDS_PER_ADONAI_CAPTURE;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function subWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - weeks * 7);
  return d;
}

function getTip(completionRate: number, capturedTasks: number, comparisonPercent: number): string {
  if (capturedTasks === 0) {
    return "Esta semana empieza a capturar tus tareas en Adonai. Incluso 3 tareas diarias cambian cómo te sientes al final del día.";
  }
  if (comparisonPercent > 20) {
    return "¡Semana récord! Capturaste más que nunca. El reto ahora: convertir esas capturas en cierres. Divide cada tarea grande en pasos de 5 minutos.";
  }
  if (completionRate < 0.3) {
    return "Has capturado mucho. Eso es buena señal. Pero para la próxima semana, elige tus 3 tareas MÁS importantes y ciérralas primero, sin falta.";
  }
  if (completionRate > 0.85) {
    return "¡Estás en estado de Flow! El reto: delega o elimina lo que no sea esencial y protege tu energía para los proyectos que más importan.";
  }
  return "Tu ritmo es sólido. La próxima semana, intenta capturar las tareas apenas aparezcan en tu mente. La velocidad de captura es tu superpoder.";
}

function buildEmailHtml(
  name: string,
  metrics: {
    capturedTasks: number;
    completedTasks: number;
    timeSavedMinutes: number;
    energySavedPercent: number;
    comparisonPercent: number;
    efficiencyScore: number;
    productivityTip: string;
  },
  appUrl: string
): string {
  const firstName = name?.split(" ")[0] || "Usuario";
  const comparisonText =
    metrics.comparisonPercent > 0
      ? `<span style="color:#22c55e">↑ ${metrics.comparisonPercent}% más que la semana pasada</span>`
      : metrics.comparisonPercent < 0
      ? `<span style="color:#ef4444">↓ ${Math.abs(metrics.comparisonPercent)}% menos que la semana pasada</span>`
      : `<span style="color:#a1a1aa">Igual que la semana pasada</span>`;

  const timeSavedText =
    metrics.timeSavedMinutes >= 60
      ? `${(metrics.timeSavedMinutes / 60).toFixed(1)} horas`
      : `${metrics.timeSavedMinutes} minutos`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Reporte de Poder Semanal — Adonai</title>
</head>
<body style="margin:0;padding:0;background-color:#2F3437;font-family:'Inter', -apple-system, system-ui, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#2F3437;padding:60px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background-color:#2F3437;border-radius:12px;overflow:hidden;border:1px solid #454B4E;box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
          
          <!-- Header section -->
          <tr>
            <td style="padding:48px 40px 40px;text-align:left;">
              <img src="https://adonai-tareas.lovable.app/logo.png" width="48" height="48" style="border-radius:10px;margin-bottom:24px;" />
              <p style="margin:0 0 12px;color:#21D904;font-size:11px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;">Reporte de Poder</p>
              <h1 style="margin:0 0 8px;color:#ffffff;font-size:32px;font-weight:900;line-height:1.1;">Hola, ${firstName}.</h1>
              <p style="margin:0;color:#9B9A97;font-size:16px;">Esta es tu semana en números.</p>
            </td>
          </tr>

          <!-- Main metric: Time Saved -->
          <tr>
            <td style="padding:40px 40px 0;">
              <table width="100%" style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2);border-radius:24px;overflow:hidden;">
                <tr>
                  <td style="padding:32px;">
                    <p style="margin:0 0 4px;color:rgba(255,255,255,0.5);font-size:11px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;">Tiempo Ahorrado Esta Semana</p>
                    <p style="margin:0 0 8px;color:#a78bfa;font-size:52px;font-weight:900;line-height:1;">${timeSavedText}</p>
                    <p style="margin:0;color:rgba(255,255,255,0.5);font-size:13px;">de gestión innecesaria eliminada</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 3 metric cards -->
          <tr>
            <td style="padding:20px 40px 0;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="33%" style="padding-right:8px;">
                    <table width="100%" style="background:#1a1a28;border:1px solid rgba(255,255,255,0.06);border-radius:20px;">
                      <tr><td style="padding:20px;text-align:center;">
                        <p style="margin:0 0 4px;color:rgba(255,255,255,0.4);font-size:10px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;">Capturadas</p>
                        <p style="margin:0 0 4px;color:#fff;font-size:32px;font-weight:900;">${metrics.capturedTasks}</p>
                        <p style="margin:0;font-size:11px;">${comparisonText}</p>
                      </td></tr>
                    </table>
                  </td>
                  <td width="33%" style="padding:0 4px;">
                    <table width="100%" style="background:#1a1a28;border:1px solid rgba(255,255,255,0.06);border-radius:20px;">
                      <tr><td style="padding:20px;text-align:center;">
                        <p style="margin:0 0 4px;color:rgba(255,255,255,0.4);font-size:10px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;">Cerradas</p>
                        <p style="margin:0 0 4px;color:#22c55e;font-size:32px;font-weight:900;">${metrics.completedTasks}</p>
                        <p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;">tareas completadas</p>
                      </td></tr>
                    </table>
                  </td>
                  <td width="33%" style="padding-left:8px;">
                    <table width="100%" style="background:#1a1a28;border:1px solid rgba(255,255,255,0.06);border-radius:20px;">
                      <tr><td style="padding:20px;text-align:center;">
                        <p style="margin:0 0 4px;color:rgba(255,255,255,0.4);font-size:10px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;">Ejecución</p>
                        <p style="margin:0 0 4px;color:#a78bfa;font-size:32px;font-weight:900;">${metrics.efficiencyScore}%</p>
                        <p style="margin:0;color:rgba(255,255,255,0.4);font-size:11px;">de cumplimiento</p>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Energy saved -->
          <tr>
            <td style="padding:20px 40px 0;">
              <table width="100%" style="background:#1a1a28;border:1px solid rgba(255,255,255,0.06);border-radius:20px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 12px;color:rgba(255,255,255,0.4);font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;">Energía Mental Protegida</p>
                    <!-- Progress bar -->
                    <div style="background:rgba(255,255,255,0.08);border-radius:100px;height:8px;overflow:hidden;">
                      <div style="background:linear-gradient(90deg,#7c3aed,#a78bfa);width:${metrics.energySavedPercent}%;height:100%;border-radius:100px;"></div>
                    </div>
                    <p style="margin:8px 0 0;color:#a78bfa;font-size:13px;font-weight:800;">${metrics.energySavedPercent}% de tu energía cognitiva se mantuvo libre de caos.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Productivity tip -->
          <tr>
            <td style="padding:20px 40px 0;">
              <table width="100%" style="background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.15);border-radius:20px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 8px;color:rgba(255,255,255,0.4);font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;">⚡ Tu desafío para la próxima semana</p>
                    <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;line-height:1.6;">${metrics.productivityTip}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:32px 40px 48px;text-align:center;">
              <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;padding:16px 40px;border-radius:100px;font-weight:900;font-size:14px;letter-spacing:0.05em;">Abrir Adonai →</a>
              <p style="margin:24px 0 0;color:rgba(255,255,255,0.2);font-size:11px;">Recibirás este reporte cada domingo. <a href="${appUrl}/profile" style="color:rgba(124,58,237,0.7);">Gestionar preferencias</a></p>
            </td>
          </tr>

        </table>

        <!-- Footer -->
        <p style="margin:24px 0 0;color:rgba(255,255,255,0.2);font-size:11px;text-align:center;">© ${new Date().getFullYear()} Adonai · Hecho simple, a propósito.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Allow manual trigger with optional userId filter
    let body: { userId?: string } = {};
    try { body = await req.json(); } catch { /* cron trigger, no body */ }

    // 1. Get all users with confirmed emails
    const query = supabase.from("profiles").select("user_id, name, email");
    if (body.userId) query.eq("user_id", body.userId);
    const { data: users, error: usersError } = await query;
    if (usersError) throw usersError;

    const now = new Date();
    const thisWeekStart = startOfWeek(now).toISOString();
    const thisWeekEnd = endOfWeek(now).toISOString();
    const lastWeekStart = startOfWeek(subWeeks(now, 1)).toISOString();
    const lastWeekEnd = endOfWeek(subWeeks(now, 1)).toISOString();

    const results: { user: string; sent: boolean; error?: string }[] = [];

    for (const user of (users || [])) {
      if (!user.email) continue;

      try {
        // Count tasks this week
        const [{ count: capturedThisWeek }, { count: completedThisWeek }, { count: capturedLastWeek }] =
          await Promise.all([
            supabase.from("tasks").select("*", { count: "exact", head: true })
              .eq("user_id", user.user_id)
              .gte("created_at", thisWeekStart).lte("created_at", thisWeekEnd),
            supabase.from("tasks").select("*", { count: "exact", head: true })
              .eq("user_id", user.user_id).eq("status", "done")
              .gte("completed_at", thisWeekStart).lte("completed_at", thisWeekEnd),
            supabase.from("tasks").select("*", { count: "exact", head: true })
              .eq("user_id", user.user_id)
              .gte("created_at", lastWeekStart).lte("created_at", lastWeekEnd),
          ]);

        const captured = capturedThisWeek || 0;
        const completed = completedThisWeek || 0;
        const lastWeek = capturedLastWeek || 0;

        // Don't send if user has zero activity
        if (captured === 0 && completed === 0) {
          results.push({ user: user.email, sent: false, error: "no_activity" });
          continue;
        }

        const timeSavedMinutes = Math.round((captured * SAVED_SECONDS_PER_TASK) / 60);
        const energySavedPercent = Math.min(95, Math.round((captured / (captured + 5)) * 100));
        const comparisonPercent = lastWeek > 0
          ? Math.round(((captured - lastWeek) / lastWeek) * 100)
          : 100;
        const efficiencyScore = captured > 0 ? Math.round((completed / captured) * 100) : 0;
        const completionRate = captured > 0 ? completed / captured : 0;

        const metrics = {
          capturedTasks: captured,
          completedTasks: completed,
          timeSavedMinutes,
          energySavedPercent,
          comparisonPercent,
          efficiencyScore,
          productivityTip: getTip(completionRate, captured, comparisonPercent),
        };

        // Save report to usage_events for profile display
        await supabase.from("usage_events").insert({
          user_id: user.user_id,
          event_type: "weekly_summary_saved",
          metadata: metrics,
        });

        // Send email via Resend
        if (RESEND_API_KEY) {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Adonai <reportes@webadonai.com>",
              to: [user.email],
              subject: `⚡ Tu Reporte de Poder — ${captured} tareas capturadas, ${timeSavedMinutes}min ahorrados`,
              html: buildEmailHtml(user.name || "Usuario", metrics, APP_URL),
            }),
          });
          results.push({ user: user.email, sent: emailRes.ok });
        } else {
          // No Resend key — still saved the report
          results.push({ user: user.email, sent: false, error: "no_resend_key" });
        }
      } catch (userError) {
        const msg = userError instanceof Error ? userError.message : String(userError);
        results.push({ user: user.email, sent: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") || "https://app.adonai.so";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { to, senderName, inviteUrl } = await req.json();

    if (!to || !to.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const targetUrl = inviteUrl || `${APP_URL}/onboarding`;
    const firstName = (senderName || "Tu amigo").split(" ")[0];

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Te invitan a Adonai</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#111118;border-radius:32px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:48px 40px 40px;text-align:center;">
              <p style="margin:0 0 16px;color:rgba(255,255,255,0.7);font-size:13px;">✨ Tienes una invitación</p>
              <h1 style="margin:0;color:#fff;font-size:36px;font-weight:900;line-height:1.1;">${firstName} quiere ser tu<br/>Amigo de Enfoque</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 24px;color:rgba(255,255,255,0.7);font-size:16px;line-height:1.6;">
                En Adonai capturamos tareas en segundos para que tu cerebro no cargue con todo. ${firstName} ya lo usa y quiere que crezcas con él.
              </p>

              <table width="100%" style="background:#1a1a28;border-radius:20px;border:1px solid rgba(255,255,255,0.06);margin-bottom:32px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 12px;color:rgba(255,255,255,0.4);font-size:10px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;">Lo que podrás ver de ${firstName}</p>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                      <p style="margin:0;color:rgba(255,255,255,0.7);font-size:14px;">🔥 Su racha diaria de productividad</p>
                      <p style="margin:0;color:rgba(255,255,255,0.7);font-size:14px;">⚡ Su Reporte de Poder semanal</p>
                      <p style="margin:0;color:rgba(255,255,255,0.7);font-size:14px;">✅ Cuántas tareas ha completado</p>
                    </div>
                  </td>
                </tr>
              </table>

              <div style="text-align:center;">
                <a href="${targetUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;padding:18px 48px;border-radius:100px;font-weight:900;font-size:15px;letter-spacing:0.03em;box-shadow:0 8px 30px rgba(124,58,237,0.4);">
                  Unirme a Adonai →
                </a>
              </div>

              <p style="margin:32px 0 0;color:rgba(255,255,255,0.2);font-size:12px;text-align:center;line-height:1.5;">
                Adonai es gratis. Sin tarjeta. Sin fricción.<br>
                Solo capturas tus tareas y vives más tranquilo.
              </p>
            </td>
          </tr>

        </table>
        <p style="margin:24px 0 0;color:rgba(255,255,255,0.15);font-size:11px;text-align:center;">© ${new Date().getFullYear()} Adonai · Si no esperabas esto, ignora este correo.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    if (!RESEND_API_KEY) {
      // No key configured — return the invite URL so frontend can fallback to clipboard
      return new Response(JSON.stringify({ ok: false, inviteUrl: targetUrl, reason: "no_resend_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Adonai <hola@adonai.so>",
        to: [to],
        subject: `${firstName} te invita a ser su Amigo de Enfoque en Adonai`,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Resend error: ${text}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
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

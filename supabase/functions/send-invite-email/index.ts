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

    const targetUrl = "https://adonai-tareas.lovable.app/";
    const firstName = (senderName || "Tu amigo").split(" ")[0];

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#2F3437;font-family:'Inter', -apple-system, system-ui, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#2F3437;padding:60px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:500px;background-color:#2F3437;border-radius:12px;border:1px solid #454B4E;box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
          <tr>
            <td style="padding:50px 40px;text-align:left;">
              <!-- App Logo -->
              <div style="margin-bottom:32px;">
                <img src="https://adonai-tareas.lovable.app/logo.png" width="48" height="48" style="border-radius:10px;" />
              </div>
              
              <!-- Content -->
              <h1 style="color:#FFFFFF;font-size:28px;font-weight:800;margin:0 0 16px;letter-spacing:-0.02em;line-height:1.2;">${firstName} te invitó a Adonai</h1>
              <p style="color:#EBEBEB;font-size:16px;line-height:1.6;margin:0 0 32px;font-weight:400;">
                Tu Amigo de Enfoque está usando Adonai para liberar su mente. Únete para motivarse juntos y ver su progreso diario.
              </p>

              <!-- Notion Style Button -->
              <div style="margin-bottom:40px;">
                <a href="${targetUrl}" style="display:inline-block;background-color:#21D904;color:#2F3437;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:700;font-size:15px;">
                  Aceptar Invitación
                </a>
              </div>

              <!-- Footer Style Info -->
              <div style="border-top:1px solid #454B4E;padding-top:24px;">
                <p style="color:#9B9A97;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">¿Qué es Adonai?</p>
                <p style="color:#9B9A97;font-size:13px;line-height:1.5;margin:0;">
                  Es la ventanita que vive en tu escritorio para que nunca olvides lo importante. Sin fricción. Solo foco.
                </p>
              </div>
            </td>
          </tr>
        </table>
        <p style="color:#787774;font-size:11px;margin-top:24px;text-align:center;">© ${new Date().getFullYear()} Adonai · adonai-tareas.lovable.app</p>
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
        from: "Adonai <hola@webadonai.com>",
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

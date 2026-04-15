import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64, mimeType } = await req.json();

    const systemPrompt = "Analiza esta imagen y extrae todas las tareas pendientes escritas. NO te limites a transcribir literalmente; si la caligrafía es difícil de leer o hay errores ortográficos evidentes, utiliza tu conocimiento lingüístico para escribir la tarea de forma clara, profesional y correcta en español. Por cada tarea, detecta si menciona una fecha límite. El resultado debe ser un JSON estricto: { \"tasks\": [ { \"raw_text\": \"Título refinado y corregido de la tarea\", \"has_date\": boolean, \"detected_date\": \"YYYY-MM-DD\" | null } ] }";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-1.5-flash-002",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("AI vision error HTTP", response.status, errText);
        return new Response(JSON.stringify({ error: `ai_failed_${response.status}` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";
    
    try {
        const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
        const data = JSON.parse(jsonStr);
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (e) {
        console.error("Parse error:", content);
        return new Response(JSON.stringify({ tasks: [], error: "parse_error", raw_content: content }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

  } catch (e) {
    console.error("Total error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

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

    const systemPrompt = "Analiza esta imagen y extrae todas las tareas pendientes escritas. NO te limites a transcribir literalmente; si la caligrafía es difícil de leer o hay errores ortográficos evidentes, utiliza tu conocimiento lingüístico para escribir la tarea de forma clara, profesional y correcta en español. Por cada tarea, detecta si menciona una fecha límite. Responde ÚNICAMENTE en formato JSON.";

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              {
                inlineData: {
                  mimeType: mimeType || "image/jpeg",
                  data: imageBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    raw_text: { type: "string" },
                    has_date: { type: "boolean" },
                    detected_date: { type: "string", nullable: true }
                  },
                  required: ["raw_text", "has_date"]
                }
              }
            },
            required: ["tasks"]
          }
        }
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("AI vision error HTTP", response.status, errText);
        return new Response(JSON.stringify({ error: `ai_failed_${response.status}` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const aiResult = await response.json();
    const resultText = aiResult.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const data = JSON.parse(resultText);

    return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Total error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

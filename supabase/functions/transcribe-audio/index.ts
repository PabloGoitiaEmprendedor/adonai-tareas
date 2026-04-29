import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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

    // Expect multipart/form-data
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      console.error("No file provided or invalid format:", typeof file);
      return new Response(JSON.stringify({ error: "No se proporcionó un archivo de audio válido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Received file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    const whisperFormData = new FormData();
    // Re-wrap the file to ensure it has a proper name and type for Whisper
    const audioFile = new File([file], "audio.webm", { type: file.type || "audio/webm" });
    whisperFormData.append("file", audioFile);
    whisperFormData.append("model", "whisper-1");
    whisperFormData.append("language", "es");

    console.log("Calling Lovable Transcription API...");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Transcription API error:", response.status, errText);
      
      let errorMessage = "Error en el servicio de transcripción";
      try {
        const errJson = JSON.parse(errText);
        errorMessage = errJson.error?.message || errorMessage;
      } catch (e) {}

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    console.log("Transcription result success");

    return new Response(JSON.stringify({ text: result.text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe-audio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

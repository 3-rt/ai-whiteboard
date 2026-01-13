import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const handleRequest = async (req: Request) => {
  try {
    const { sessionId, audioUrl } = await req.json()

    const audioResp = await fetch(audioUrl)
    if (!audioResp.ok) {
      return new Response("Failed to fetch audio", { status: 400 })
    }

    const audioBlob = await audioResp.blob()

    const form = new FormData()
    form.append("file", audioBlob, "audio.webm")
    form.append("model", "whisper-1")

    const openAiResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}` },
      body: form,
    })

    if (!openAiResp.ok) {
      const err = await openAiResp.text()
      return new Response(err, { status: 500 })
    }

    const data = await openAiResp.json()
    const transcript = data.text

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    await admin
      .from("sessions")
      .update({
        transcript,
        transcript_status: "done",
      })
      .eq("id", sessionId)

    return new Response(JSON.stringify({ transcript }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  } catch (err) {
    console.error("Transcribe error", err)
    return new Response(String(err), { status: 500, headers: corsHeaders })
  }
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  return handleRequest(req)
})

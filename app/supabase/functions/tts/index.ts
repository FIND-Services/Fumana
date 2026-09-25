// Fumana edge function: text-to-speech.
//
// Same contract as the dev middleware it replaces:
//   POST { text }  ->  200 audio/mpeg  |  4xx/5xx JSON { error }
// The provider key is a function secret, never shipped to the browser. On any
// non-200 the browser falls back to SpeechSynthesis, so audio is never required
// for the interview to proceed.
//
// Env (function secrets): ELEVENLABS_API_KEY, optional ELEVENLABS_VOICE_ID,
// ELEVENLABS_MODEL_ID.

import { corsHeaders, json } from "../_shared/cors.ts";

const MAX_CHARS = 1200;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body.text || "").trim().slice(0, MAX_CHARS);
    if (!text) return json({ error: "Missing text" }, 400);

    const key = Deno.env.get("ELEVENLABS_API_KEY") || "";
    if (!key) return json({ error: "TTS is not configured on the server" }, 501);

    const voiceId = Deno.env.get("ELEVENLABS_VOICE_ID") || "21m00Tcm4TlvDq8ikWAM";
    const modelId = Deno.env.get("ELEVENLABS_MODEL_ID") || "eleven_multilingual_v2";
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: { stability: 0.45, similarity_boost: 0.75 },
      }),
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 300);
      return json({ error: "TTS provider error", detail }, 502);
    }
    return new Response(await r.arrayBuffer(), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch {
    // Never log the key or request body.
    console.error("[tts] request failed");
    return json({ error: "TTS request failed" }, 500);
  }
});

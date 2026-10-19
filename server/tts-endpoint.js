// Fumana backend: text-to-speech endpoint.
//
// Holds the TTS provider key server-side and never ships it to the browser —
// the same rule as the Anthropic key in docs/api_integration_notes.md:
//
//   Browser  ->  Fumana backend (holds the key)  ->  TTS provider
//
// It runs as dev/preview-server middleware, so `npm run dev` is the local
// backend. The key is read via Vite's loadEnv (non VITE_ vars are NOT exposed
// to the client bundle) and passed in here; it is never logged or returned.
//
// Provider: ElevenLabs (best fit for Zuri's warm African-English voice). To
// swap providers, change callProvider() only — the browser contract is stable:
//   POST /api/tts  { text }  ->  200 audio/mpeg  |  4xx/5xx JSON { error }
// On any non-200 the browser falls back to SpeechSynthesis, so audio is never
// required for the interview to proceed.

const MAX_CHARS = 1200;

async function callProvider(env, text) {
  const key = env.ELEVENLABS_API_KEY;
  // No key configured -> tell the browser to use its fallback voice.
  if (!key) return { status: 501, json: { error: "TTS is not configured on the server" } };

  const voiceId = env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  const modelId = env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.64,
        similarity_boost: 0.8,
        style: 0,
        use_speaker_boost: true,
        speed: 0.94,
      },
    }),
  });
  if (!r.ok) {
    const detail = (await r.text()).slice(0, 300);
    return { status: 502, json: { error: "TTS provider error", detail } };
  }
  return { status: 200, audio: Buffer.from(await r.arrayBuffer()) };
}

function makeHandler(env) {
  return async (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const text = String(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}").text || "")
        .trim()
        .slice(0, MAX_CHARS);
      if (!text) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Missing text" }));
        return;
      }
      const out = await callProvider(env, text);
      if (out.audio) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", out.audio.length);
        res.setHeader("Cache-Control", "no-store");
        res.end(out.audio);
      } else {
        res.statusCode = out.status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(out.json));
      }
    } catch {
      // Never log the key or request body; a short server-side line only.
      console.error("[tts] request failed");
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "TTS request failed" }));
    }
  };
}

// Vite plugin: mounts POST /api/tts on both the dev and preview servers.
export function ttsEndpoint(env) {
  return {
    name: "fumana-tts-endpoint",
    configureServer(server) {
      server.middlewares.use("/api/tts", makeHandler(env));
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/tts", makeHandler(env));
    },
  };
}

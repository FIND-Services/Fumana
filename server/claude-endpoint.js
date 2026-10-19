// Fumana backend: LLM proxy — provider-agnostic.
//
// The browser always calls POST /api/claude with { system, messages } and gets
// back { text }. The provider is chosen entirely by environment variables, so
// Gemini is the sole model provider. The key is read server-side (non VITE_,
// never bundled):
//
//   Browser  ->  Fumana backend (holds the key)  ->  LLM provider
//
// Env:
//   LLM_PROVIDER  gemini   (unset -> proxy is inert, returns 501)
//   LLM_API_KEY   the chosen provider's key
//   LLM_MODEL     optional model override (else a per-provider default)
//
// To add a provider, add one entry to PROVIDERS below. The route, the request
// shape, and the { text } response shape never change.

import { demoText } from "../supabase/functions/_shared/demo-responses.js";

const MAX_TOKENS = 2048;

// Each adapter takes the normalized request and returns { status, text?, error? }.
// The app-facing contract ({ system, messages } in, { text } out) is identical
// across providers; each adapter maps to/from its provider's own shape here.
const PROVIDERS = {
  gemini: {
    defaultModel: "gemini-3.6-flash",
    async call({ key, model, system, messages, expectJson }) {
      const contents = messages.map(message => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: String(message.content || "") }],
      }));
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents,
          generationConfig: {
            maxOutputTokens: MAX_TOKENS,
            ...(expectJson ? { responseMimeType: "application/json" } : {}),
          },
        }),
      });
      const data = await r.json();
      if (!r.ok) return { status: r.status, error: data?.error?.message || "provider error" };
      const text = (data.candidates?.[0]?.content?.parts || []).map(part => part.text || "").join("\n").trim();
      return { status: 200, text };
    },
  },
};

function makeHandler(env) {
  const send = (res, status, obj) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(obj));
  };
  return async (req, res) => {
    if (req.method !== "POST") { res.statusCode = 405; res.end("Method Not Allowed"); return; }
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      const messages = Array.isArray(body.messages) ? body.messages : [];
      if (!messages.length) return send(res, 400, { error: "Missing messages" });
      const system = body.system ? String(body.system) : "";
      const expectJson = body.expectJson === true;

      // Demo mode: intercept every request and return a pre-built response.
      // No provider and no key are needed; nothing is sent to any provider.
      if (String(env.DEMO_MODE || "").trim().toLowerCase() === "true") {
        return send(res, 200, { text: demoText(system, messages) });
      }

      const providerName = (env.LLM_PROVIDER || "").trim().toLowerCase();
      const key = env.LLM_API_KEY;
      // Inert until BOTH a provider and a key are configured.
      if (!providerName || !key) return send(res, 501, { error: "LLM provider is not configured on the server" });
      const provider = PROVIDERS[providerName];
      if (!provider) return send(res, 500, { error: `Unknown LLM_PROVIDER "${providerName}"` });
      const model = (env.LLM_MODEL || "").trim() || provider.defaultModel;

      const out = await provider.call({ key, model, system, messages, expectJson });
      if (out.status !== 200) return send(res, out.status, { error: out.error || "provider error" });
      return send(res, 200, { text: out.text || "" });
    } catch {
      // Never log the key or the request body; a short server-side line only.
      console.error("[llm] request failed");
      return send(res, 500, { error: "LLM request failed" });
    }
  };
}

// Vite plugin: mounts POST /api/claude on both the dev and preview servers.
export function claudeEndpoint(env) {
  return {
    name: "fumana-claude-endpoint",
    configureServer(server) { server.middlewares.use("/api/claude", makeHandler(env)); },
    configurePreviewServer(server) { server.middlewares.use("/api/claude", makeHandler(env)); },
  };
}

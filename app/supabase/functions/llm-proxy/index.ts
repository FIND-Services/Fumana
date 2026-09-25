// Fumana edge function: LLM proxy — provider-agnostic.
//
// Same contract as the dev middleware it replaces:
//   POST { system, messages }  ->  { text }
// The provider is chosen entirely by environment variables (secrets on the
// function, never shipped to the browser):
//   LLM_PROVIDER  anthropic | openai   (unset -> 501, app shows inert state)
//   LLM_API_KEY   the chosen provider's key
//   LLM_MODEL     optional model override
//   DEMO_MODE     "true" -> canned responses, no provider contacted
//
// To add a provider, add one entry to PROVIDERS below.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { demoText } from "../_shared/demo-responses.js";

const MAX_TOKENS = 1024;

// Which canonical agent produced this call — mirrors the routing keywords in
// _shared/demo-responses.js so runs and demo responses classify identically.
function agentOf(system: string): string {
  const lo = system.toLowerCase();
  if (lo.includes("currency") || lo.includes("devaluat") || lo.includes("exchange rate"))
    return lo.includes("compliance") ? "rederivation-compliance" : "rederivation-economics";
  if (lo.includes("scoring model") || lo.includes("score six dimensions")) return "telos-scoring";
  if (lo.includes("ingestion agent") || lo.includes("curriculum")) return "cv-builder";
  if (lo.includes("you are zuri")) return "zuri";
  if (lo.includes("alchemist") || lo.includes("transmute") || lo.includes("ats")) return "alchemist";
  if (lo.includes("negotiation") || lo.includes("pay band")) return "negotiation-coach";
  if (lo.includes("statement of work") || lo.includes("compliance agent")) return "sow-compliance";
  if (lo.includes("economist") || lo.includes("economics agent") || lo.includes("budget")) return "economics";
  if (lo.includes("trajectory") || lo.includes("highest-leverage")) return "trajectory";
  if (lo.includes("culture shock") || lo.includes("communication readiness")) return "culture-shock";
  return "copilot";
}

// Canonical AgentRun audit record (docs/canonical_schema.md): every model
// call is logged under the caller's identity. The caller's JWT flows in the
// Authorization header, so the insert satisfies agent_runs RLS
// (created_by = auth.uid()) with no service key anywhere. Signed-out or demo
// calls still succeed; they simply have no one to attribute.
async function logRun(authHeader: string | null, agent: string, system: string, output: string, model: string) {
  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) return;
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from("agent_runs").insert({
      created_by: user.id,
      agent,
      model,
      input_ref: system.slice(0, 200),
      output_json: { text: output.slice(0, 2000) },
    });
  } catch {
    // Audit logging must never break the call it records.
    console.error("[llm-proxy] agent_run log failed");
  }
}

interface ProviderCall {
  key: string;
  model: string;
  system: string;
  messages: { role: string; content: string }[];
}

const PROVIDERS: Record<string, {
  defaultModel: string;
  call: (c: ProviderCall) => Promise<{ status: number; text?: string; error?: string }>;
}> = {
  anthropic: {
    defaultModel: "claude-sonnet-4-6",
    async call({ key, model, system, messages }) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: MAX_TOKENS, ...(system ? { system } : {}), messages }),
      });
      const data = await r.json();
      if (!r.ok) return { status: r.status, error: data?.error?.message || "provider error" };
      const text = (data.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n").trim();
      return { status: 200, text };
    },
  },
  openai: {
    defaultModel: "gpt-4o-mini",
    async call({ key, model, system, messages }) {
      const chat = [...(system ? [{ role: "system", content: system }] : []), ...messages];
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, max_tokens: MAX_TOKENS, messages: chat }),
      });
      const data = await r.json();
      if (!r.ok) return { status: r.status, error: data?.error?.message || "provider error" };
      return { status: 200, text: (data.choices?.[0]?.message?.content || "").trim() };
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!messages.length) return json({ error: "Missing messages" }, 400);
    const system = body.system ? String(body.system) : "";

    // Demo mode: canned responses, no provider contacted, no key needed.
    if ((Deno.env.get("DEMO_MODE") || "").trim().toLowerCase() === "true") {
      const text = demoText(system, messages);
      logRun(req.headers.get("Authorization"), agentOf(system), system, text, "demo");
      return json({ text });
    }

    const providerName = (Deno.env.get("LLM_PROVIDER") || "").trim().toLowerCase();
    const key = Deno.env.get("LLM_API_KEY") || "";
    if (!providerName || !key) return json({ error: "LLM provider is not configured on the server" }, 501);
    const provider = PROVIDERS[providerName];
    if (!provider) return json({ error: `Unknown LLM_PROVIDER "${providerName}"` }, 500);
    const model = (Deno.env.get("LLM_MODEL") || "").trim() || provider.defaultModel;

    const out = await provider.call({ key, model, system, messages });
    if (out.status !== 200) return json({ error: out.error || "provider error" }, out.status);
    logRun(req.headers.get("Authorization"), agentOf(system), system, out.text || "", model);
    return json({ text: out.text || "" });
  } catch {
    // Never log the key or the request body.
    console.error("[llm-proxy] request failed");
    return json({ error: "LLM request failed" }, 500);
  }
});

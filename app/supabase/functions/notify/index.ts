// Fumana edge function: transactional notifications via Brevo.
//
// POST { match_id, event } — event is one of the fixed lifecycle kinds below.
// Recipients are derived server-side from the match (the counterparty to the
// caller), and templates are constants — callers cannot send arbitrary mail
// to arbitrary addresses through this function.
//
//   BREVO_API_KEY  required; unset -> { sent: false, reason } (inert, honest)
//   BREVO_SENDER   verified sender address; falls back to noreply@fumana.app
//   BREVO_SENDER_NAME  optional display name, default "Fumana"

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const EVENTS: Record<string, { to: "builder" | "employer"; subject: string; body: (p: Params) => string }> = {
  "interview-requested": {
    to: "builder",
    subject: "An employer requested an interview",
    body: p => `An employer has committed to an interview with you on Fumana${p.extra ? ` for ${p.extra}` : ""}. Your identity stays shielded in search — this unlocks a direct conversation. Sign in to Applications to respond.`,
  },
  "sow-sent": {
    to: "builder",
    subject: "A statement of work is waiting for your review",
    body: () => `An employer has drafted a statement of work for you on Fumana. Review the scope, term, and jurisdiction in Applications — you can accept or decline.`,
  },
  "sow-accepted": {
    to: "employer",
    subject: "Your statement of work was accepted",
    body: p => `${p.name} accepted your statement of work on Fumana. The engagement is now active — find it under My Team.`,
  },
  "sow-declined": {
    to: "employer",
    subject: "Your statement of work was declined",
    body: p => `${p.name} declined your statement of work on Fumana. The engagement is closed; the builder remains in the network.`,
  },
  "engagement-closed": {
    to: "builder",
    subject: "An engagement has been closed",
    body: () => `An employer has closed your active engagement on Fumana. Details are in your Applications hub and audit trail.`,
  },
};

interface Params { name: string; extra?: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const spec = EVENTS[String(body.event || "")];
    if (!spec) return json({ error: "Unknown event" }, 400);

    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: match } = await service.from("matches")
      .select("id, builders!inner(owner_id, name), employers!inner(owner_id, name)")
      .eq("id", String(body.match_id || ""))
      .maybeSingle();
    if (!match) return json({ error: "Match not found" }, 404);

    // Only a party to the match may trigger its notifications.
    const builderOwner = (match.builders as { owner_id: string; name: string }).owner_id;
    const employerOwner = (match.employers as { owner_id: string; name: string }).owner_id;
    if (user.id !== builderOwner && user.id !== employerOwner) return json({ error: "Not a party to this match" }, 403);

    const recipientId = spec.to === "builder" ? builderOwner : employerOwner;
    const { data: { user: recipient } } = await service.auth.admin.getUserById(recipientId);
    if (!recipient?.email) return json({ sent: false, reason: "recipient has no email" });

    const key = Deno.env.get("BREVO_API_KEY");
    if (!key) return json({ sent: false, reason: "BREVO_API_KEY not configured" });

    const params: Params = {
      name: spec.to === "employer" ? ((match.builders as { name: string }).name || "The builder") : ((match.employers as { name: string }).name || "An employer"),
    };
    const html = `<p>${spec.body(params)}</p><p style="color:#666;font-size:12px">Fumana — the talent clearing house for African engineering. <a href="https://find-services.github.io/Fumana/">Sign in</a></p>`;
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { email: Deno.env.get("BREVO_SENDER") || "noreply@fumana.app", name: Deno.env.get("BREVO_SENDER_NAME") || "Fumana" },
        to: [{ email: recipient.email }],
        subject: spec.subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) return json({ sent: false, reason: `brevo ${res.status}` });
    return json({ sent: true });
  } catch {
    console.error("[notify] request failed");
    return json({ error: "Notify failed" }, 500);
  }
});

// Fumana edge function: employer domain verification.
//
// POST { phase: "issue" }  ->  { domain, token, verified }
//   Issues (or returns) the per-org TXT token. The org publishes it as a DNS
//   TXT record on employers.domain:  fumana-verify=<token>
// POST { phase: "check" }  ->  { verified }
//   Resolves the domain's TXT records via DNS-over-HTTPS and flips
//   employers.domain_verified when the token is present.
//
// Identity comes from the caller's JWT; the employers write uses the service
// role because RLS restricts updates to the owner — which the caller is, but
// the function double-checks ownership anyway rather than trusting the flag.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const MARKER = "fumana-verify=";

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

    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: employer } = await service.from("employers")
      .select("id, domain, domain_verified, verify_token")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!employer) return json({ error: "No employer profile" }, 404);
    if (!employer.domain) return json({ error: "Set a company domain on your account first" }, 400);

    const body = await req.json().catch(() => ({}));
    const phase = body.phase === "check" ? "check" : "issue";

    let token = employer.verify_token;
    if (!token) {
      token = crypto.randomUUID();
      await service.from("employers").update({ verify_token: token }).eq("id", employer.id);
    }

    if (phase === "issue") {
      return json({ domain: employer.domain, token, verified: employer.domain_verified });
    }

    if (employer.domain_verified) return json({ verified: true });

    // DNS-over-HTTPS: TXT records for the org domain, looking for the marker.
    const dns = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(employer.domain)}&type=TXT`,
    );
    const res = await dns.json().catch(() => ({}));
    const answers = Array.isArray(res?.Answer) ? res.Answer : [];
    const found = answers.some((a: { data?: string }) =>
      String(a.data || "").replace(/"/g, "").includes(`${MARKER}${token}`)
    );
    if (!found) return json({ verified: false, domain: employer.domain, token });

    await service.from("employers").update({ domain_verified: true }).eq("id", employer.id);
    return json({ verified: true, domain: employer.domain });
  } catch {
    console.error("[verify-domain] request failed");
    return json({ error: "Verification failed" }, 500);
  }
});

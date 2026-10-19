import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const attempts = new Map<string, { count: number; resetsAt: number }>();

function allowed(ip: string) {
  const now = Date.now();
  const current = attempts.get(ip);
  if (!current || current.resetsAt <= now) {
    attempts.set(ip, { count: 1, resetsAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (current.count >= 5) return false;
  current.count += 1;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed(ip)) return json({ error: "Too many checks. Please wait 15 minutes and try again." }, 429);

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const role = body.role === "employer" ? "employer" : "builder";
    if (!EMAIL_PATTERN.test(email) || email.length > 254) return json({ error: "Enter a valid email address." }, 400);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: exists, error: lookupError } = await service.rpc("account_email_exists", { lookup_email: email });
    if (lookupError) throw lookupError;
    if (!exists) return json({ exists: false }, 404);

    const appUrl = (Deno.env.get("PUBLIC_APP_URL") || "https://fumana-app.vercel.app").replace(/\/$/, "");
    const { error: resetError } = await service.auth.resetPasswordForEmail(email, { redirectTo: `${appUrl}/update-password?role=${role}` });
    if (resetError) {
      console.error(`[password-reset] auth returned ${resetError.status || "error"}`);
      return json({ error: "The reset email could not be sent. Please wait and try again." }, resetError.status === 429 ? 429 : 502);
    }
    return json({ exists: true, sent: true });
  } catch {
    console.error("[password-reset] request failed");
    return json({ error: "The account check could not be completed. Please try again." }, 500);
  }
});

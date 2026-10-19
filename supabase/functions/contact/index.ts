import { corsHeaders, json } from "../_shared/cors.ts";

const ADMIN_EMAIL = "info@wefindservices.org";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const message = String(body.message || "").trim();

    if (name.length < 2 || name.length > 100) return json({ error: "Enter a valid name." }, 400);
    if (!EMAIL_PATTERN.test(email) || email.length > 254) return json({ error: "Enter a valid email address." }, 400);
    if (message.length < 10 || message.length > 5000) return json({ error: "Your message must be between 10 and 5,000 characters." }, 400);

    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    if (!resendKey) return json({ error: "Contact email is not configured yet." }, 503);

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replaceAll("\n", "<br>");
    const html = `<!doctype html>
<html><body style="margin:0;background:#f2f4f7;font-family:Arial,sans-serif;color:#0c1a26">
  <div style="max-width:640px;margin:32px auto;background:#fff;border:1px solid #d7dee3">
    <div style="background:#066e5a;padding:24px 28px;color:#fff">
      <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;opacity:.82">Fumana contact</div>
      <h1 style="margin:8px 0 0;font-size:24px">A new message has arrived</h1>
    </div>
    <div style="padding:28px">
      <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:22px">
        <tr><td style="padding:10px 12px;background:#f2f4f7;width:120px;font-size:12px;color:#5e6e7a;text-transform:uppercase">Name</td><td style="padding:10px 12px;border-bottom:1px solid #e3e8eb">${safeName}</td></tr>
        <tr><td style="padding:10px 12px;background:#f2f4f7;font-size:12px;color:#5e6e7a;text-transform:uppercase">Email</td><td style="padding:10px 12px"><a href="mailto:${safeEmail}" style="color:#066e5a">${safeEmail}</a></td></tr>
      </table>
      <div style="font-size:12px;color:#5e6e7a;text-transform:uppercase;margin-bottom:8px">Message</div>
      <div style="padding:18px;background:#f7faf9;border-left:4px solid #066e5a;line-height:1.65">${safeMessage}</div>
      <p style="margin:26px 0 0;color:#5e6e7a;font-size:12px"><em>Sent from Fumana</em></p>
    </div>
  </div>
</body></html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: `Fumana <${ADMIN_EMAIL}>`,
        to: [ADMIN_EMAIL],
        reply_to: email,
        subject: `Fumana contact from ${name}`,
        html,
      }),
    });
    if (!response.ok) {
      console.error(`[contact] Resend returned ${response.status}`);
      return json({ error: "Your message could not be sent. Please try again shortly." }, 502);
    }
    return json({ ok: true });
  } catch {
    console.error("[contact] request failed");
    return json({ error: "Your message could not be sent. Please try again shortly." }, 500);
  }
});

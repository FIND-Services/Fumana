# Fumana — Deployment Runbook

How to take the repo from import to a working production deployment on Vercel
(`fumana-app.vercel.app`), with every Supabase-side setting that is not in code.
Checklist format — each step says what "done" looks like.

---

## 0. Architecture at a glance

| Piece | Where it lives | Notes |
|---|---|---|
| Frontend | Repository root — React + Vite SPA, builds to `dist` | All routes are client-side; no SSR |
| Database + Auth | Supabase project `lvozhbnpvwsvjsdnebsl` | Postgres + RLS + GoTrue |
| Edge functions | `supabase/functions/` | `llm-proxy`, `tts`, `verify-domain`, `notify` — already deployed |
| Storage | `builder-media` bucket (private) | Pitch videos + CV uploads |

The app has two independent environment choices:

- **Authentication/backend** — `VITE_SUPABASE_*` must be set for real signup,
  sign-in, persistence, and RLS. Authentication is never simulated.
- **AI mode** — `DEMO_MODE=true` returns prepared AI responses without Gemini;
  `DEMO_MODE=false` uses the configured Gemini secrets.

---

## 1. Vercel project setup

Import the GitHub repo. A `vercel.json` at the repo root already encodes
everything, so defaults work:

```json
{
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Keep **Root Directory** at the repository root. Do not set it to `app`; the
frontend package and its configuration now live directly at the root.

The catch-all rewrite is required — it routes every path to `index.html` so
the SPA handles routing (including password-reset links).

### Environment variables (Vercel → Settings → Environment Variables)

| Name | Value | Where to get it |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://lvozhbnpvwsvjsdnebsl.supabase.co` | Supabase dashboard → Project Settings → API Keys |
| `VITE_SUPABASE_ANON_KEY` | the **Publishable** key (`sb_publishable_...`) or `anon` `public` JWT | same page |

Use the **anon/publishable** key — never `service_role`/secret. The anon key
is designed to ship to browsers; RLS is what guards the data. Also in
`.env.local` at the repository root if you have repo access.

**Done when:** after redeploy, the site loads AND signup/sign-in hits
`*.supabase.co` (browser devtools → Network). Env vars never apply to old
builds — always **Redeploy** after setting them.

---

## 2. Supabase dashboard configuration

All at `https://supabase.com/dashboard/project/lvozhbnpvwsvjsdnebsl`.

### 2a. Auth URL configuration — **required for Vercel**

Authentication → URL Configuration:

| Field | Value |
|---|---|
| Site URL | `https://fumana-app.vercel.app` |
| Redirect URLs (allow-list) | `https://fumana-app.vercel.app/**`, `http://localhost:5173/**`, `http://127.0.0.1:5173/**` |

The application uses `/auth/callback` for Google OAuth and signup confirmation,
and `/update-password` for password recovery. The wildcard entries above allow
both routes. Without them, Supabase rejects the requested redirect.

### 2b. Email confirmation

Authentication → Sign In / Providers → Email:

- **"Confirm email" ON** — required. New email/password users see a check-email
  screen and cannot sign in until they open Supabase's confirmation link.
- **Leaked-password protection ON** — same page. Checks passwords against
  HaveIBeenPwned; should always be enabled in production.

### 2c. Google authentication

Authentication → Sign In / Providers → Google:

- Keep Google enabled and save the Google client ID and client secret only in
  Supabase.
- In Google Cloud, the authorized redirect URI must be
  `https://lvozhbnpvwsvjsdnebsl.supabase.co/auth/v1/callback`.
- Do not put the Google client secret in Vercel or any `VITE_` variable.

### 2d. Custom SMTP (Brevo) — needed for password resets + confirmations

Authentication → Emails → SMTP Settings → enable Custom SMTP:

| Field | Value |
|---|---|
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | Brevo login email |
| Password | Brevo **SMTP key** (Brevo → SMTP & API → SMTP tab → Generate; *not* the API key) |
| Sender email | an address verified in Brevo |
| Sender name | `Fumana` |

Until this is set, Supabase's built-in sender rate-limits to ~4 emails/hour
and password resets silently fail for real users.

### 2e. Edge Function secrets

Dashboard → Edge Functions → Secrets (or `supabase secrets set`):

| Secret | Effect | Required |
|---|---|---|
| `DEMO_MODE` = `true` | LLM endpoint returns canned agent responses | **Pick one** |
| `LLM_PROVIDER` = `gemini` + `LLM_API_KEY` (+ optional `LLM_MODEL`) | Real Gemini calls (default model: `gemini-3.6-flash`) | ⤷ |
| `ELEVENLABS_API_KEY` (+ optional `_VOICE_ID`, `_MODEL_ID`) | Real TTS voice; unset → browser SpeechSynthesis fallback | optional |
| `BREVO_API_KEY` + `BREVO_SENDER` (+ optional `BREVO_SENDER_NAME`) | Reserved for the maintained but currently unused `notify` function | optional / inactive |
| `SUPABASE_*` | Auto-provided to functions — never set manually | — |

Without `DEMO_MODE`/`LLM_*`, every AI feature shows its honest inert state —
that's deliberate, not a bug.

---

## 3. Post-deploy verification checklist

1. **Site loads** — `https://fumana-app.vercel.app` shows the landing page.
   (Vercel's own "404 NOT_FOUND" page = build/output misconfigured, go back to §1.)
2. **Auth works** — sign up with a real email → lands in the flow without a
   confirmation step (while 2b is off). Sign out, sign back in.
3. **Backend writes** — complete an assessment, refresh the page → the profile
   persists (Supabase → Table Editor → `builders` has the row).
4. **AI posture** — if `DEMO_MODE`/`LLM_*` set, interview/copilot features
   respond; if not, they show "waiting for backend" — both are correct.
5. **Password reset** — only testable after 2d; request → email arrives →
   link opens the in-app set-password screen (needs 2a Site URL correct).
6. **Admin console** — sign in as the admin account → role-select page shows
   an "Admin console" card → review queue loads.

---

## 4. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Vercel `404 NOT_FOUND` | Deployed before `vercel.json`, or Root Directory override wrong | §1 — check latest deployment commit, clear overrides, redeploy |
| Blank page, assets 404 | `base` path wrong | `vite.config.js` sets `/` outside GitHub Actions — rebuild without `GITHUB_ACTIONS` env |
| `Failed to fetch` on signup (browser) | Ad-blocker/extension or VPN killing the POST to `/auth/v1/signup` | Incognito mode, no extensions, different network — the endpoint itself is verified working |
| 401s on `/rest/v1/builders`, `/rest/v1/matches` | **Expected** — anon reads are denied by design (identity shield) | Nothing |
| Signup works but no confirmation email | Confirm-email off (2b), or SMTP not configured (2d) | Enable confirmation / set Supabase SMTP |
| Reset link lands on wrong site | Site URL stale | §2a |
| AI features show waiting state | No `DEMO_MODE`/`LLM_*` secrets | §2e — intended inert behavior |
| "Lifecycle notification email never arrived" | Lifecycle email calls are disabled in the app | Expected; the Brevo-backed `notify` function is maintained but unused |

---

## 5. Known roadmap gaps (not bugs)

- **Premium billing is a sandbox form** — awaiting a payment-provider
  decision (Paystack / Flutterwave / Stripe). No real charges occur.
- **Escrow/payouts are display-only** — same dependency.
- **WhatsApp/SMS notification channels are roadmap** — email works via Brevo
  once §2e is configured.

## 6. Deployments in flight

- `fumana-app.vercel.app` — this Vercel deployment (production)
- `find-services.github.io/Fumana` — GitHub Pages from the FIND org repo
  (workflow in `.github/workflows/deploy-pages.yml`, demo mode unless repo
  Variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set)
- `KachiAlex/fumana` — staging mirror pushed alongside the org repo

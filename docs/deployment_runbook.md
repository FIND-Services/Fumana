# Fumana — Deployment Runbook

How to take the repo from import to a working production deployment on Vercel
(`fumana-app.vercel.app`), with every Supabase-side setting that is not in code.
Checklist format — each step says what "done" looks like.

---

## 0. Architecture at a glance

| Piece | Where it lives | Notes |
|---|---|---|
| Frontend | `app/` — React + Vite SPA, builds to `app/dist` | All routes are client-side; no SSR |
| Database + Auth | Supabase project `lvozhbnpvwsvjsdnebsl` | Postgres + RLS + GoTrue |
| Edge functions | `app/supabase/functions/` | `llm-proxy`, `tts`, `verify-domain`, `notify` — already deployed |
| Storage | `builder-media` bucket (private) | Pitch videos + CV uploads |

The app has **two postures** chosen entirely by env vars:

- **Demo mode** — no `VITE_SUPABASE_*` set → in-memory state, facade auth,
  everything works offline. Good for a quick preview.
- **Backend mode** — `VITE_SUPABASE_*` set → real auth, persistence, RLS.

---

## 1. Vercel project setup

Import the GitHub repo. A `vercel.json` at the repo root already encodes
everything, so defaults work:

```json
{
  "installCommand": "cd app && npm install",
  "buildCommand": "cd app && npm run build",
  "outputDirectory": "app/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Alternative** (either/or — don't do both): set **Root Directory = `app`** in
Settings → General and leave all overrides empty. If you use this path, do NOT
copy the commands above into the override fields — `cd app` would run inside
`app/` and fail.

The catch-all rewrite is required — it routes every path to `index.html` so
the SPA handles routing (including password-reset links).

### Environment variables (Vercel → Settings → Environment Variables)

| Name | Value | Where to get it |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://lvozhbnpvwsvjsdnebsl.supabase.co` | Supabase dashboard → Project Settings → API Keys |
| `VITE_SUPABASE_ANON_KEY` | the **Publishable** key (`sb_publishable_...`) or `anon` `public` JWT | same page |

Use the **anon/publishable** key — never `service_role`/secret. The anon key
is designed to ship to browsers; RLS is what guards the data. Also in
`app/.env` locally if you have repo access.

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
| Redirect URLs (allow-list) | `https://fumana-app.vercel.app/**`, `http://localhost:5173/**` |

Without this, signup-confirmation and password-reset emails land users on a
stale host and look broken.

### 2b. Email confirmation

Authentication → Sign In / Providers → Email:

- **"Confirm email" OFF** — while no verified sending domain exists. Signups
  get instant sessions.
- **"Confirm email" ON** — later, once custom SMTP (2c) and a verified sender
  domain are configured.
- **Leaked-password protection ON** — same page. Checks passwords against
  HaveIBeenPwned; should always be enabled in production.

### 2c. Custom SMTP (Brevo) — needed for password resets + confirmations

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

### 2d. Edge Function secrets

Dashboard → Edge Functions → Secrets (or `supabase secrets set`):

| Secret | Effect | Required |
|---|---|---|
| `DEMO_MODE` = `true` | LLM endpoint returns canned agent responses | **Pick one** |
| `LLM_PROVIDER` + `LLM_API_KEY` (+ optional `LLM_MODEL`) | Real model calls (`anthropic` → claude-sonnet-4-6, `openai` → gpt-4o-mini) | ⤷ |
| `ELEVENLABS_API_KEY` (+ optional `_VOICE_ID`, `_MODEL_ID`) | Real TTS voice; unset → browser SpeechSynthesis fallback | optional |
| `BREVO_API_KEY` + `BREVO_SENDER` (+ optional `BREVO_SENDER_NAME`) | Activates the `notify` function — lifecycle emails (interview requested, SOW sent/accepted/declined, engagement closed) | optional |
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
5. **Password reset** — only testable after 2c; request → email arrives →
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
| Signup works but no confirmation email | Confirm-email off (2b), or SMTP not configured (2c) | Intended / set Brevo SMTP |
| Reset link lands on wrong site | Site URL stale | §2a |
| AI features show waiting state | No `DEMO_MODE`/`LLM_*` secrets | §2d — intended inert behavior |
| "Notification email never arrived" | `BREVO_API_KEY` unset | §2d — function returns `{sent:false}` honestly |

---

## 5. Known roadmap gaps (not bugs)

- **Premium billing is a sandbox form** — awaiting a payment-provider
  decision (Paystack / Flutterwave / Stripe). No real charges occur.
- **Escrow/payouts are display-only** — same dependency.
- **WhatsApp/SMS notification channels are roadmap** — email works via Brevo
  once §2d is configured.

## 6. Deployments in flight

- `fumana-app.vercel.app` — this Vercel deployment (production)
- `find-services.github.io/Fumana` — GitHub Pages from the FIND org repo
  (workflow in `.github/workflows/deploy-pages.yml`, demo mode unless repo
  Variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set)
- `KachiAlex/fumana` — staging mirror pushed alongside the org repo

# Fumana
 
Fumana is a talent and remote-work platform that matches independent professionals ("builders") with employers. Zuri guides assessments, interviews, and career development. Telos handles scoring, evidence, compliance narration, and impact reasoning. Matching and financial figures are computed in code rather than invented by an AI model.

This root README is the single setup and deployment guide for the repository. 

## Repository structure

| Path                                           | Purpose                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `src/`                                         | React application screens, data access, and user flows                 |
| `public/`                                      | Static browser assets                                                  |
| `server/`                                      | Local-development LLM and TTS middleware                               |
| `package.json` and build configs               | Root frontend package and tool configuration                           |
| `supabase/`                                    | Database migrations, Edge Functions, and Supabase configuration        |
| `supabase/functions/_shared/demo-responses.js` | Canonical prepared AI responses used by demo mode locally and remotely |
| `docs/`                                        | Product, architecture, schema, and deployment documentation            |
| `agents/`                                      | Zuri voice and agent specifications                                    |
| `prototype/`                                   | Superseded prototypes kept only for reference                          |
| `.env.local`                                   | Local environment values and secrets; ignored by Git                   |
| `.env.example`                                 | Safe configuration template                                            |
| `.env.demo`                                    | Safe demo-mode template                                                |
| `vercel.json`                                  | Vercel build and SPA routing configuration                             |

The current application lives in `src/`. Files under `prototype/` are not production source code.

## Getting started

Prerequisites: a recent Node.js LTS release and npm.

Run these commands from the directory that contains the `Fumana` repository:

```bash
cd Fumana
cp .env.demo .env.local
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
npm install
npm run dev
```

PowerShell equivalent:

```powershell
Set-Location Fumana
Copy-Item .env.demo .env.local
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
npm.cmd install
npm.cmd run dev
```

Vite normally opens `http://localhost:5173/` and reloads when application files change.

The frontend, its build configuration, and its environment files all live at the repository root. Do not create a second package or environment file under an `app/` directory.

## Configuration file locations

Use ownership, not file extension, to decide where a file belongs:

- Repository-wide files belong in `/Fumana`: the frontend package, main `README.md`, Git settings, environment files, Vercel and GitHub configuration, product documentation, and the complete `supabase/` backend.
- Frontend source lives directly under `/Fumana/src`; static files use `/Fumana/public`; local development middleware uses `/Fumana/server`.
- A `.json` or `.js` extension does not automatically make a file root-level. Keep it beside the package or feature that owns and imports it.

Fumana now has one frontend package boundary at the repository root. npm, Vite, TypeScript, Tailwind, PostCSS, and lint commands all run from `/Fumana`.

## Environment modes

### Demo AI

```env
DEMO_MODE=true
```

Demo mode does not call Gemini. It returns prepared responses from:

```text
supabase/functions/_shared/demo-responses.js
```

The local Vite proxy and deployed Supabase function import this same file, so demo behavior stays consistent. Update that one file when changing demo interview questions, scoring, CV output, negotiation guidance, SOW output, economics narration, or copilot answers.

Demo mode only replaces AI responses. Supabase values are still required for
signup and sign-in; the app no longer accepts pretend credentials.

### Real Gemini AI

Start from the real configuration template:

```bash
cp .env.example .env.local
```

Then configure:

```env
DEMO_MODE=false
LLM_PROVIDER=gemini
LLM_API_KEY=<your Gemini API key>
LLM_MODEL=gemini-3.6-flash
```

Gemini keys are server-side secrets. Never add a `VITE_` prefix to them.

### Supabase backend

The browser switches from in-memory demo storage to real authentication and persistence when both values are present:

```env
VITE_SUPABASE_URL=https://lvozhbnpvwsvjsdnebsl.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase publishable key>
```

The publishable key is designed for browser use. Row-level security protects private data. Never expose the Supabase service-role key.

With Supabase enabled:

- Email signup, email confirmation, password sign-in, Google sign-in, password
  recovery, and sessions use Supabase Auth.
- Application records use Supabase Postgres with row-level security.
- AI calls use the `llm-proxy` Edge Function.
- Voice calls use the `tts` Edge Function.
- Contact form delivery uses the Resend-backed `contact` Edge Function.
- Employer verification uses the `verify-domain` Edge Function.
- The Brevo-backed `notify` function remains in the repository but the application does not call it.

Server-side Edge Function values must also be saved under Supabase Edge Function Secrets. A local `.env.local` file does not automatically configure hosted functions.

### Supabase authentication dashboard settings

Under Authentication → URL Configuration, save:

```text
Site URL: https://fumana-app.vercel.app
Redirect URLs:
https://fumana-app.vercel.app/**
http://localhost:5173/**
http://127.0.0.1:5173/**
```

The application sends Google OAuth and confirmation links to `/auth/callback`.
Password reset emails redirect to `/update-password`. The wildcard entries
above permit both routes.

Under Authentication → Sign In / Providers:

- Keep Email enabled with Confirm email turned on.
- Keep Google enabled. The Google Cloud authorized redirect URI is
  `https://lvozhbnpvwsvjsdnebsl.supabase.co/auth/v1/callback`.
- Store the Google client secret only in Supabase, never in `.env.local` or
  Vercel browser variables.

## Supabase development

The linked Supabase project is `lvozhbnpvwsvjsdnebsl`.

Run Supabase CLI commands from the repository root because `supabase/config.toml` now lives there:

```bash
supabase migration list --linked
supabase db push --linked --dry-run
supabase functions deploy llm-proxy --project-ref lvozhbnpvwsvjsdnebsl --use-api
```

Always run a dry run and review pending SQL before pushing production database migrations.

The deployed functions are:

- `llm-proxy`
- `tts`
- `verify-domain`
- `notify` (maintained but currently unused by the app)
- `contact`

## Application scripts

Run from the repository root:

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
npm run lint
```

## Deployment

The repository-root `vercel.json` installs and builds the root package, publishes `dist`, and rewrites all routes to `index.html` for the SPA.

For Vercel, keep the project Root Directory at the repository root and let `vercel.json` supply the commands.

Production Vercel variables:

```env
VITE_SUPABASE_URL=https://lvozhbnpvwsvjsdnebsl.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase publishable key>
VITE_POSTHOG_PROJECT_TOKEN=<PostHog project token>
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

Keep `RESEND_API_KEY` server-side only: save it in `.env.local` for local
development and in Supabase Edge Function Secrets for the hosted contact form.
Never add a `VITE_` prefix to it and do not save it in Vercel.

See `docs/deployment_runbook.md` for the complete dashboard and verification checklist.

## Important product rules

- Financial and impact figures are computed from visible inputs, never generated by the model.
- Model output may explain evidence but must not invent facts, rates, qualifications, or experience.
- Builder identity stays shielded until the defined employer commitment stage.
- The current match score is a labelled application heuristic; the planned Bayesian CCM engine is not yet implemented.

## Key files

- `src/App.jsx` — main SPA and application portals
- `src/marketing.tsx` — landing, authentication, and password recovery UI
- `src/lib/backend.ts` — Supabase client and Edge Function routing
- `src/lib/store.js` — persistence boundary
- `server/claude-endpoint.js` — local Gemini/demo proxy (legacy filename)
- `supabase/functions/llm-proxy/index.ts` — deployed Gemini/demo proxy
- `supabase/functions/_shared/demo-responses.js` — canonical demo responses
- `docs/deployment_runbook.md` — production deployment guide

## Issues

- **Open — hosted deployment:** `https://fumana-app.vercel.app/` currently
  returns Vercel `404 NOT_FOUND`. Redeploy the root project after committing
  this restructure and confirm the domain is attached to the deployment.
- **Open — AI/TTS credit protection:** the deployed `llm-proxy` and `tts`
  functions accept the public Supabase publishable key. Require a real signed-in
  user and add rate limiting before treating the provider credits as protected.
- **Resolved — returning-user routing:** existing builders and employers are
  rehydrated after authentication and sent directly to their saved dashboard.
- **Open — Premium payment:** the Premium modal is explicitly a sandbox and can
  mark a user Premium without processing a real payment. Do not treat it as a
  production subscription flow.
- **Open — notification function:** the unused Brevo `notify` Edge Function has
  TypeScript relationship-shape errors and must be corrected before activation.
- **Open — development dependencies:** `npm audit` reports 12 vulnerabilities
  in build-time packages. Production dependencies currently report zero known
  vulnerabilities; upgrade the toolchain carefully because the complete fix
  includes breaking Tailwind changes.

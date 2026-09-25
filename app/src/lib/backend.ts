// Supabase client and backend wiring.
//
// Two postures, chosen entirely by env:
//   * VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set -> real persistence, real
//     auth, and the model/TTS calls hit Supabase Edge Functions.
//   * unset -> the app runs exactly as it did before: in-memory stores, facade
//     auth, and /api/* Vite middleware (demo mode friendly, no config needed).
//
// The anon key is safe to ship to the browser by design; row-level security on
// the database is what guards the data. Provider keys never live here — they
// are secrets on the edge functions (or the Vite dev middleware), same rule as
// docs/api_integration_notes.md.

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const hasBackend = Boolean(url && anonKey);
export const supabase: SupabaseClient | null = hasBackend ? createClient(url, anonKey) : null;

// Where model and TTS calls go. With Supabase configured the edge functions
// serve them; otherwise the dev/preview middleware does.
export const LLM_URL = hasBackend ? `${url}/functions/v1/llm-proxy` : "/api/claude";
export const TTS_URL = hasBackend ? `${url}/functions/v1/tts` : "/api/tts";

// Edge functions are protected by the anon key (standard Supabase invoke
// headers). When the caller is signed in we send their JWT instead, so the
// function can attribute the call (agent_runs audit logging) — verify_jwt
// accepts user access tokens too. The dev middleware path needs no auth.
export async function apiHeaders(): Promise<Record<string, string>> {
  const base: Record<string, string> = { "Content-Type": "application/json" };
  if (!supabase) return base;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || anonKey;
  return { ...base, apikey: anonKey, Authorization: `Bearer ${token}` };
}

// Current signed-in user, or null (signed out, or no backend configured).
export async function currentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

// Real logout: clears the persisted session token. No-op without a backend.
export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// Sends a password-reset email. Silent success either way so the form does
// not leak whether an account exists.
export async function resetPassword(email: string): Promise<void> {
  if (!supabase || !email) return;
  await supabase.auth.resetPasswordForEmail(email);
}

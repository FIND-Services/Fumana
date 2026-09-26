import { useState } from 'react';
import {
  BrainCircuit, LineChart, Shield, Calculator, BookOpen, Briefcase,
  Search, ArrowRight, ArrowUpRight, Check, AlertTriangle, BadgeCheck, ArrowLeft,
} from 'lucide-react';
import { supabase, hasBackend } from './lib/backend';

// Fumana marketing entry point: landing -> role selection -> auth form.
// Tailwind-styled and kept separate from the inline-styled app shell.
// Auth is email + password only; no OAuth providers are enabled.

// --- AUTHENTICATION FORM VIEW ---
export function AuthFormPage({ role, onBack, onAuthenticated }: { role: string; onBack: () => void; onAuthenticated: () => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Second factor: set when sign-in succeeds at aal1 but the account has a
  // verified TOTP factor (aal2 required).
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  // With no backend configured the form falls through to onAuthenticated,
  // preserving the prototype's facade auth. With Supabase set these are real.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { onAuthenticated(); return; }
    setBusy(true); setError('');
    const res = isSignUp
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (res.error) { setError(res.error.message); return; }
    if (isSignUp && !res.data.session) {
      setError('Account created. Check your email to confirm it, then sign in.');
      setIsSignUp(false);
      return;
    }
    // If the account has a verified TOTP factor, the session is at aal1 and
    // needs a second-factor challenge before it counts.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
      const { data: f } = await supabase.auth.mfa.listFactors();
      const totp = (f?.totp || []).find((x: { status: string }) => x.status === 'verified');
      if (totp) { setMfaFactorId(totp.id); setNotice('Enter the 6-digit code from your authenticator app.'); return; }
    }
    onAuthenticated();
  }

  async function submitMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !mfaFactorId) return;
    setBusy(true); setError('');
    const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
    const vErr = cErr ? cErr : (await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: ch!.id, code: mfaCode })).error;
    setBusy(false);
    if (vErr) { setError(vErr.message); setMfaCode(''); return; }
    onAuthenticated();
  }

  // Password reset. Silent success regardless of outcome so the form does not
  // leak whether an account exists for the address.
  async function forgot() {
    if (!supabase) { setNotice('Password reset needs a configured backend.'); return; }
    if (!email) { setError('Enter your email address first.'); return; }
    setBusy(true); setError(''); setNotice('');
    await supabase.auth.resetPasswordForEmail(email);
    setBusy(false);
    setNotice('If that email has an account, a reset link is on its way.');
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F4F7]">
      {/* Top Bar */}
      <div className="p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#5E6E7A] hover:text-[#0C1A26] transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-[#FFFFFF] border border-[#D7DEE3] w-full max-w-md shadow-sm">
          {/* Header */}
          <div className="p-8 border-b border-[#D7DEE3] text-center">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <div className="w-4 h-4 bg-[#0C1A26]"></div>
              <span className="font-semibold text-xl tracking-tight text-[#0C1A26]">FUMANA</span>
            </div>
            <h2 className="text-2xl font-semibold text-[#0C1A26] mb-2">
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase">
              {role === 'builder' ? 'Builder Node Access' : 'Enterprise Gateway'}
            </p>
          </div>

          {/* Form Content */}
          <div className="p-8 space-y-6">

            {mfaFactorId ? (
              <form className="space-y-4" onSubmit={submitMfa}>
                <div className="space-y-1">
                  <label className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase">Authenticator code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    autoFocus
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D7DEE3] p-3 text-[#0C1A26] focus:border-[#066E5A] outline-none transition-colors tracking-[0.4em] text-center"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
                {error && <p className="font-['IBM_Plex_Mono',monospace] text-xs text-[#A03020] leading-relaxed">{error}</p>}
                {notice && <p className="font-['IBM_Plex_Mono',monospace] text-xs text-[#066E5A] leading-relaxed">{notice}</p>}
                <button type="submit" disabled={busy} className="w-full bg-[#066E5A] text-[#F4F7F8] p-3 font-medium hover:bg-[#05564A] transition-colors mt-2 disabled:opacity-60">
                  {busy ? 'Verifying…' : 'Verify'}
                </button>
              </form>
            ) : (<>

            {/* Email Form */}
            <form className="space-y-4" onSubmit={submit}>
              {isSignUp && (
                <div className="space-y-1">
                  <label className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D7DEE3] p-3 text-[#0C1A26] focus:border-[#066E5A] outline-none transition-colors"
                    placeholder="Amara K."
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#D7DEE3] p-3 text-[#0C1A26] focus:border-[#066E5A] outline-none transition-colors"
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase">Password</label>
                  {!isSignUp && (
                    <button type="button" onClick={forgot} className="font-['IBM_Plex_Mono',monospace] text-xs text-[#066E5A] hover:underline">Forgot?</button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#D7DEE3] p-3 text-[#0C1A26] focus:border-[#066E5A] outline-none transition-colors"
                  placeholder="********"
                />
              </div>

              {error && (
                <p className="font-['IBM_Plex_Mono',monospace] text-xs text-[#A03020] leading-relaxed">{error}</p>
              )}
              {notice && (
                <p className="font-['IBM_Plex_Mono',monospace] text-xs text-[#066E5A] leading-relaxed">{notice}</p>
              )}

              <button type="submit" disabled={busy} className="w-full bg-[#066E5A] text-[#F4F7F8] p-3 font-medium hover:bg-[#05564A] transition-colors mt-2 disabled:opacity-60">
                {busy ? 'Working…' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            {/* Honesty note: facade in demo mode, real Supabase Auth once configured */}
            <p className="font-['IBM_Plex_Mono',monospace] text-[10px] text-[#5E6E7A] leading-relaxed text-center">
              {hasBackend
                ? 'Authenticated by Supabase — email and password.'
                : 'No backend configured — this form is a UI demo and accepts any credentials.'}
            </p>

            <div className="text-center pt-2">
              <p className="text-sm text-[#5E6E7A]">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="ml-2 font-medium text-[#066E5A] hover:underline"
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            </div>
            </>)}

          </div>
        </div>
      </div>
      <footer className="p-4 text-center font-['IBM_Plex_Mono',monospace] text-[11px] text-[#5E6E7A]">
        &copy; FIND Services Limited. Powered by Telos. Designed by Lexington Advisory Group.
      </footer>
    </div>
  );
}

// --- PASSWORD RESET LANDING ---
// Supabase recovery links land back on the app with a recovery session. This
// screen collects the new password and calls updateUser against it.
export function ResetPasswordPage({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { setError('Use at least 8 characters.'); return; }
    if (pw !== pw2) { setError('Passwords do not match.'); return; }
    if (!supabase) { setError('Password reset needs a configured backend.'); return; }
    setBusy(true); setError('');
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setDone(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F4F7]">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-[#FFFFFF] border border-[#D7DEE3] w-full max-w-md shadow-sm">
          <div className="p-8 border-b border-[#D7DEE3] text-center">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <div className="w-4 h-4 bg-[#0C1A26]"></div>
              <span className="font-semibold text-xl tracking-tight text-[#0C1A26]">FUMANA</span>
            </div>
            <h2 className="text-2xl font-semibold text-[#0C1A26] mb-2">
              {done ? 'Password updated' : 'Set a new password'}
            </h2>
          </div>
          <div className="p-8 space-y-6">
            {done ? (
              <>
                <p className="text-sm text-[#5E6E7A]">Your password has been changed. Sign in with the new password.</p>
                <button onClick={onDone} className="w-full bg-[#066E5A] text-[#F4F7F8] p-3 font-medium hover:bg-[#05564A] transition-colors">
                  Continue to sign in
                </button>
              </>
            ) : (
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-1">
                  <label className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase">New Password</label>
                  <input
                    type="password"
                    required
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D7DEE3] p-3 text-[#0C1A26] focus:border-[#066E5A] outline-none transition-colors"
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#D7DEE3] p-3 text-[#0C1A26] focus:border-[#066E5A] outline-none transition-colors"
                    placeholder="Repeat it"
                  />
                </div>
                {error && (
                  <p className="font-['IBM_Plex_Mono',monospace] text-xs text-[#A03020] leading-relaxed">{error}</p>
                )}
                <button type="submit" disabled={busy} className="w-full bg-[#066E5A] text-[#F4F7F8] p-3 font-medium hover:bg-[#05564A] transition-colors mt-2 disabled:opacity-60">
                  {busy ? 'Working…' : 'Update password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <footer className="p-4 text-center font-['IBM_Plex_Mono',monospace] text-[11px] text-[#5E6E7A]">
        &copy; FIND Services Limited. Powered by Telos. Designed by Lexington Advisory Group.
      </footer>
    </div>
  );
}

// --- ROLE SELECTION VIEW ---
export function RoleSelectionPage({ onRoleSelect, onBack, isAdmin }: { onRoleSelect: (role: string) => void; onBack: () => void; isAdmin?: boolean }) {
  return (
    <div className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center p-6">

      {/* Absolute positioned back button */}
      <div className="absolute top-6 left-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#5E6E7A] hover:text-[#0C1A26] transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} /> Back to main site
        </button>
      </div>

      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="mb-10 space-y-4">
          <h1 className="text-[40px] font-bold text-[#0C1A26] tracking-widest uppercase">FUMANA</h1>
          <p className="text-[#5E6E7A] text-[20px] max-w-[700px] leading-relaxed">
            The talent clearing house for African engineering. One network: builders prove their worth on one side, enterprises hire it on the other, and the impact is settled in the open.
          </p>
        </div>

        {/* Dual Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">

          {/* Builder Card */}
          <div className="bg-[#FFFFFF] p-10 rounded-xl border border-[#D7DEE3] hover:border-[#C2CCD4] transition-colors shadow-sm flex flex-col items-start">
            <div className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase tracking-wider mb-4">
              I am a builder
            </div>
            <h2 className="text-2xl font-bold text-[#0C1A26] mb-4">
              Build a profile employers trust
            </h2>
            <p className="text-[#5E6E7A] leading-relaxed mb-8 flex-1">
              Sign in, take the AI interview, and join the network with your identity shielded until you choose to reveal it.
            </p>
            <button
              onClick={() => onRoleSelect('builder')}
              className="bg-[#066E5A] text-[#F4F7F8] px-6 py-3 rounded font-medium hover:bg-[#05564A] transition-colors"
            >
              Enter as a builder
            </button>
          </div>

          {/* Employer Card */}
          <div className="bg-[#FFFFFF] p-10 rounded-xl border border-[#D7DEE3] hover:border-[#C2CCD4] transition-colors shadow-sm flex flex-col items-start">
            <div className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase tracking-wider mb-4">
              I am an employer
            </div>
            <h2 className="text-2xl font-bold text-[#0C1A26] mb-4">
              Hire verified talent
            </h2>
            <p className="text-[#5E6E7A] leading-relaxed mb-8 flex-1">
              Search by evidence, see bias-shielded matches, sign an SOW with liability carried for you, and see where every dollar goes.
            </p>
            <button
              onClick={() => onRoleSelect('employer')}
              className="bg-[#066E5A] text-[#F4F7F8] px-6 py-3 rounded font-medium hover:bg-[#05564A] transition-colors"
            >
              Enter as an employer
            </button>
          </div>
        </div>

        {/* Admin entry — only rendered when the signed-in account carries the
            server-set app_metadata admin claim */}
        {isAdmin && (
          <div className="bg-[#0C1A26] p-8 rounded-xl mb-12 flex items-center justify-between">
            <div>
              <div className="font-['IBM_Plex_Mono',monospace] text-xs text-[#9AB0BC] uppercase tracking-wider mb-2">Administrator</div>
              <p className="text-[#D7DEE3] text-sm">Open the review queue and resolve contests, human-review requests, and reports.</p>
            </div>
            <button
              onClick={() => onRoleSelect('admin')}
              className="bg-[#066E5A] text-[#F4F7F8] px-6 py-3 rounded font-medium hover:bg-[#05564A] transition-colors whitespace-nowrap ml-6"
            >
              Admin console
            </button>
          </div>
        )}

        {/* Footnotes */}
        <div className="space-y-6">
          <p className="font-['IBM_Plex_Mono',monospace] text-[13px] text-[#5E6E7A]">
            Tip: build a profile first, then enter as an employer and search. You will find yourself in the results.
          </p>
          <p className="font-['IBM_Plex_Mono',monospace] text-[13px] text-[#5E6E7A]">
            &copy; FIND Services Limited. Powered by Telos. Designed by Lexington Advisory Group.
          </p>
        </div>

      </div>
    </div>
  );
}

// --- LANDING PAGE ---
export function LandingPage({ onSignInClick }: { onSignInClick: () => void }) {
  return (
    <>
      <nav className="fixed w-full z-50 bg-[#FFFFFF] border-b border-[#D7DEE3]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-[#0C1A26]"></div>
              <span className="font-semibold text-lg tracking-tight text-[#0C1A26]">FUMANA</span>
            </div>
            <div className="hidden md:flex space-x-6">
              <a href="#assessment" className="text-[#5E6E7A] hover:text-[#0C1A26] text-sm transition-colors">Assessment</a>
              <a href="#matching" className="text-[#5E6E7A] hover:text-[#0C1A26] text-sm transition-colors">Matching</a>
              <a href="#upskilling" className="text-[#5E6E7A] hover:text-[#0C1A26] text-sm transition-colors">Upskilling</a>
              <a href="#roi" className="text-[#5E6E7A] hover:text-[#0C1A26] text-sm transition-colors">Employer ROI</a>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Search size={16} className="text-[#5E6E7A] hover:text-[#0C1A26] cursor-pointer" />
            <button
              onClick={onSignInClick}
              className="px-4 py-2 bg-[#E3E8EB] text-[#0C1A26] hover:bg-[#D7DEE3] transition-colors text-sm font-medium"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-24 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 border-b border-[#D7DEE3]">
        <div className="lg:w-1/2 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-[#FFFFFF] border border-[#D7DEE3]">
            <div className="w-2 h-2 bg-[#0C1A26]"></div>
            <span className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase tracking-wide">
              System Live &bull; V2.4
            </span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-semibold text-[#0C1A26] leading-[1.05] tracking-tight">
            African talent.<br />
            Global scale.
          </h1>

          <p className="text-lg text-[#5E6E7A] max-w-xl leading-relaxed">
            Systematically connecting verified African engineers to global enterprise requirements through Telos assessment, verified upskilling, and bidirectional matching.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={onSignInClick}
              className="flex items-center justify-center space-x-2 bg-[#066E5A] text-[#F4F7F8] px-6 py-3 font-medium hover:bg-[#05564A] transition-colors"
            >
              <span>Initialize Placement</span>
              <ArrowRight size={18} />
            </button>
            <button className="flex items-center justify-center space-x-2 bg-[#FFFFFF] border border-[#D7DEE3] text-[#0C1A26] px-6 py-3 font-medium hover:bg-[#E3E8EB] transition-colors">
              <span>View Technical Docs</span>
            </button>
          </div>
        </div>

        {/* Hero Visual - Strict Data Dashboard */}
        <div className="lg:w-1/2 w-full">
          <div className="bg-[#FFFFFF] border border-[#D7DEE3] flex flex-col">

            {/* Header Data */}
            <div className="bg-[#E3E8EB] h-10 flex items-center px-4 border-b border-[#D7DEE3] justify-between">
              <span className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase tracking-wider">
                ID: Match_Engine_Active
              </span>
              <span className="font-['IBM_Plex_Mono',monospace] text-xs text-[#0C1A26]">
                REQ: 8992-REACT
              </span>
            </div>

            <div className="flex flex-1 min-h-[360px]">
              {/* Sidebar Roster */}
              <div className="w-1/3 bg-[#F2F4F7] border-r border-[#D7DEE3] p-4">
                <div className="font-['IBM_Plex_Mono',monospace] text-[10px] text-[#5E6E7A] uppercase tracking-wider mb-4 border-b border-[#D7DEE3] pb-2">
                  Pool Pipeline
                </div>
                <div className="space-y-2">
                  <div className="bg-[#FFFFFF] border border-[#0C1A26] p-3 cursor-pointer">
                    <div className="text-sm font-semibold text-[#0C1A26]">Amara K.</div>
                    <div className="font-['IBM_Plex_Mono',monospace] text-xs text-[#0C1A26] mt-1">94% MATCH</div>
                  </div>
                  <div className="p-3 cursor-pointer hover:bg-[#E3E8EB] transition-colors border border-transparent">
                    <div className="text-sm font-medium text-[#5E6E7A]">James A.</div>
                    <div className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] mt-1">89% MATCH</div>
                  </div>
                </div>
              </div>

              {/* Main Profile Data */}
              <div className="w-2/3 p-6 bg-[#FFFFFF]">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xl font-semibold text-[#0C1A26]">Amara K.</h3>
                    <p className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] mt-1 uppercase">LOC: LOS-NGA</p>
                  </div>
                  <div className="px-2 py-1 border border-[#B08A2E] flex items-center gap-1.5">
                    <BadgeCheck size={14} className="text-[#B08A2E]" />
                    <span className="font-['IBM_Plex_Mono',monospace] text-[10px] font-bold text-[#B08A2E] uppercase">Tier: Top 1%</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between font-['IBM_Plex_Mono',monospace] text-xs mb-2">
                      <span className="text-[#5E6E7A] uppercase">Intl. Readiness (30% WT)</span>
                      <span className="text-[#0C1A26] font-semibold">96/100</span>
                    </div>
                    <div className="w-full bg-[#E3E8EB] h-1"><div className="bg-[#0C1A26] h-1" style={{ width: '96%' }}></div></div>
                  </div>

                  <div>
                    <div className="flex justify-between font-['IBM_Plex_Mono',monospace] text-xs mb-2">
                      <span className="text-[#5E6E7A] uppercase">Skills Match (25% WT)</span>
                      <span className="text-[#0C1A26] font-semibold">92/100</span>
                    </div>
                    <div className="w-full bg-[#E3E8EB] h-1"><div className="bg-[#0C1A26] h-1" style={{ width: '92%' }}></div></div>
                  </div>

                  <div>
                    <div className="flex justify-between font-['IBM_Plex_Mono',monospace] text-xs mb-2">
                      <span className="text-[#5E6E7A] uppercase">Growth Potential (20% WT)</span>
                      <span className="text-[#0C1A26] font-semibold">98/100</span>
                    </div>
                    <div className="w-full bg-[#E3E8EB] h-1"><div className="bg-[#0C1A26] h-1" style={{ width: '98%' }}></div></div>
                  </div>
                </div>

                <div className="mt-10 flex justify-between items-center border-t border-[#D7DEE3] pt-4">
                  <div className="font-['IBM_Plex_Mono',monospace] text-xs">
                    <span className="text-[#5E6E7A]">EXP_SALARY:</span> <span className="font-semibold text-[#0C1A26]">$40K-$50K</span>
                  </div>
                  <button className="bg-[#E3E8EB] text-[#0C1A26] px-4 py-2 text-sm font-medium hover:bg-[#D7DEE3] transition-colors flex items-center gap-2">
                    Action: Review <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ROI Calculator Section */}
      <section className="py-24 bg-[#0C1A26] text-[#EEF3F8]" id="roi">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="font-['IBM_Plex_Mono',monospace] text-xs text-[#C2CCD4] uppercase tracking-wider mb-2">
                [ Module: Arbitrage_Calc ]
              </div>
              <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#EEF3F8] leading-tight">
                Global quality. <br />
                <span className="text-[#C2CCD4] font-light">Asymmetric cost.</span>
              </h2>
              <p className="text-[#C2CCD4] text-lg leading-relaxed max-w-md pt-2">
                By bridging the purchasing power parity (PPP) gap, global employers unlock dramatic savings while offering African professionals 4x their local market salary.
              </p>

              <div className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#EEF3F8] flex items-center justify-center text-[#0C1A26]"><Check size={14} strokeWidth={3} /></div>
                  <span className="text-[#EEF3F8] font-medium text-sm">Same skill level, verified by Telos</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#EEF3F8] flex items-center justify-center text-[#0C1A26]"><Check size={14} strokeWidth={3} /></div>
                  <span className="text-[#EEF3F8] font-medium text-sm">Strong English/French (C1/C2)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#EEF3F8] flex items-center justify-center text-[#0C1A26]"><Check size={14} strokeWidth={3} /></div>
                  <span className="text-[#EEF3F8] font-medium text-sm">Excellent timezone overlap</span>
                </div>
              </div>
            </div>

            <div className="bg-[#FFFFFF] text-[#0C1A26] border border-[#D7DEE3] shadow-md">
              <div className="p-4 bg-[#E3E8EB] border-b border-[#D7DEE3] flex justify-between items-center">
                <span className="font-['IBM_Plex_Mono',monospace] text-xs font-semibold text-[#0C1A26] uppercase tracking-wider">
                  ROLE: SR_FULL_STACK
                </span>
                <Calculator size={16} className="text-[#5E6E7A]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#D7DEE3]">
                <div className="p-6 space-y-4">
                  <div className="font-['IBM_Plex_Mono',monospace] text-sm font-semibold text-[#5E6E7A] uppercase">
                    OPT_A: US-Based
                  </div>
                  <div className="space-y-3 font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A]">
                    <div className="flex justify-between"><span>Base_Salary</span> <span className="font-medium text-[#0C1A26]">$150,000</span></div>
                    <div className="flex justify-between"><span>Benefits</span> <span className="font-medium text-[#0C1A26]">$30,000</span></div>
                    <div className="flex justify-between"><span>Taxes_ER</span> <span className="font-medium text-[#0C1A26]">$15,000</span></div>
                  </div>
                  <div className="pt-4 border-t border-[#D7DEE3] flex justify-between items-center font-['IBM_Plex_Mono',monospace] font-semibold text-sm text-[#0C1A26]">
                    <span>TOTAL_A</span>
                    <span>$195,000/YR</span>
                  </div>
                </div>

                <div className="p-6 space-y-4 bg-[#F2F4F7]">
                  <div className="font-['IBM_Plex_Mono',monospace] text-sm font-semibold text-[#0C1A26] uppercase border-b border-[#D7DEE3] pb-1 inline-block">
                    OPT_B: FUMANA
                  </div>
                  <div className="space-y-3 font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A]">
                    <div className="flex justify-between"><span>Base_Salary</span> <span className="font-medium text-[#0C1A26]">$45,000</span></div>
                    <div className="flex justify-between"><span>Platform_12%</span> <span className="font-medium text-[#0C1A26]">$5,400</span></div>
                    <div className="flex justify-between"><span>Payment_Proc</span> <span className="font-medium text-[#0C1A26]">$500</span></div>
                  </div>
                  <div className="pt-4 border-t border-[#D7DEE3] flex justify-between items-center font-['IBM_Plex_Mono',monospace] font-semibold text-sm text-[#0C1A26]">
                    <span>TOTAL_B</span>
                    <span>$50,900/YR</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#066E5A] p-5 flex justify-between items-center">
                <span className="font-['IBM_Plex_Mono',monospace] font-medium text-xs text-[#F4F7F8] uppercase tracking-wide">
                  NET_SAVINGS_COMPUTED
                </span>
                <span className="font-['IBM_Plex_Mono',monospace] text-2xl font-semibold text-[#F4F7F8]">
                  $144,100/YR
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Pillars Grid System */}
      <section className="py-24 bg-[#F2F4F7] border-y border-[#D7DEE3]" id="assessment">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 max-w-2xl space-y-4">
            <h2 className="text-3xl font-semibold text-[#0C1A26]">Intelligence architecture</h2>
            <p className="text-lg text-[#5E6E7A]">
              Moving beyond basic keywords. Our system evaluates, upskills, and matches professionals utilizing four distinct structural pillars.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#FFFFFF] p-8 border border-[#D7DEE3] hover:border-[#C2CCD4] transition-colors">
              <div className="w-10 h-10 bg-[#E3E8EB] flex items-center justify-center mb-6 text-[#0C1A26]">
                <BrainCircuit size={20} />
              </div>
              <h3 className="text-xl font-semibold text-[#0C1A26] mb-3">Telos assessment</h3>
              <p className="text-[#5E6E7A] text-sm leading-relaxed mb-8">
                Standard tools fail to capture talent nuance. Telos performs zero-hallucination audits of technical history, cross-cultural competency, and remote infrastructure resilience.
              </p>

              <div className="bg-[#F2F4F7] p-4 border border-[#D7DEE3] space-y-3 font-['IBM_Plex_Mono',monospace]">
                <div className="flex justify-between text-xs items-center">
                  <span className="text-[#5E6E7A] uppercase">Resilience Index</span>
                  <span className="text-[#0C1A26] font-semibold">91/100</span>
                </div>
                <div className="flex justify-between text-xs items-center border-t border-[#D7DEE3] pt-3">
                  <span className="text-[#5E6E7A] uppercase">Infrastructure Check</span>
                  <span className="text-[#A8431F] font-semibold flex items-center gap-1"><AlertTriangle size={12} /> 42/100</span>
                </div>
              </div>
            </div>

            <div className="bg-[#FFFFFF] p-8 border border-[#D7DEE3] hover:border-[#C2CCD4] transition-colors" id="upskilling">
              <div className="w-10 h-10 bg-[#E3E8EB] flex items-center justify-center mb-6 text-[#0C1A26]">
                <BookOpen size={20} />
              </div>
              <h3 className="text-xl font-semibold text-[#0C1A26] mb-3">Integrated upskilling ecosystem</h3>
              <p className="text-[#5E6E7A] text-sm leading-relaxed mb-8">
                Identify skills gaps via LMS learning paths. Candidates earn points and increase visibility profiles, tracked via metadata tiers.
              </p>

              <div className="flex gap-2">
                <div className="flex-1 bg-[#F2F4F7] border border-[#D7DEE3] py-2 text-center">
                  <span className="font-['IBM_Plex_Mono',monospace] text-[10px] text-[#5E6E7A] uppercase">Bronze</span>
                </div>
                <div className="flex-1 bg-[#F2F4F7] border border-[#D7DEE3] py-2 text-center">
                  <span className="font-['IBM_Plex_Mono',monospace] text-[10px] text-[#0C1A26] uppercase">Silver</span>
                </div>
                <div className="flex-1 bg-[#FFFFFF] border border-[#B08A2E] py-2 text-center">
                  <span className="font-['IBM_Plex_Mono',monospace] text-[10px] text-[#B08A2E] font-bold uppercase">Gold</span>
                </div>
                <div className="flex-1 bg-[#FFFFFF] border border-[#B08A2E] py-2 text-center">
                  <span className="font-['IBM_Plex_Mono',monospace] text-[10px] text-[#B08A2E] font-bold uppercase">Top 1%</span>
                </div>
              </div>
            </div>

            <div className="bg-[#FFFFFF] p-8 border border-[#D7DEE3] hover:border-[#C2CCD4] transition-colors" id="matching">
              <div className="w-10 h-10 bg-[#E3E8EB] flex items-center justify-center mb-6 text-[#0C1A26]">
                <LineChart size={20} />
              </div>
              <h3 className="text-xl font-semibold text-[#0C1A26] mb-3">Bidirectional accountability</h3>
              <p className="text-[#5E6E7A] text-sm leading-relaxed mb-8">
                We don't just score candidates; we rate employers. Enterprise partners are assessed on their "Africa Hiring Readiness" metrics.
              </p>

              <div className="bg-[#F2F4F7] border border-[#D7DEE3] p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-[#0C1A26] flex items-center justify-center"><Briefcase size={12} className="text-[#FFFFFF]" /></div>
                  <div className="text-sm font-semibold text-[#0C1A26]">Employer: Acme Corp</div>
                </div>
                <div className="font-['IBM_Plex_Mono',monospace] text-xs">
                  <div className="flex justify-between text-[#5E6E7A] mb-1 uppercase">
                    <span>Hiring Readiness</span>
                    <span className="text-[#0C1A26] font-semibold">88/100</span>
                  </div>
                  <div className="w-full bg-[#E3E8EB] h-1"><div className="bg-[#0C1A26] h-1" style={{ width: '88%' }}></div></div>
                </div>
              </div>
            </div>

            <div className="bg-[#FFFFFF] p-8 border border-[#D7DEE3] hover:border-[#C2CCD4] transition-colors">
              <div className="w-10 h-10 bg-[#E3E8EB] flex items-center justify-center mb-6 text-[#0C1A26]">
                <Shield size={20} />
              </div>
              <h3 className="text-xl font-semibold text-[#0C1A26] mb-3">Micro-internships</h3>
              <p className="text-[#5E6E7A] text-sm leading-relaxed mb-6">
                Test talent before committing. Post 1-4 week project-based tasks. The Try Africa Talent module reduces enterprise risk.
              </p>

              <div className="bg-[#E3E8EB] border-l-4 border-[#0C1A26] p-4">
                <div className="font-['IBM_Plex_Mono',monospace] text-xs font-semibold text-[#0C1A26] uppercase mb-2">Initiative Logic:</div>
                <ul className="list-none text-sm text-[#0C1A26] space-y-2">
                  <li className="flex gap-2 items-start"><Check size={16} className="shrink-0 mt-0.5 text-[#5E6E7A]" /> First project module is 100% FREE.</li>
                  <li className="flex gap-2 items-start"><Check size={16} className="shrink-0 mt-0.5 text-[#5E6E7A]" /> Historical conversion to full-time at 40%+.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Strict Footer Section */}
      <footer className="bg-[#FFFFFF] pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-[#0C1A26]"></div>
                <span className="font-semibold text-lg text-[#0C1A26] tracking-tight">FUMANA</span>
              </div>
              <p className="text-[#5E6E7A] text-sm max-w-sm leading-relaxed">
                The Africa Talent Bridge. Connecting exceptional African technical professionals with the global remote economy through structural matching.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-[#0C1A26] mb-4 text-sm">Enterprise</h4>
              <ul className="list-none space-y-3 text-sm font-['IBM_Plex_Sans',sans-serif]">
                <li><a href="#" className="text-[#5E6E7A] hover:text-[#0C1A26] transition-colors">Post Requisition</a></li>
                <li><a href="#" className="text-[#5E6E7A] hover:text-[#0C1A26] transition-colors">Micro-internships</a></li>
                <li><a href="#" className="text-[#5E6E7A] hover:text-[#0C1A26] transition-colors">Global Solutions</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-[#0C1A26] mb-4 text-sm">Builder node</h4>
              <ul className="list-none space-y-3 text-sm font-['IBM_Plex_Sans',sans-serif]">
                <li><a href="#" className="text-[#5E6E7A] hover:text-[#0C1A26] transition-colors">Zuri Assessment</a></li>
                <li><a href="#" className="text-[#5E6E7A] hover:text-[#0C1A26] transition-colors">LMS Access</a></li>
                <li><a href="#" className="text-[#5E6E7A] hover:text-[#0C1A26] transition-colors">Tier Status</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#D7DEE3] pt-8 text-center">
            <div className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A]">
              &copy; FIND Services Limited. Powered by Telos. Designed by Lexington Advisory Group.
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

import { useEffect, useId, useState } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import thinkingPassword from './assets/thinking-password.png';
import { PASSWORD_RESET_URL, apiHeaders, supabase } from './lib/backend';
import { COMPANY_EMAIL_ERROR, isCompanyEmail } from './lib/company-email';
import {
  cardVariants,
  modalBackdropVariants,
  modalPanelVariants,
  pageVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from './motion';

type AuthTransitionPhase = 'idle' | 'loading' | 'scatter';

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 6 characters', test: (value: string) => value.length >= 6 },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
  { label: 'One symbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

const passwordMeetsPolicy = (value: string) => PASSWORD_REQUIREMENTS.every(({ test }) => test(value));
const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function PasswordRequirements({ value, id }: { value: string; id: string }) {
  return (
    <AnimatePresence initial={false}>
      {value && (
        <motion.ul
          id={id}
          aria-live="polite"
          className="auth-password-requirements m-0 mt-2 grid list-none gap-1 p-0 sm:grid-cols-2"
          variants={staggerContainerVariants}
          initial="initial"
          animate="animate"
          exit={{ opacity: 0, transition: { duration: 0.16 } }}
        >
          {PASSWORD_REQUIREMENTS.map(({ label, test }) => {
            const met = test(value);
            return (
              <motion.li
                key={label}
                variants={staggerItemVariants}
                className={`flex items-center gap-2 font-['IBM_Plex_Mono',monospace] text-[11px] leading-4 ${met ? 'text-[#066E5A]' : 'text-[#A03020]'}`}
              >
                {met ? <Check size={13} strokeWidth={2.5} aria-hidden="true" /> : <X size={13} strokeWidth={2.5} aria-hidden="true" />}
                <span>{label}</span>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </AnimatePresence>
  );
}

const cubeOffsets = [
  [-52, -42], [0, -58], [54, -38],
  [-64, 2], [8, -4], [66, 5],
  [-48, 48], [0, 64], [52, 44],
];

export function AuthLoadingTransition({ phase }: { phase: AuthTransitionPhase }) {
  return (
    <AnimatePresence>
      {phase !== 'idle' && (
        <motion.div
          className="fixed inset-0 z-[200] grid place-items-center bg-[#F2F4F7]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="status"
          aria-live="polite"
          aria-label={phase === 'loading' ? 'Signing you in' : 'Opening your dashboard'}
        >
          {phase === 'loading' ? (
            <motion.span
              className="block h-9 w-9 bg-[#0C1A26]"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.72, ease: 'linear', repeat: Infinity }}
              aria-hidden="true"
            />
          ) : (
            <div className="relative h-9 w-9" aria-hidden="true">
              {cubeOffsets.map(([x, y], index) => (
                <motion.span
                  key={index}
                  className="absolute h-2.5 w-2.5 bg-[#0C1A26]"
                  style={{ left: (index % 3) * 13, top: Math.floor(index / 3) * 13 }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x, y, opacity: 0, scale: 0.4, rotate: index % 2 ? 70 : -70 }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
            </div>
          )}
          <span className="sr-only">{phase === 'loading' ? 'Signing you in' : 'Opening your dashboard'}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const authRedirect = (path: string, role?: string) => {
  const url = new URL(path, window.location.origin);
  if (role) url.searchParams.set('role', role);
  return url.toString();
};

export function BrandHome({ centered = false }: { centered?: boolean }) {
  return (
    <a
      href="/"
      aria-label="Fumana home"
      className={`inline-flex items-center space-x-2 no-underline hover:no-underline ${centered ? 'justify-center' : ''}`}
    >
      <span className="w-4 h-4 bg-[#0C1A26]" aria-hidden="true"></span>
      <span className="font-semibold text-xl tracking-tight text-[#0C1A26]">FUMANA</span>
    </a>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
  showRequirements = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  minLength?: number;
  showRequirements?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const requirementsId = `${inputId}-requirements`;
  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={inputId} className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase">{label}</label>
      <div className="relative min-w-0">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          required
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-describedby={showRequirements && value ? requirementsId : undefined}
          className="block min-w-0 w-full bg-[#FFFFFF] border border-[#D7DEE3] px-3 py-2.5 pr-12 text-[#0C1A26] focus:border-[#066E5A] outline-none transition-colors"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible((show) => !show)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-[#5E6E7A] hover:text-[#0C1A26]"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {showRequirements && <PasswordRequirements value={value} id={requirementsId} />}
    </div>
  );
}

export function AuthFormPage({ role, onAuthenticated, initialError = '' }: { role: string; onAuthenticated: () => void | Promise<void>; initialError?: string }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [authPhase, setAuthPhase] = useState<AuthTransitionPhase>('idle');

  async function finishAuthentication() {
    await wait(180);
    setAuthPhase('scatter');
    await wait(350);
    await onAuthenticated();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError('Authentication is not configured. Add the Supabase URL and publishable key.'); return; }
    if (isSignUp && !passwordMeetsPolicy(password)) {
      setError('Your password must meet every requirement below.');
      return;
    }
    if (role === 'employer' && !isCompanyEmail(email)) {
      setError(COMPANY_EMAIL_ERROR);
      return;
    }
    setBusy(true); setError(''); setNotice('');
    setAuthPhase('loading');
    const res = isSignUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, account_role: role },
            emailRedirectTo: authRedirect('/auth/callback', role),
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });
    if (res.error) { setBusy(false); setAuthPhase('idle'); setError(res.error.message); return; }
    if (role === 'employer' && !isCompanyEmail(res.data.user?.email || email)) {
      await supabase.auth.signOut();
      setBusy(false); setAuthPhase('idle'); setError(COMPANY_EMAIL_ERROR); return;
    }
    if (isSignUp && !res.data.session) {
      setBusy(false);
      setAuthPhase('idle');
      setConfirmationSent(true);
      return;
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
      const { data: f } = await supabase.auth.mfa.listFactors();
      const totp = (f?.totp || []).find((factor: { status: string }) => factor.status === 'verified');
      if (totp) { setBusy(false); setAuthPhase('idle'); setMfaFactorId(totp.id); setNotice('Enter the 6-digit code from your authenticator app.'); return; }
    }
    await finishAuthentication();
    setBusy(false);
  }

  async function googleAuth() {
    if (!supabase) { setError('Authentication is not configured. Add the Supabase URL and publishable key.'); return; }
    setBusy(true); setError(''); setNotice('');
    setAuthPhase('loading');
    window.sessionStorage.setItem('fumana-auth-role', role);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: authRedirect('/auth/callback', role),
        queryParams: { prompt: 'select_account' },
      },
    });
    if (oauthError) { setBusy(false); setAuthPhase('idle'); setError(oauthError.message); }
  }

  async function submitMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !mfaFactorId) return;
    setBusy(true); setError('');
    setAuthPhase('loading');
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
    const verifyError = challengeError
      ? challengeError
      : (await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challenge!.id, code: mfaCode })).error;
    if (verifyError) { setBusy(false); setAuthPhase('idle'); setError(verifyError.message); setMfaCode(''); return; }
    await finishAuthentication();
    setBusy(false);
  }

  if (forgotOpen) return <ForgotPasswordPage role={role} onBack={() => setForgotOpen(false)} />;

  return (
    <div className="auth-screen flex min-h-0 flex-col overflow-hidden bg-[#F2F4F7]">
      <AuthLoadingTransition phase={authPhase} />
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-3 sm:p-5">
        <motion.div variants={pageVariants} initial="initial" animate="animate" className="auth-card w-full max-w-md border border-[#D7DEE3] bg-[#FFFFFF] shadow-sm">
          <div className="auth-card-header border-b border-[#D7DEE3] px-5 py-4 text-center sm:px-6 sm:py-5">
            <h2 className="m-0 mb-3 mt-3 text-2xl font-semibold text-[#0C1A26]">
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="m-0 font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase">
              {role === 'builder' ? 'Builder Node Access' : 'Enterprise Gateway'}
            </p>
          </div>
          <div className="auth-card-body space-y-3 px-5 py-3 sm:px-6 sm:py-4">
            {confirmationSent ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto w-10 h-10 border border-[#066E5A] text-[#066E5A] flex items-center justify-center"><Check size={20} /></div>
                <h3 className="text-xl font-semibold text-[#0C1A26]">Check your email</h3>
                <p className="text-sm text-[#5E6E7A] leading-relaxed">We sent a confirmation link to <strong className="text-[#0C1A26]">{email}</strong>. Open it before signing in for the first time.</p>
                <button type="button" onClick={() => { setConfirmationSent(false); setIsSignUp(false); }} className="w-full bg-[#066E5A] text-[#F4F7F8] p-3 font-medium hover:bg-[#05564A] transition-colors">Back to sign in</button>
              </div>
            ) : mfaFactorId ? (
              <form className="space-y-4" onSubmit={submitMfa}>
                <div className="space-y-1">
                  <label className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase">Authenticator code</label>
                  <input type="text" inputMode="numeric" required autoFocus value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} className="w-full bg-[#FFFFFF] border border-[#D7DEE3] p-3 text-[#0C1A26] focus:border-[#066E5A] outline-none transition-colors tracking-[0.4em] text-center" placeholder="000000" maxLength={6} />
                </div>
                {error && <p className="font-['IBM_Plex_Mono',monospace] text-xs text-[#A03020] leading-relaxed">{error}</p>}
                {notice && <p className="font-['IBM_Plex_Mono',monospace] text-xs text-[#066E5A] leading-relaxed">{notice}</p>}
                <button type="submit" disabled={busy} className="w-full bg-[#066E5A] text-[#F4F7F8] p-3 font-medium hover:bg-[#05564A] transition-colors mt-2 disabled:opacity-60">{busy ? 'Verifying…' : 'Verify'}</button>
              </form>
            ) : (
              <>
                <button type="button" onClick={googleAuth} disabled={busy} className="flex w-full items-center justify-center gap-3 border border-[#D7DEE3] bg-[#FFFFFF] px-3 py-2.5 font-medium text-[#0C1A26] transition-colors hover:bg-[#F2F4F7] disabled:opacity-60">
                  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 48 48">
                    <path fill="#4285F4" d="M48 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h13.94c-.6 2.96-2.28 5.48-4.94 7.18v6h7.98c4.66-4.3 7.02-10.62 7.02-17.65Z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.98-6.2c-2.13 1.43-4.85 2.27-7.93 2.27-6.09 0-11.26-4.11-13.11-9.64H2.65v6.39C6.58 42.63 14.62 48 24 48Z" />
                    <path fill="#FBBC05" d="M10.89 28.63A14.4 14.4 0 0 1 10.1 24c0-1.61.28-3.17.79-4.63v-6.4H2.65A24 24 0 0 0 0 24c0 3.87.93 7.53 2.65 11.03l8.24-6.4Z" />
                    <path fill="#EA4335" d="M24 9.55c3.53 0 6.7 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.58 5.37 2.65 12.97l8.24 6.4C12.74 13.84 17.91 9.55 24 9.55Z" />
                  </svg>
                  {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
                </button>
                <div className="flex items-center gap-3"><span className="h-px bg-[#D7DEE3] flex-1"></span><span className="font-['IBM_Plex_Mono',monospace] text-[10px] text-[#5E6E7A] uppercase">or</span><span className="h-px bg-[#D7DEE3] flex-1"></span></div>
                <form className="space-y-3" onSubmit={submit}>
                  {isSignUp && (
                    <div className="space-y-1">
                      <label className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase">Full Name</label>
                      <input type="text" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="block min-w-0 w-full border border-[#D7DEE3] bg-[#FFFFFF] px-3 py-2.5 text-[#0C1A26] outline-none transition-colors focus:border-[#066E5A]" placeholder="Amara Kendra" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase">Email Address</label>
                    <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="block min-w-0 w-full border border-[#D7DEE3] bg-[#FFFFFF] px-3 py-2.5 text-[#0C1A26] outline-none transition-colors focus:border-[#066E5A]" placeholder="name@company.com" />
                    {role === 'employer' && <p className="m-0 font-['IBM_Plex_Mono',monospace] text-[10px] leading-4 text-[#5E6E7A]">Use a business email only.</p>}
                  </div>
                  <PasswordField label="Password" value={password} onChange={setPassword} placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'} autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={isSignUp ? 6 : undefined} showRequirements={isSignUp} />
                  {!isSignUp && <div className="text-right"><button type="button" onClick={() => setForgotOpen(true)} className="appearance-none border-0 bg-transparent p-0 font-['IBM_Plex_Mono',monospace] text-xs text-[#066E5A] transition-colors hover:text-[#0C1A26] hover:font-semibold hover:underline">Forgot password?</button></div>}
                  {error && <p className="font-['IBM_Plex_Mono',monospace] text-xs text-[#A03020] leading-relaxed">{error}</p>}
                  {notice && <p className="font-['IBM_Plex_Mono',monospace] text-xs text-[#066E5A] leading-relaxed">{notice}</p>}
                  <button type="submit" disabled={busy} className="w-full bg-[#066E5A] text-[#F4F7F8] p-3 font-medium hover:bg-[#05564A] transition-colors mt-2 disabled:opacity-60">{busy ? 'Working…' : isSignUp ? 'Create Account' : 'Sign In'}</button>
                </form>
                <div className="text-center">
                  <p className="text-sm text-[#5E6E7A]">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    <button onClick={() => { setIsSignUp(!isSignUp); setError(''); setNotice(''); }} className="ml-2 appearance-none border-0 bg-transparent p-0 font-medium text-[#066E5A] transition-colors hover:text-[#0C1A26] hover:font-semibold hover:underline">
                      {isSignUp ? 'Sign in' : 'Sign up'}
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function ForgotPasswordPage({ role, onBack }: { role: string; onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setError('Password reset is not configured.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(PASSWORD_RESET_URL, {
        method: 'POST', headers: await apiHeaders(), body: JSON.stringify({ email, role }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 404) { setError('No account with that email address exists.'); return; }
      if (!response.ok) throw new Error(body.error || 'The account check could not be completed.');
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The account check could not be completed.');
    } finally { setBusy(false); }
  }

  return (
    <div className="auth-screen flex min-h-0 flex-col overflow-hidden bg-[#F2F4F7]">
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-3 sm:p-5">
        <motion.div variants={pageVariants} initial="initial" animate="animate" className="auth-card w-full max-w-md border border-[#D7DEE3] bg-[#FFFFFF] shadow-sm">
          <div className="auth-card-header border-b border-[#D7DEE3] px-5 py-4 text-center sm:px-6 sm:py-5">
            <img src={thinkingPassword} alt="Friendly robot thinking with a hand on its chin" className="mx-auto mb-2 h-24 w-24 object-contain" />
            <h2 className="m-0 mb-1 text-2xl font-semibold text-[#0C1A26]">Forgot your password?</h2>
            <p className="m-0 text-sm text-[#5E6E7A]">Enter your email and we will send a secure reset link.</p>
          </div>
          <div className="auth-card-body p-5 sm:p-6">
            {sent ? <div className="space-y-4 text-center">
              <div className="mx-auto w-10 h-10 border border-[#066E5A] text-[#066E5A] flex items-center justify-center"><Check size={20} /></div>
              <p className="text-sm text-[#5E6E7A] leading-relaxed">A reset link has been sent to <strong className="text-[#0C1A26]">{email}</strong>. Check your inbox.</p>
              <button type="button" onClick={onBack} className="w-full bg-[#066E5A] text-[#F4F7F8] p-3 font-medium hover:bg-[#05564A]">Return to sign in</button>
            </div> : <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-1">
                <label className="font-['IBM_Plex_Mono',monospace] text-xs text-[#5E6E7A] uppercase">Email address</label>
                <input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="block min-w-0 w-full border border-[#D7DEE3] bg-[#FFFFFF] px-3 py-2.5 text-[#0C1A26] outline-none focus:border-[#066E5A]" placeholder="name@company.com" />
              </div>
              {error && <p className="font-['IBM_Plex_Mono',monospace] text-xs text-[#A03020]">{error}</p>}
              <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 bg-[#066E5A] p-3 font-medium text-[#F4F7F8] hover:bg-[#05564A] disabled:opacity-60">{busy ? <><motion.span aria-hidden="true" className="h-4 w-4 bg-[#0C1A26]" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} /> Checking account…</> : 'Continue'}</button>
              <div className="text-center">
                <button type="button" onClick={onBack} className="appearance-none border-0 bg-transparent p-0 text-xs text-[#5E6E7A] underline hover:text-[#000000] hover:no-underline">Back to sign in</button>
              </div>
            </form>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function UpdatePasswordPage({ onDone, sessionReady }: { onDone: () => void | Promise<void>; sessionReady: boolean }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordMeetsPolicy(pw)) { setError('Your password must meet every requirement below.'); return; }
    if (pw !== pw2) { setError('Passwords do not match.'); return; }
    if (!supabase || !sessionReady) { setError('This reset link is invalid or has expired. Request a new one.'); return; }
    setBusy(true); setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password: pw });
    if (updateError) { setBusy(false); setError(updateError.message); return; }
    await onDone();
  }

  return (
    <div className="auth-screen flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#F2F4F7]">
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-3 sm:p-5">
        <motion.div variants={pageVariants} initial="initial" animate="animate" className="auth-card w-full max-w-md border border-[#D7DEE3] bg-[#FFFFFF] shadow-sm">
          <div className="auth-card-header border-b border-[#D7DEE3] px-5 py-4 text-center sm:px-6 sm:py-5">
            <div className="mb-3 flex justify-center"><BrandHome centered /></div>
            <h2 className="m-0 mb-1 text-2xl font-semibold text-[#0C1A26]">Set a new password</h2>
          </div>
          <div className="auth-card-body space-y-4 px-5 py-4 sm:px-6 sm:py-5">
            <form className="min-w-0 space-y-3" onSubmit={submit}>
              <PasswordField label="New password" value={pw} onChange={setPw} placeholder="At least 6 characters" autoComplete="new-password" minLength={6} showRequirements />
              <PasswordField label="Confirm password" value={pw2} onChange={setPw2} placeholder="Repeat new password" autoComplete="new-password" minLength={6} />
              {pw2 && <p className={`flex items-center gap-2 font-['IBM_Plex_Mono',monospace] text-[11px] ${pw === pw2 ? 'text-[#066E5A]' : 'text-[#A03020]'}`}>{pw === pw2 ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />}{pw === pw2 ? 'Passwords match' : 'Passwords do not match'}</p>}
              {!sessionReady && <p className="font-['IBM_Plex_Mono',monospace] text-xs text-[#A03020] leading-relaxed">This reset link is invalid or has expired. Request a new link from the sign-in page.</p>}
              {error && <p className="font-['IBM_Plex_Mono',monospace] text-xs text-[#A03020] leading-relaxed">{error}</p>}
              <button type="submit" disabled={busy || !sessionReady} className="w-full bg-[#066E5A] text-[#F4F7F8] p-3 font-medium hover:bg-[#05564A] transition-colors mt-2 disabled:opacity-60">{busy ? 'Setting password…' : 'Set new password'}</button>
            </form>
          </div>
        </motion.div>
      </div>
      <footer className="shrink-0 px-4 py-2 text-center font-['IBM_Plex_Mono',monospace] text-[10px] text-[#5E6E7A] sm:text-[11px]">
        &copy; 2026 FIND Services Limited. Powered by Telos. Designed by Lexington Advisory Group.
      </footer>
    </div>
  );
}

export function SignInPortalDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (role: 'builder' | 'employer') => void;
}) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0C1A26]/35 p-4 backdrop-blur-sm sm:p-6"
        variants={modalBackdropVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
      <motion.section variants={modalPanelVariants} role="dialog" aria-modal="true" aria-labelledby="sign-in-role-title" className="relative w-full max-w-xl border border-[#D7DEE3] bg-[#FFFFFF] p-6 shadow-xl sm:p-8">
        <button type="button" onClick={onClose} aria-label="Close role selection" className="absolute right-4 top-4 border-0 bg-transparent p-1 text-[#5E6E7A] hover:text-[#0C1A26]">
          <X size={20} />
        </button>
        <h2 id="sign-in-role-title" className="mb-6 pr-8 text-xl font-semibold text-[#0C1A26]">Choose your sign-in portal</h2>
        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={() => onSelect('builder')} className="min-h-24 bg-[#066E5A] px-4 py-5 font-medium text-[#F4F7F8] transition-colors hover:bg-[#05564A]">
            Sign in as Builder
          </button>
          <button type="button" onClick={() => onSelect('employer')} className="min-h-24 border border-[#D7DEE3] bg-[#FFFFFF] px-4 py-5 font-medium text-[#0C1A26] transition-colors hover:bg-[#F2F4F7]">
            Sign in as Employer
          </button>
        </div>
      </motion.section>
    </motion.div>}
    </AnimatePresence>
  );
}

export function RoleSelectionPage({
  onRoleSelect,
  onBack,
  isAdmin,
}: {
  onRoleSelect: (role: string) => void;
  onBack: () => void;
  isAdmin?: boolean;
}) {
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#F2F4F7] px-5 py-3 sm:px-8 sm:py-4">
      <div className="w-full">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 border-0 bg-transparent p-0 text-sm font-medium text-[#066E5A] transition-colors hover:font-semibold hover:underline"
        >
          <ArrowLeft size={16} /> Back to main site
        </button>
      </div>

      <motion.div variants={pageVariants} initial="initial" animate="animate" className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col justify-center py-2 sm:py-3">
        <div className="mb-3 space-y-1.5 sm:mb-4">
          <h1 className="text-3xl font-bold tracking-widest text-[#0C1A26] uppercase sm:text-4xl">FUMANA</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-[#5E6E7A] sm:text-base">
            The talent clearing house for African engineering. One network: builders prove their worth on one side, enterprises hire it on the other, and the impact is settled in the open.
          </p>
        </div>

        <motion.div variants={staggerContainerVariants} initial="initial" animate="animate" className={`grid gap-3 ${isAdmin ? 'mb-3' : 'mb-4'} md:grid-cols-2`}>
          <motion.div variants={cardVariants} className="flex flex-col items-start rounded-lg border border-[#D7DEE3] bg-[#FFFFFF] p-5 shadow-sm transition-colors hover:border-[#C2CCD4]">
            <div className="mb-2 font-['IBM_Plex_Mono',monospace] text-[11px] tracking-wider text-[#5E6E7A] uppercase">
              I am a builder
            </div>
            <h2 className="mb-2 text-xl font-bold text-[#0C1A26]">Build a profile employers trust</h2>
            <p className="mb-4 flex-1 text-sm leading-relaxed text-[#5E6E7A]">
              Sign in, take the AI interview, and join the network with your identity shielded until you choose to reveal it.
            </p>
            <button
              type="button"
              onClick={() => onRoleSelect('builder')}
              className="rounded bg-[#066E5A] px-5 py-2.5 text-sm font-medium text-[#F4F7F8] transition-colors hover:bg-[#05564A]"
            >
              Enter as a builder
            </button>
          </motion.div>

          <motion.div variants={cardVariants} className="flex flex-col items-start rounded-lg border border-[#D7DEE3] bg-[#FFFFFF] p-5 shadow-sm transition-colors hover:border-[#C2CCD4]">
            <div className="mb-2 font-['IBM_Plex_Mono',monospace] text-[11px] tracking-wider text-[#5E6E7A] uppercase">
              I am an employer
            </div>
            <h2 className="mb-2 text-xl font-bold text-[#0C1A26]">Hire verified talent</h2>
            <p className="mb-4 flex-1 text-sm leading-relaxed text-[#5E6E7A]">
              Search by evidence, see bias-shielded matches, sign an SOW with liability carried for you, and see where every dollar goes.
            </p>
            <button
              type="button"
              onClick={() => onRoleSelect('employer')}
              className="rounded bg-[#066E5A] px-5 py-2.5 text-sm font-medium text-[#F4F7F8] transition-colors hover:bg-[#05564A]"
            >
              Enter as an employer
            </button>
          </motion.div>
        </motion.div>

        {isAdmin && (
          <div className="mb-4 flex flex-col items-start justify-between gap-3 rounded-lg bg-[#0C1A26] p-5 sm:flex-row sm:items-center">
            <div>
              <div className="mb-1 font-['IBM_Plex_Mono',monospace] text-[11px] tracking-wider text-[#9AB0BC] uppercase">Administrator</div>
              <p className="text-sm text-[#D7DEE3]">Open the review queue and resolve contests, human-review requests, and reports.</p>
            </div>
            <button
              type="button"
              onClick={() => onRoleSelect('admin')}
              className="whitespace-nowrap rounded bg-[#066E5A] px-5 py-2.5 text-sm font-medium text-[#F4F7F8] transition-colors hover:bg-[#05564A]"
            >
              Admin console
            </button>
          </div>
        )}

        <p className="font-['IBM_Plex_Mono',monospace] text-[11px] text-[#5E6E7A]">
          &copy; 2026 FIND Services Limited. Powered by Telos. Designed by Lexington Advisory Group.
        </p>
      </motion.div>
    </div>
  );
}

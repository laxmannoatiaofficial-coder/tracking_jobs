'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LogoMark } from '@/components/Logo';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      router.replace('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (/already registered|already exists/i.test(msg)) {
        setError('An account with this email already exists.');
      } else if (/invalid login|invalid credentials/i.test(msg)) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // OAuth redirects away — no further action
    } catch (err) {
      setGoogleLoading(false);
      const msg = err instanceof Error ? err.message : '';
      if (/provider is not enabled|Unsupported provider/i.test(msg)) {
        setError(
          'Google sign-in isn’t set up yet. Enable the Google provider in your Supabase project, or use email below.',
        );
      } else {
        setError(msg || 'Could not start Google sign-in');
      }
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center px-6 py-10 md:px-12">
      <div className="w-full max-w-[440px] mx-auto flex flex-col items-center gap-6">
        {/* Logo block */}
        <div
          className="flex items-center gap-3 rounded-xl px-5 py-3 bg-primary text-secondary"
          style={{ boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)' }}
        >
          <LogoMark size={26} />
          <span className="font-display font-bold text-xl text-secondary">
            Trackitt
          </span>
        </div>

        {/* Static tagline */}
        <div className="text-center w-full">
          <h2 className="font-display font-bold text-2xl text-primary mb-1">
            Never get caught off guard again.
          </h2>
          <p
            className="text-sm max-w-xs mx-auto"
            style={{ color: 'rgb(var(--rgb-on-dark) / 0.65)' }}
          >
            Know exactly who&rsquo;s calling, what you applied for, and when to
            follow up.
          </p>
        </div>

        {/* Login card */}
        <div
          className="w-full rounded-3xl p-9 bg-primary"
          style={{
            border: '1px solid rgb(var(--rgb-secondary) / 0.08)',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.20)',
          }}
        >
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || submitting}
            className="press w-full flex items-center justify-center gap-3 text-secondary text-sm font-semibold rounded-full px-5 py-3 border border-[rgb(var(--rgb-secondary)_/_0.18)] hover:border-accent hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'rgb(var(--rgb-dropdown))' }}
          >
            <GoogleLogo />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div className="flex items-center mt-5 mb-5">
            <div
              className="flex-1 h-px"
              style={{ background: 'rgb(var(--rgb-secondary) / 0.10)' }}
            />
            <span
              className="text-xs tracking-wider px-3"
              style={{ color: 'rgb(var(--rgb-ink) / 0.35)' }}
            >
              OR
            </span>
            <div
              className="flex-1 h-px"
              style={{ background: 'rgb(var(--rgb-secondary) / 0.10)' }}
            />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Email Address">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </Field>

            <Field
              label="Password"
              right={
                <button
                  type="button"
                  className="text-xs font-semibold text-accent cursor-pointer hover:underline decoration-2 underline-offset-2"
                >
                  Forgot Password?
                </button>
              }
            >
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full cursor-pointer hover:bg-accent/20 active:bg-accent/40 transition-colors"
                  style={{ color: 'rgb(var(--rgb-ink) / 0.45)' }}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </Field>

            {/* Confirm Password — slides open in Sign Up mode */}
            <div
              className={`overflow-hidden transition-all duration-200 ${
                mode === 'signup'
                  ? 'max-h-24 opacity-100'
                  : 'max-h-0 opacity-0 -mt-4'
              }`}
            >
              <Field label="Confirm Password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={mode === 'signup'}
                  minLength={6}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                  tabIndex={mode === 'signup' ? 0 : -1}
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={submitting || googleLoading}
              className="press mt-2 w-full bg-accent text-secondary text-sm font-bold rounded-full px-4 py-3.5 hover:brightness-95 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
              style={{ boxShadow: '0 4px 16px rgba(255, 200, 87, 0.40)' }}
            >
              {submitting ? (
                <InlineSpinner />
              ) : mode === 'login' ? (
                'Sign in'
              ) : (
                'Create Account'
              )}
            </button>

            {error && (
              <p
                className="text-xs text-center animate-grid-fade"
                style={{ color: '#EF4444' }}
                role="alert"
              >
                {error}
              </p>
            )}
          </form>

          <p
            className="text-center text-sm mt-4"
            style={{ color: 'rgb(var(--rgb-ink) / 0.6)' }}
          >
            {mode === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
              className="font-semibold text-accent cursor-pointer hover:underline decoration-2 underline-offset-4"
            >
              {mode === 'login' ? 'Get Started' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full text-secondary text-sm rounded-2xl px-4 py-3 bg-[rgb(var(--rgb-secondary)_/_0.06)] border border-[rgb(var(--rgb-secondary)_/_0.15)] hover:border-accent focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all duration-200 ease-out placeholder:text-[color:rgb(var(--rgb-ink)_/_0.28)]';

function Field({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-secondary">
          {label}
        </label>
        {right}
      </div>
      {children}
    </div>
  );
}

function InlineSpinner() {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full animate-spin"
      style={{
        border: '2px solid rgb(var(--rgb-secondary) / 0.3)',
        borderTopColor: 'var(--color-secondary)',
      }}
      aria-hidden="true"
    />
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M2.5 13.5l11-11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.255h2.908c1.702-1.567 2.684-3.874 2.684-6.612z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.255c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A9 9 0 009 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A9 9 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A9 9 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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
      setError('Passwords do not match');
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
        setError(
          'An account with this email already exists. Try logging in instead.',
        );
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
      setError(err instanceof Error ? err.message : 'Could not start Google sign-in');
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-primary rounded-3xl shadow-modal p-8 sm:p-10">
        <div className="text-center mb-7">
          <h1 className="font-display font-extrabold text-3xl text-secondary">
            Job Tracker
          </h1>
          <p
            className="font-body text-sm mt-2"
            style={{ color: 'rgb(var(--rgb-ink) / 0.6)' }}
          >
            Track every application. Land the right role.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || submitting}
          className="w-full flex items-center justify-center gap-3 bg-primary text-secondary text-sm font-semibold rounded-full px-4 py-3 transition-all duration-200 ease-out hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ border: '1px solid rgb(var(--rgb-secondary) / 0.25)' }}
        >
          <GoogleLogo />
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3 my-6">
          <div
            className="flex-1 h-px"
            style={{ background: 'rgb(var(--rgb-secondary) / 0.15)' }}
          />
          <span
            className="text-xs"
            style={{ color: 'rgb(var(--rgb-ink) / 0.5)' }}
          >
            or
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: 'rgb(var(--rgb-secondary) / 0.15)' }}
          />
        </div>

        <div className="text-center mb-4 text-xs">
          <span style={{ color: 'rgb(var(--rgb-ink) / 0.65)' }}>
            {mode === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}
          </span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
            className="font-semibold text-secondary underline decoration-accent decoration-2 underline-offset-4 hover:text-accent transition-colors"
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label="Email">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </Field>
          {mode === 'signup' && (
            <Field label="Confirm Password">
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </Field>
          )}

          <button
            type="submit"
            disabled={submitting || googleLoading}
            className="mt-2 w-full bg-accent text-secondary text-sm font-semibold rounded-full px-4 py-3 transition-all duration-200 ease-out hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <InlineSpinner />}
            {submitting
              ? mode === 'login'
                ? 'Logging in…'
                : 'Creating account…'
              : mode === 'login'
                ? 'Log In'
                : 'Create Account'}
          </button>

          {error && (
            <p
              className="text-xs text-center mt-1"
              style={{ color: '#dc2626' }}
              role="alert"
            >
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

const inputClass =
  'w-full bg-primary text-secondary text-sm rounded-xl px-3 py-2.5 border border-[rgb(var(--rgb-secondary)_/_0.25)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-secondary mb-1.5">
        {label}
      </label>
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

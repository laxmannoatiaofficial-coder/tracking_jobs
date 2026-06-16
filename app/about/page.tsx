'use client';

import AuthGuard from '@/components/AuthGuard';
import { AppHeader } from '@/components/AppHeader';
import { LogoMark } from '@/components/Logo';

/**
 * About — placeholder layout until the page is wireframed.
 * Keeps the brand voice so the nav entry doesn't lead anywhere broken.
 */
export default function AboutPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-page">
        <AppHeader />

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <div className="inline-flex text-secondary mb-6">
            <LogoMark size={64} />
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-secondary leading-tight">
            Never get caught{' '}
            <span className="underline decoration-accent decoration-4 underline-offset-8">
              off guard
            </span>{' '}
            again.
          </h1>
          <p
            className="mt-6 text-base leading-relaxed max-w-xl mx-auto"
            style={{ color: 'rgb(var(--rgb-ink) / 0.7)' }}
          >
            Trackitt keeps your job hunt in one place — every application you
            have sent, every company you are watching, and every follow-up you
            owe someone. So when an unknown number calls about &ldquo;the role
            you applied for last week,&rdquo; you already know exactly which
            one it is.
          </p>

          <div
            className="mt-12 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
            style={{
              background: 'rgba(255, 200, 87, 0.18)',
              color: 'var(--color-ink)',
            }}
          >
            <span aria-hidden="true">✏️</span>
            The page is being designed, full version coming soon
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

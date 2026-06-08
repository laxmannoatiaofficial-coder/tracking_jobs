'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <Spinner />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

function Spinner() {
  return (
    <div
      className="w-10 h-10 rounded-full animate-spin"
      style={{
        border: '3px solid rgb(var(--rgb-secondary) / 0.15)',
        borderTopColor: 'var(--color-accent)',
      }}
      role="status"
      aria-label="Loading"
    />
  );
}

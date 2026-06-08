'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/dashboard' : '/login');
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-page">
      <div
        className="w-10 h-10 rounded-full animate-spin"
        style={{
          border: '3px solid rgb(var(--rgb-secondary) / 0.15)',
          borderTopColor: 'var(--color-accent)',
        }}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';

export interface UseAuthResult {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

// Module-level session cache. The session resolves once per page load; caching
// it means a useAuth that mounts later (every navigation remounts AuthGuard, the
// page, and AppHeader) starts from the known session instead of flashing the
// auth spinner and re-resolving from scratch. onAuthStateChange keeps it fresh.
let cachedUser: User | null = null;
let sessionResolved = false;

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(!sessionResolved);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      cachedUser = data.session?.user ?? null;
      sessionResolved = true;
      setUser(cachedUser);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      cachedUser = session?.user ?? null;
      sessionResolved = true;
      setUser(cachedUser);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!user) throw new Error('Not signed in');
    const res = await fetch('/api/delete-account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(body.error ?? 'Could not delete account');
    }
    await supabase.auth.signOut();
  }, [user]);

  return {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    deleteAccount,
  };
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { WatchlistCompany, WatchlistInput } from '@/types';
import { supabase } from '@/utils/supabase';

export interface UseWatchlistResult {
  companies: WatchlistCompany[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addCompany: (data: WatchlistInput) => Promise<void>;
  editCompany: (id: string, data: Partial<WatchlistInput>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
}

// SWR-lite cache shared across useWatchlist instances (header bell + watchlist
// page). Collapses concurrent mounts onto one request and lets a fresh mount
// paint instantly without re-querying while still fresh.
const WATCHLIST_TTL_MS = 30_000;
const watchlistCache = new Map<string, { rows: WatchlistCompany[]; ts: number }>();
const watchlistInflight = new Map<string, Promise<WatchlistCompany[]>>();

export function useWatchlist(user: User | null): UseWatchlistResult {
  const [companies, setCompanies] = useState<WatchlistCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep local state and the shared cache in lockstep so a later mount reads the
  // post-mutation rows rather than a stale snapshot.
  const applyLocal = useCallback(
    (updater: (prev: WatchlistCompany[]) => WatchlistCompany[]) => {
      setCompanies((prev) => {
        const next = updater(prev);
        if (user) watchlistCache.set(user.id, { rows: next, ts: Date.now() });
        return next;
      });
    },
    [user],
  );

  const fetchCompanies = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!user) {
        setCompanies([]);
        setLoading(false);
        return;
      }
      const force = opts?.force ?? false;
      const cached = watchlistCache.get(user.id);

      if (cached) {
        setCompanies(cached.rows);
        setLoading(false);
        if (!force && Date.now() - cached.ts < WATCHLIST_TTL_MS) return;
      } else {
        setLoading(true);
      }
      setError(null);

      let inflight = watchlistInflight.get(user.id);
      if (!inflight || force) {
        inflight = (async () => {
          const { data, error: err } = await supabase
            .from('company_watchlist')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (err) throw err;
          return (data ?? []) as WatchlistCompany[];
        })();
        watchlistInflight.set(user.id, inflight);
      }

      try {
        const rows = await inflight;
        watchlistCache.set(user.id, { rows, ts: Date.now() });
        setCompanies(rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load watchlist');
        if (!cached) setCompanies([]);
      } finally {
        if (watchlistInflight.get(user.id) === inflight)
          watchlistInflight.delete(user.id);
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    void fetchCompanies();
  }, [fetchCompanies]);

  const addCompany = useCallback(
    async (data: WatchlistInput) => {
      if (!user) throw new Error('Not signed in');
      const { data: row, error: err } = await supabase
        .from('company_watchlist')
        .insert({ ...data, user_id: user.id })
        .select()
        .single();
      if (err) throw err;
      applyLocal((prev) => [row as WatchlistCompany, ...prev]);
    },
    [user, applyLocal],
  );

  const editCompany = useCallback(
    async (id: string, data: Partial<WatchlistInput>) => {
      if (!user) throw new Error('Not signed in');
      const { data: row, error: err } = await supabase
        .from('company_watchlist')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (err) throw err;
      applyLocal((prev) =>
        prev.map((c) => (c.id === id ? (row as WatchlistCompany) : c)),
      );
    },
    [user, applyLocal],
  );

  const deleteCompany = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not signed in');
      const { error: err } = await supabase
        .from('company_watchlist')
        .delete()
        .eq('id', id);
      if (err) throw err;
      applyLocal((prev) => prev.filter((c) => c.id !== id));
    },
    [user, applyLocal],
  );

  return {
    companies,
    loading,
    error,
    refetch: useCallback(() => fetchCompanies({ force: true }), [fetchCompanies]),
    addCompany,
    editCompany,
    deleteCompany,
  };
}

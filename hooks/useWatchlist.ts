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

export function useWatchlist(user: User | null): UseWatchlistResult {
  const [companies, setCompanies] = useState<WatchlistCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('company_watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
      setCompanies([]);
    } else {
      setCompanies((data ?? []) as WatchlistCompany[]);
    }
    setLoading(false);
  }, [user]);

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
      setCompanies((prev) => [row as WatchlistCompany, ...prev]);
    },
    [user],
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
      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? (row as WatchlistCompany) : c)),
      );
    },
    [user],
  );

  const deleteCompany = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not signed in');
      const { error: err } = await supabase
        .from('company_watchlist')
        .delete()
        .eq('id', id);
      if (err) throw err;
      setCompanies((prev) => prev.filter((c) => c.id !== id));
    },
    [user],
  );

  return {
    companies,
    loading,
    error,
    refetch: fetchCompanies,
    addCompany,
    editCompany,
    deleteCompany,
  };
}

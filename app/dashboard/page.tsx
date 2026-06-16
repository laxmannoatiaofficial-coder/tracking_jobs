'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  JobApplication,
  JobInput,
  JobStatus,
  SortOption,
  StatusFilter,
} from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useJobs } from '@/hooks/useJobs';
import AuthGuard from '@/components/AuthGuard';
import { AppHeader } from '@/components/AppHeader';
import { JobCard } from '@/components/JobCard';
import { StatusTabs } from '@/components/StatusTabs';
import { SortControl } from '@/components/SortControl';
import { EmptyState } from '@/components/EmptyState';
import { AddJobModal } from '@/components/AddJobModal';
import { JobDetailModal } from '@/components/JobDetailModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { SkeletonCard } from '@/components/SkeletonCard';
import { motion, AnimatePresence } from 'framer-motion';

type ModalState =
  | { kind: 'closed' }
  | { kind: 'add'; originRect?: DOMRect }
  | { kind: 'edit'; job: JobApplication }
  | { kind: 'detail'; job: JobApplication; focusJd?: boolean; originRect: DOMRect | null }
  | { kind: 'delete'; job: JobApplication };

interface Toast {
  id: number;
  message: string;
  tone?: 'error' | 'info';
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (message: string, tone: 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  };

  const {
    jobs,
    loading,
    error,
    refetch,
    addJob,
    editJob,
    deleteJob,
  } = useJobs(user);

  const [filter, setFilter] = useState<StatusFilter>('All');
  const [sort, setSort] = useState<SortOption>('date-desc');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [promotePrefill, setPromotePrefill] = useState<Partial<JobInput> | null>(null);
  // Job id the notification bell asked us to open (resolved once jobs load).
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // A company promoted from the Watchlist lands here via sessionStorage —
  // open the Add Application modal pre-filled with its details.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('trackitt-promote');
      if (!raw) return;
      sessionStorage.removeItem('trackitt-promote');
      setPromotePrefill(JSON.parse(raw) as Partial<JobInput>);
      setModal({ kind: 'add' });
    } catch {
      /* malformed payload — ignore */
    }
  }, []);

  // The notification bell can request a specific job's detail modal — via
  // sessionStorage on a fresh navigation, or a live event if already here.
  useEffect(() => {
    try {
      const id = sessionStorage.getItem('trackitt-open-job');
      if (id) {
        sessionStorage.removeItem('trackitt-open-job');
        setPendingOpenId(id);
      }
    } catch {
      /* ignore */
    }
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) setPendingOpenId(id);
    };
    window.addEventListener('trackitt:open-job', onOpen);
    return () => window.removeEventListener('trackitt:open-job', onOpen);
  }, []);

  // Once jobs are loaded, open the requested job's detail modal.
  useEffect(() => {
    if (!pendingOpenId) return;
    const job = jobs.find((j) => j.id === pendingOpenId);
    if (job) {
      setModal({ kind: 'detail', job, originRect: null });
      setPendingOpenId(null);
    }
  }, [pendingOpenId, jobs]);

  // ⌘K / Ctrl+K to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Dynamic browser tab title
  useEffect(() => {
    const base = 'Trackitt';
    document.title = jobs.length > 0 ? `${base} · ${jobs.length} application${jobs.length === 1 ? '' : 's'}` : base;
    return () => {
      document.title = base;
    };
  }, [jobs.length]);

  // Surface fetch errors as toasts
  useEffect(() => {
    if (error) pushToast(error, 'error');
  }, [error]);

  const visibleJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = jobs.filter((j) => {
      if (filter !== 'All' && j.status !== filter) return false;
      if (q) {
        const haystack = `${j.company_name} ${j.role} ${j.industry}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'date-desc':
          return b.date_of_application.localeCompare(a.date_of_application);
        case 'date-asc':
          return a.date_of_application.localeCompare(b.date_of_application);
        case 'company-asc':
          return a.company_name.localeCompare(b.company_name, undefined, {
            sensitivity: 'base',
          });
        case 'company-desc':
          return b.company_name.localeCompare(a.company_name, undefined, {
            sensitivity: 'base',
          });
      }
    });
    return sorted;
  }, [jobs, filter, sort, search]);

  // Keep detail modal in sync with edits / deletions
  useEffect(() => {
    if (modal.kind === 'detail') {
      const current = jobs.find((j) => j.id === modal.job.id);
      if (!current) setModal({ kind: 'closed' });
      else if (current !== modal.job)
        setModal({ kind: 'detail', job: current, originRect: modal.originRect });
    }
  }, [jobs, modal]);

  const handleSave = async (
    data: JobInput,
    file: File | null,
    jdFile: File | null,
  ) => {
    try {
      const warning =
        modal.kind === 'edit'
          ? await editJob(modal.job.id, data, file, jdFile)
          : await addJob(data, file, jdFile);
      setModal({ kind: 'closed' });
      if (warning) pushToast(warning, 'info');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Could not save the application';
      pushToast(msg, 'error');
      throw err;
    }
  };

  const handleStatusChange = async (id: string, status: JobStatus) => {
    try {
      await editJob(id, { status });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Could not update status';
      pushToast(msg, 'error');
    }
  };

  const handleFollowUpToggle = async (id: string, done: boolean) => {
    try {
      await editJob(id, { follow_up_done: done });
    } catch (err) {
      pushToast(
        err instanceof Error ? err.message : 'Could not update follow-up',
        'error',
      );
    }
  };

  const handleDelete = async () => {
    if (modal.kind !== 'delete') return;
    try {
      await deleteJob(modal.job.id);
      setModal({ kind: 'closed' });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not delete', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-page">
      <div className="sticky top-0 z-40 w-full flex flex-col">
        <AppHeader />

        {/* Controls bar */}
        <div className="bg-page">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-10 py-3 flex flex-wrap items-center gap-3">
          <StatusTabs jobs={jobs} active={filter} onChange={setFilter} />
          <SortControl value={sort} onChange={setSort} />

          {/* Search fills remaining space */}
          <div className="relative flex-1 min-w-[180px] order-last sm:order-none w-full sm:w-auto transition-transform duration-200 ease-out hover:scale-[1.02]">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            >
              <SearchIcon />
            </span>
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company, role, or industry…"
              aria-label="Search applications"
              className="w-full bg-primary text-secondary text-sm rounded-full pl-10 pr-16 py-1.5 border border-[rgb(var(--rgb-secondary)_/_0.25)] hover:border-accent focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold pointer-events-none hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
              style={{
                color: 'rgb(var(--rgb-ink) / 0.5)',
                background: 'rgb(var(--rgb-secondary) / 0.08)',
              }}
              aria-hidden="true"
            >
              ⌘K
            </span>
          </div>

          <motion.button
            type="button"
            onClick={(e) => setModal({ kind: 'add', originRect: e.currentTarget.getBoundingClientRect() })}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            className="inline-flex items-center gap-1.5 bg-accent text-secondary px-4 py-2 rounded-full text-sm font-semibold border border-transparent hover:border-accent transition-colors duration-200 ease-out whitespace-nowrap"
          >
            <span aria-hidden="true">+</span>
            <span className="hidden sm:inline">Add Application</span>
            <span className="sm:hidden">Add</span>
          </motion.button>
        </div>
      </div>
      </div>

      <main className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        {loading ? (
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : visibleJobs.length === 0 ? (
          error ? (
            <ErrorState onRetry={() => void refetch()} message={error} />
          ) : search.trim() ? (
            <NoSearchResults
              query={search.trim()}
              onClear={() => setSearch('')}
            />
          ) : (
            <EmptyState
              filter={filter}
              onAdd={() => setModal({ kind: 'add' })}
            />
          )
        ) : (
          <motion.div
            layout
            key={`${filter}-${sort}-${search}`}
            className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 animate-grid-fade"
          >
            <AnimatePresence mode="popLayout">
            {visibleJobs.map((job, idx) => (
              <JobCard
                key={job.id}
                job={job}
                index={idx}
                onOpen={(rect) => setModal({ kind: 'detail', job, originRect: rect })}
                onOpenJd={(rect) =>
                  setModal({ kind: 'detail', job, focusJd: true, originRect: rect })
                }
                onStatusChange={handleStatusChange}
              />
            ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <AddJobModal
        open={modal.kind === 'add' || modal.kind === 'edit'}
        initialJob={modal.kind === 'edit' ? modal.job : null}
        prefill={modal.kind === 'add' ? promotePrefill : null}
        originRect={modal.kind === 'add' ? modal.originRect ?? null : null}
        onClose={() => {
          setModal({ kind: 'closed' });
          setPromotePrefill(null);
        }}
        onSave={handleSave}
      />

      <JobDetailModal
        open={modal.kind === 'detail'}
        job={modal.kind === 'detail' ? modal.job : null}
        focusJd={modal.kind === 'detail' ? modal.focusJd : false}
        originRect={modal.kind === 'detail' ? modal.originRect : null}
        onFollowUpToggle={handleFollowUpToggle}
        onClose={() => setModal({ kind: 'closed' })}
        onEdit={() =>
          modal.kind === 'detail' && setModal({ kind: 'edit', job: modal.job })
        }
        onDelete={() =>
          modal.kind === 'detail' &&
          setModal({ kind: 'delete', job: modal.job })
        }
      />

      <DeleteConfirmModal
        open={modal.kind === 'delete'}
        companyName={modal.kind === 'delete' ? modal.job.company_name : ''}
        onCancel={() => setModal({ kind: 'closed' })}
        onConfirm={handleDelete}
      />

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="text-primary text-sm px-4 py-3 rounded-2xl shadow-modal animate-card-in"
              style={{
                background:
                  t.tone === 'error' ? '#b91c1c' : 'var(--color-secondary)',
              }}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="7"
        cy="7"
        r="4.5"
        stroke="rgb(var(--rgb-secondary) / 0.55)"
        strokeWidth="1.6"
      />
      <path
        d="M10.5 10.5L14 14"
        stroke="rgb(var(--rgb-secondary) / 0.55)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NoSearchResults({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center text-center py-20 px-6">
      <h2 className="font-display font-bold text-2xl text-secondary mb-2">
        No matches for &ldquo;{query}&rdquo;
      </h2>
      <p
        className="mb-6 max-w-sm text-sm"
        style={{ color: 'rgb(var(--rgb-ink) / 0.65)' }}
      >
        Try a different search, or clear it to see all applications.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-2 bg-accent text-secondary px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ease-out hover:scale-[1.03]"
      >
        Clear search
      </button>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center text-center py-20 px-6">
      <h2 className="font-display font-bold text-2xl text-secondary mb-2">
        Couldn't load your applications
      </h2>
      <p
        className="mb-6 max-w-sm text-sm"
        style={{ color: 'rgb(var(--rgb-ink) / 0.7)' }}
      >
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 bg-accent text-secondary px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ease-out hover:scale-[1.03]"
      >
        Retry
      </button>
    </div>
  );
}

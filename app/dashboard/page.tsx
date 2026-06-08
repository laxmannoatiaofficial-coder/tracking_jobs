'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  JobApplication,
  JobInput,
  JobStatus,
  SortOption,
  StatusFilter,
} from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useJobs } from '@/hooks/useJobs';
import { useTheme } from '@/hooks/useTheme';
import AuthGuard from '@/components/AuthGuard';
import { JobCard } from '@/components/JobCard';
import { StatusTabs } from '@/components/StatusTabs';
import { SortControl } from '@/components/SortControl';
import { EmptyState } from '@/components/EmptyState';
import { AddJobModal } from '@/components/AddJobModal';
import { JobDetailModal } from '@/components/JobDetailModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { SkeletonCard } from '@/components/SkeletonCard';
import { truncateMiddle } from '@/utils/helpers';

type ModalState =
  | { kind: 'closed' }
  | { kind: 'add' }
  | { kind: 'edit'; job: JobApplication }
  | { kind: 'detail'; job: JobApplication; focusJd?: boolean }
  | { kind: 'delete'; job: JobApplication }
  | { kind: 'delete-account' };

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
  const router = useRouter();
  const { user, signOut, deleteAccount } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
    const base = 'Job Tracker';
    document.title = jobs.length > 0 ? `${base} · ${jobs.length} application${jobs.length === 1 ? '' : 's'}` : base;
    return () => {
      document.title = base;
    };
  }, [jobs.length]);

  // Close user menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

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
  }, [jobs, filter, sort]);

  // Keep detail modal in sync with edits / deletions
  useEffect(() => {
    if (modal.kind === 'detail') {
      const current = jobs.find((j) => j.id === modal.job.id);
      if (!current) setModal({ kind: 'closed' });
      else if (current !== modal.job) setModal({ kind: 'detail', job: current });
    }
  }, [jobs, modal]);

  const handleSave = async (
    data: JobInput,
    file: File | null,
    jdFile: File | null,
  ) => {
    if (modal.kind === 'edit') {
      await editJob(modal.job.id, data, file, jdFile);
    } else {
      await addJob(data, file, jdFile);
    }
    setModal({ kind: 'closed' });
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

  const handleDelete = async () => {
    if (modal.kind !== 'delete') return;
    try {
      await deleteJob(modal.job.id);
      setModal({ kind: 'closed' });
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not delete', 'error');
    }
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    router.replace('/login');
  };

  const handleDeleteAccount = async () => {
    await deleteAccount();
    router.replace('/login');
  };

  const userLabel =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    'Account';
  const displayedLabel = truncateMiddle(userLabel, 22);

  return (
    <div className="min-h-screen bg-page">
      {/* Ribbon (not sticky) */}
      <div className="bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <h1 className="font-display font-extrabold text-primary text-2xl tracking-tight">
            Job Tracker
          </h1>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
              }
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="flex items-center justify-center w-9 h-9 rounded-full text-primary transition-colors hover:bg-white/10"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 text-sm text-primary px-3 py-1.5 rounded-full transition-colors hover:bg-white/10"
            >
              <span className="hidden sm:inline">{displayedLabel}</span>
              <span className="sm:hidden">Account</span>
              <ChevronDown />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 min-w-[200px] bg-primary rounded-xl shadow-menu overflow-hidden z-50"
                style={{ border: '1px solid rgb(var(--rgb-secondary) / 0.12)' }}
              >
                <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
                <MenuItem
                  tone="danger"
                  onClick={() => {
                    setMenuOpen(false);
                    setModal({ kind: 'delete-account' });
                  }}
                >
                  Delete Account
                </MenuItem>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Controls bar (sticky) */}
      <div
        className="sticky top-0 z-30 bg-page"
        style={{ borderBottom: '1px solid rgb(var(--rgb-secondary) / 0.1)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
          <StatusTabs jobs={jobs} active={filter} onChange={setFilter} />
          <SortControl value={sort} onChange={setSort} />

          {/* Search fills remaining space */}
          <div className="relative flex-1 min-w-[180px] order-last sm:order-none w-full sm:w-auto">
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
              className="w-full bg-primary text-secondary text-sm rounded-full pl-10 pr-16 py-1.5 border border-[rgb(var(--rgb-secondary)_/_0.25)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
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

          <button
            type="button"
            onClick={() => setModal({ kind: 'add' })}
            className="inline-flex items-center gap-1.5 bg-accent text-secondary px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ease-out hover:scale-[1.03] whitespace-nowrap"
          >
            <span aria-hidden="true">+</span>
            <span className="hidden sm:inline">Add Application</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
          <div
            key={`${filter}-${sort}-${search}`}
            className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-grid-fade"
          >
            {visibleJobs.map((job, idx) => (
              <JobCard
                key={job.id}
                job={job}
                index={idx}
                onOpen={() => setModal({ kind: 'detail', job })}
                onOpenJd={() =>
                  setModal({ kind: 'detail', job, focusJd: true })
                }
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </main>

      <AddJobModal
        open={modal.kind === 'add' || modal.kind === 'edit'}
        initialJob={modal.kind === 'edit' ? modal.job : null}
        onClose={() => setModal({ kind: 'closed' })}
        onSave={handleSave}
      />

      <JobDetailModal
        open={modal.kind === 'detail'}
        job={modal.kind === 'detail' ? modal.job : null}
        focusJd={modal.kind === 'detail' ? modal.focusJd : false}
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

      <DeleteAccountModal
        open={modal.kind === 'delete-account'}
        onCancel={() => setModal({ kind: 'closed' })}
        onConfirm={handleDeleteAccount}
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

function MenuItem({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'danger';
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent/20"
      style={{ color: tone === 'danger' ? '#dc2626' : 'var(--color-secondary)' }}
    >
      {children}
    </button>
  );
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.5 14.5A8 8 0 019.5 3.5a8 8 0 1011 11z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  LocationType,
  WatchlistCompany,
  WatchlistInput,
  WatchlistKind,
} from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useWatchlist } from '@/hooks/useWatchlist';
import AuthGuard from '@/components/AuthGuard';
import { AppHeader } from '@/components/AppHeader';
import { AddCompanyModal } from '@/components/AddCompanyModal';
import { WatchlistDetailModal } from '@/components/WatchlistDetailModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { formatDateShort } from '@/utils/helpers';

type ModalState =
  | { kind: 'closed' }
  | { kind: 'add' }
  | { kind: 'detail'; company: WatchlistCompany; originRect: DOMRect | null }
  | { kind: 'edit'; company: WatchlistCompany }
  | { kind: 'delete'; company: WatchlistCompany };

/** Best-effort mapping of the watchlist's free-text location onto the
    application form's structured location fields, so promoting an entry
    never asks for the location again. */
function parseLocation(raw: string): {
  location_type?: LocationType;
  location_city?: string;
} {
  const loc = (raw ?? '').trim();
  if (!loc) return {};
  const lower = loc.toLowerCase();
  const city = loc
    .replace(/remote|hybrid|on-?site/gi, '')
    .replace(/[·,|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (lower.includes('remote') && !city) return { location_type: 'Remote' };
  if (lower.includes('hybrid'))
    return { location_type: 'Hybrid', location_city: city };
  return { location_type: 'On-site', location_city: city };
}

export default function WatchlistPage() {
  return (
    <AuthGuard>
      <Watchlist />
    </AuthGuard>
  );
}

function Watchlist() {
  const router = useRouter();
  const { user } = useAuth();
  const { companies, loading, error, refetch, addCompany, editCompany, deleteCompany } =
    useWatchlist(user);

  const [kindFilter, setKindFilter] = useState<WatchlistKind | 'All'>('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // The notification bell can request a specific watchlist entry's detail
  // modal — via sessionStorage on navigation, or a live event if already here.
  useEffect(() => {
    try {
      const id = sessionStorage.getItem('trackitt-open-watch');
      if (id) {
        sessionStorage.removeItem('trackitt-open-watch');
        setPendingOpenId(id);
      }
    } catch {
      /* ignore */
    }
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) setPendingOpenId(id);
    };
    window.addEventListener('trackitt:open-watch', onOpen);
    return () => window.removeEventListener('trackitt:open-watch', onOpen);
  }, []);

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

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      if (kindFilter !== 'All' && (c.kind ?? 'Company') !== kindFilter) return false;
      if (q) {
        const haystack = `${c.company_name} ${c.role || ''} ${c.industry || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [companies, kindFilter, search]);

  const countFor = (k: WatchlistKind | 'All') =>
    k === 'All'
      ? companies.length
      : companies.filter((c) => (c.kind ?? 'Company') === k).length;

  // Keep the detail modal in sync with edits / deletions.
  useEffect(() => {
    if (modal.kind === 'detail') {
      const current = companies.find((c) => c.id === modal.company.id);
      if (!current) setModal({ kind: 'closed' });
      else if (current !== modal.company)
        setModal({ kind: 'detail', company: current, originRect: modal.originRect });
    }
  }, [companies, modal]);

  // Once companies are loaded, open the entry the bell requested.
  useEffect(() => {
    if (!pendingOpenId) return;
    const company = companies.find((c) => c.id === pendingOpenId);
    if (company) {
      setModal({ kind: 'detail', company, originRect: null });
      setPendingOpenId(null);
    }
  }, [pendingOpenId, companies]);

  const handleSave = async (data: WatchlistInput) => {
    if (modal.kind === 'edit') {
      await editCompany(modal.company.id, data);
    } else {
      await addCompany(data);
    }
    setModal({ kind: 'closed' });
  };

  const handleDelete = async () => {
    if (modal.kind !== 'delete') return;
    await deleteCompany(modal.company.id);
    setModal({ kind: 'closed' });
  };

  // "Promote" hands the entry to the Application Tracker, which opens the
  // Add Application modal pre-filled from sessionStorage. Everything already
  // captured here — company, role, link, location, note — carries over so
  // the user never types it twice.
  const handlePromote = (c: WatchlistCompany) => {
    const isJob = (c.kind ?? 'Company') === 'Job';
    sessionStorage.setItem(
      'trackitt-promote',
      JSON.stringify({
        company_name: c.company_name,
        industry: c.industry,
        personal_note: c.note,
        jd_url: c.website_url,
        ...(isJob ? { role: c.role } : {}),
        ...parseLocation(c.location),
      }),
    );
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-page">
      <div className="sticky top-0 z-40 w-full flex flex-col">
        <AppHeader />

        {/* Controls bar */}
        <div className="bg-page">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-10 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 -m-1">
            {(['All', 'Company', 'Job'] as (WatchlistKind | 'All')[]).map(
              (k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKindFilter(k)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm transition-all duration-200 ease-out ${
                    kindFilter === k
                      ? 'bg-accent font-semibold text-[#2d3a3a]'
                      : 'font-medium text-secondary border border-[rgb(var(--rgb-secondary)_/_0.25)] bg-primary hover:border-accent hover:scale-[1.03]'
                  }`}
                >
                  {k === 'All'
                    ? 'All'
                    : k === 'Company'
                      ? 'Companies'
                      : 'Jobs'}{' '}
                  ({countFor(k)})
                </button>
              ),
            )}
          </div>

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
              aria-label="Search watchlist"
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
            onClick={() => setModal({ kind: 'add' })}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            className="inline-flex items-center gap-1.5 bg-accent text-secondary px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap"
          >
            <span aria-hidden="true">+</span>
            <span className="hidden sm:inline">Add to Watchlist</span>
            <span className="sm:hidden">Add</span>
          </motion.button>
        </div>
      </div>
      </div>

      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
        {loading ? (
          <div className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-primary rounded-2xl p-5 shadow-card-accent h-44"
                style={{ border: '1px solid rgb(var(--rgb-secondary) / 0.12)' }}
              >
                <div className="h-5 w-2/3 rounded-md shimmer-bg animate-shimmer" />
                <div className="h-3 w-1/3 rounded-md shimmer-bg animate-shimmer mt-3" />
                <div className="h-3 w-full rounded-md shimmer-bg animate-shimmer mt-6" />
                <div className="h-3 w-4/5 rounded-md shimmer-bg animate-shimmer mt-2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <CenteredMessage
            title="Couldn't load your watchlist"
            body={error}
            actionLabel="Retry"
            onAction={() => void refetch()}
          />
        ) : visible.length === 0 ? (
          search.trim() ? (
            <NoSearchResults
              query={search.trim()}
              onClear={() => setSearch('')}
            />
          ) : (
            <CenteredMessage
              title={
                kindFilter === 'All'
                  ? 'Nothing on your radar yet'
                  : 'No matches for this filter'
              }
              body={
                kindFilter === 'All'
                  ? 'Spot a company — or a specific job post — you might apply to someday? Park it here before it slips your mind.'
                  : 'Adjust the filter, or add a new entry.'
              }
              actionLabel="+ Add to Watchlist"
              onAction={() => setModal({ kind: 'add' })}
            />
          )
        ) : (
          <motion.div
            layout
            key={kindFilter}
            className="grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-grid-fade"
          >
            <AnimatePresence mode="popLayout">
              {visible.map((c, idx) => (
                <CompanyCard
                  key={c.id}
                  company={c}
                  index={idx}
                  onOpen={(rect) =>
                    setModal({ kind: 'detail', company: c, originRect: rect })
                  }
                  onPromote={() => handlePromote(c)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <WatchlistDetailModal
        open={modal.kind === 'detail'}
        company={modal.kind === 'detail' ? modal.company : null}
        originRect={modal.kind === 'detail' ? modal.originRect : null}
        onClose={() => setModal({ kind: 'closed' })}
        onEdit={() =>
          modal.kind === 'detail' &&
          setModal({ kind: 'edit', company: modal.company })
        }
        onDelete={() =>
          modal.kind === 'detail' &&
          setModal({ kind: 'delete', company: modal.company })
        }
        onPromote={() =>
          modal.kind === 'detail' && handlePromote(modal.company)
        }
      />

      <AddCompanyModal
        open={modal.kind === 'add' || modal.kind === 'edit'}
        initialCompany={modal.kind === 'edit' ? modal.company : null}
        onClose={() => setModal({ kind: 'closed' })}
        onSave={handleSave}
      />

      <DeleteConfirmModal
        open={modal.kind === 'delete'}
        companyName={modal.kind === 'delete' ? modal.company.company_name : ''}
        variant="watchlist"
        onCancel={() => setModal({ kind: 'closed' })}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function CompanyCard({
  company,
  index,
  onOpen,
  onPromote,
}: {
  company: WatchlistCompany;
  index: number;
  onOpen: (rect: DOMRect) => void;
  onPromote: () => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  return (
    <motion.article
      ref={cardRef as any}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.25,
          type: 'spring',
          bounce: 0.1,
          delay: Math.min(index, 20) * 0.05,
        },
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={() => onOpen(cardRef.current!.getBoundingClientRect())}
      tabIndex={0}
      role="button"
      aria-label={`Open details for ${company.company_name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(cardRef.current!.getBoundingClientRect());
        }
      }}
      className="group relative bg-primary rounded-2xl p-5 cursor-pointer transition-[box-shadow,border-color] duration-300 shadow-card-accent hover:shadow-card-accent-hover flex flex-col gap-3"
      style={{
        border: '1px solid rgb(var(--rgb-secondary) / 0.12)',
        borderRadius: 16,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 200, 87, 0.7)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgb(var(--rgb-secondary) / 0.12)';
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className="font-display font-bold text-xl text-secondary leading-tight truncate"
            title={company.company_name}
          >
            {company.company_name}
          </h3>
          {company.industry && (
            <p
              className="text-xs mt-0.5 truncate"
              style={{ color: 'rgb(var(--rgb-ink) / 0.6)' }}
            >
              {company.industry}
            </p>
          )}
        </div>
        <span
          className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={
            (company.kind ?? 'Company') === 'Job'
              ? { background: 'rgba(255, 200, 87, 0.3)', color: 'var(--color-ink)' }
              : {
                  background: 'rgb(var(--rgb-secondary) / 0.1)',
                  color: 'var(--color-ink)',
                }
          }
        >
          {(company.kind ?? 'Company') === 'Job' ? 'Job' : 'Company'}
        </span>
      </div>

      {(company.kind ?? 'Company') === 'Job' && company.role && (
        <p
          className="text-sm font-semibold text-secondary truncate -mt-1"
          title={company.role}
        >
          {company.role}
        </p>
      )}

      {company.location && (
        <span
          className="inline-flex items-center gap-1.5 text-xs"
          style={{ color: 'rgb(var(--rgb-ink) / 0.7)' }}
        >
          <PinIcon />
          {company.location}
        </span>
      )}

      {company.note && (
        <p
          className="text-xs leading-relaxed line-clamp-2"
          style={{ color: 'rgb(var(--rgb-ink) / 0.7)' }}
        >
          {company.note}
        </p>
      )}

      <div
        className="mt-auto flex items-center justify-between gap-2 pt-3"
        style={{ borderTop: '1px solid var(--color-accent)' }}
      >
        <span
          className="text-[11px] truncate"
          style={{ color: 'rgb(var(--rgb-ink) / 0.5)' }}
        >
          Added {formatDateShort(company.created_at.slice(0, 10))}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {company.website_url && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.open(company.website_url, '_blank', 'noopener,noreferrer');
              }}
              aria-label="Open link"
              title={
                (company.kind ?? 'Company') === 'Job'
                  ? 'Open job post'
                  : 'Open website'
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/45 hover:bg-accent text-[color:var(--color-ink)] hover:text-[#2d3a3a] transition-all duration-200 ease-out hover:scale-[1.05]"
            >
              <ExternalLinkIcon />
              {(company.kind ?? 'Company') === 'Job' ? 'Post' : 'Site'}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPromote();
            }}
            title="Start an application for this company"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/45 hover:bg-accent text-[color:var(--color-ink)] hover:text-[#2d3a3a] transition-all duration-200 ease-out hover:scale-[1.05]"
          >
            Apply →
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function CenteredMessage({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <h2 className="font-display font-bold text-2xl text-secondary mb-2">
        {title}
      </h2>
      <p
        className="mb-6 max-w-sm text-sm"
        style={{ color: 'rgb(var(--rgb-ink) / 0.65)' }}
      >
        {body}
      </p>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center gap-2 bg-accent text-secondary px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ease-out hover:scale-[1.03]"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 14s4.5-3.6 4.5-7A4.5 4.5 0 003.5 7c0 3.4 4.5 7 4.5 7z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="7" r="1.6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.5 3H3v10h10V9.5M9.5 2.5h4v4M13 3L7.5 8.5"
        stroke="currentColor"
        strokeWidth="1.6"
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
        Try a different search, or clear it to see all items.
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

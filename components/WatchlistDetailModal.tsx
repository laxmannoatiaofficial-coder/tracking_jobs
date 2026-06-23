'use client';

import { useEffect, useState } from 'react';
import type { WatchlistCompany } from '@/types';
import { formatDate } from '@/utils/helpers';
import { Modal } from './Modal';

interface WatchlistDetailModalProps {
  open: boolean;
  company: WatchlistCompany | null;
  originRect?: DOMRect | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPromote: () => void;
}

export function WatchlistDetailModal({
  open,
  company,
  originRect,
  onClose,
  onEdit,
  onDelete,
  onPromote,
}: WatchlistDetailModalProps) {
  // Keep the last company around while the close animation plays.
  const [cached, setCached] = useState<WatchlistCompany | null>(company);
  useEffect(() => {
    if (company) setCached(company);
  }, [company]);

  const c = company || cached;
  if (!c) return null;

  const isJob = (c.kind ?? 'Company') === 'Job';

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="watchlist-detail-title"
      widthClass="max-w-xl"
      originRect={originRect}
    >
      <header className="flex items-start justify-between gap-4 p-6 bg-secondary rounded-t-3xl">
        <div className="min-w-0 flex-1">
          <h2
            id="watchlist-detail-title"
            className="font-display font-bold text-2xl sm:text-3xl text-primary leading-tight break-words"
          >
            {c.company_name}
          </h2>
          {c.industry && (
            <p
              className="text-sm mt-1"
              style={{ color: 'rgb(var(--rgb-on-dark) / 0.7)' }}
            >
              {c.industry}
            </p>
          )}
          <span
            className="inline-block mt-3 px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={
              isJob
                ? { background: 'rgba(255, 200, 87, 0.3)', color: '#ffc857' }
                : {
                    background: 'rgb(244 246 248 / 0.15)',
                    color: 'rgb(244 246 248 / 0.85)',
                  }
            }
          >
            {isJob ? 'Job on watch' : 'Company on watch'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit entry"
            title="Edit"
            className="press p-2 rounded-full border border-transparent hover:border-accent hover:bg-accent/25 hover:scale-110"
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="press p-2 rounded-full border border-transparent hover:border-accent hover:bg-accent/25 hover:scale-110"
          >
            <CloseIcon />
          </button>
        </div>
      </header>

      <div className="overflow-y-auto scroll-area px-6 py-5 flex-1">
        <dl className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-6 gap-y-3 text-sm">
          {isJob && c.role && <Row label="Role" value={c.role} />}
          {c.industry && <Row label="Industry" value={c.industry} />}
          {c.location && <Row label="Location" value={c.location} />}
          {c.website_url && (
            <Row
              label={isJob ? 'Job Post' : 'Website'}
              value={
                <a
                  href={c.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press inline-block font-semibold text-secondary underline decoration-accent decoration-2 underline-offset-4 hover:text-accent hover:scale-[1.03] break-all origin-left"
                >
                  {isJob ? 'View Job Post →' : 'Open Website →'}
                </a>
              }
            />
          )}
          <Row label="Added" value={formatDate(c.created_at.slice(0, 10))} />
        </dl>

        {c.note && (
          <div className="mt-6">
            <h3
              className="text-xs uppercase tracking-wider mb-2 font-semibold"
              style={{ color: 'rgb(var(--rgb-ink) / 0.55)' }}
            >
              {isJob ? 'Why this job' : 'Why this company'}
            </h3>
            <div
              className="p-4 rounded-2xl text-sm text-secondary whitespace-pre-wrap"
              style={{
                background: 'rgb(var(--rgb-secondary) / 0.05)',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              {c.note}
            </div>
          </div>
        )}
      </div>

      <footer
        className="flex items-center justify-between gap-3 p-5"
        style={{ borderTop: '1px solid rgb(var(--rgb-secondary) / 0.12)' }}
      >
        <button
          type="button"
          onClick={onDelete}
          className="press px-4 py-2 rounded-full text-sm font-semibold border border-[#dc2626] hover:border-accent hover:scale-[1.05]"
          style={{ color: '#dc2626' }}
        >
          Remove
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="press px-4 py-2 rounded-full text-sm font-semibold border border-[rgb(var(--rgb-secondary)_/_0.4)] hover:border-accent hover:scale-[1.05]"
            style={{ color: 'var(--color-ink)' }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onPromote}
            title="Start an application for this entry"
            className="press px-5 py-2 rounded-full text-sm font-semibold bg-accent text-secondary hover:scale-[1.03]"
          >
            Apply →
          </button>
        </div>
      </footer>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt
        className="font-semibold text-xs uppercase tracking-wider pt-0.5"
        style={{ color: 'rgb(var(--rgb-ink) / 0.55)' }}
      >
        {label}
      </dt>
      <dd className="text-secondary break-words">{value}</dd>
    </>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.5 2.5l2 2L5 13l-2.5.5L3 11l8.5-8.5z"
        stroke="var(--color-on-dark)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 3.5l9 9M12.5 3.5l-9 9"
        stroke="var(--color-on-dark)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

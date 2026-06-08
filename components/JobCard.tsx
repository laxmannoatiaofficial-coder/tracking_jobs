'use client';

import { useEffect, useRef, useState } from 'react';
import type { JobApplication, JobStatus } from '@/types';
import { STATUS_OPTIONS } from '@/types';
import {
  formatDateShort,
  formatLocation,
  getFollowUpState,
} from '@/utils/helpers';
import { StatusBadge } from './StatusBadge';

interface JobCardProps {
  job: JobApplication;
  index: number;
  onOpen: () => void;
  onOpenJd: () => void;
  onStatusChange: (id: string, status: JobStatus) => void;
}

export function JobCard({
  job,
  index,
  onOpen,
  onOpenJd,
  onStatusChange,
}: JobCardProps) {
  const followUp = getFollowUpState(job.follow_up_date);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [statusOpen]);

  const followUpColor =
    followUp === 'overdue'
      ? '#fca5a5' // red-300, readable on dark teal footer (both themes)
      : followUp === 'today'
        ? '#fcd34d' // amber-300
        : 'rgb(var(--rgb-on-dark) / 0.7)'; // light text @ 70% — footer is dark in both modes

  const downloadResume = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!job.resume_url) return;
    window.open(job.resume_url, '_blank', 'noopener,noreferrer');
  };

  const hasJd = Boolean(job.jd_url || job.jd_text);

  const openJd = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Text JD opens the detail modal (auto-expanded); URL JD opens in a new tab.
    if (job.jd_text) {
      onOpenJd();
    } else if (job.jd_url) {
      window.open(job.jd_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <article
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open details for ${job.company_name} — ${job.role}`}
      className={`group relative bg-primary rounded-2xl p-5 cursor-pointer animate-card-in transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:scale-[1.015] shadow-card-accent hover:shadow-card-accent-hover flex flex-col gap-3 overflow-visible ${
        statusOpen ? 'z-30' : ''
      }`}
      style={{
        border: '1px solid rgb(var(--rgb-secondary) / 0.12)',
        animationDelay: `${Math.min(index, 20) * 50}ms`,
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
            title={job.company_name}
          >
            {job.company_name}
          </h3>
          {job.industry && (
            <p
              className="text-xs mt-0.5 truncate"
              style={{ color: 'rgb(var(--rgb-ink) / 0.6)' }}
            >
              {job.industry}
            </p>
          )}
        </div>

        {/* Status dropdown trigger */}
        <div
          ref={statusRef}
          className="relative shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setStatusOpen((v) => !v);
            }}
            aria-haspopup="menu"
            aria-expanded={statusOpen}
            aria-label={`Change status (current: ${job.status})`}
            title="Change status"
            className="flex items-center gap-1 rounded-full p-0.5 -m-0.5 hover:bg-secondary/5 transition-colors cursor-pointer"
          >
            <StatusBadge status={job.status} />
            <span
              className="inline-flex items-center justify-center w-4 h-4"
              style={{ color: 'rgb(var(--rgb-ink) / 0.55)' }}
              aria-hidden="true"
            >
              <ChevronDown />
            </span>
          </button>

          {statusOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 min-w-[160px] bg-primary rounded-xl shadow-menu z-20 overflow-hidden animate-modal-in"
              style={{ border: '1px solid rgb(var(--rgb-secondary) / 0.12)' }}
            >
              {STATUS_OPTIONS.map((s) => {
                const isCurrent = s === job.status;
                return (
                  <button
                    key={s}
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatusOpen(false);
                      if (!isCurrent) onStatusChange(job.id, s);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/15"
                  >
                    <StatusBadge status={s} />
                    {isCurrent && (
                      <span
                        aria-hidden="true"
                        className="text-xs"
                        style={{ color: 'rgb(var(--rgb-ink) / 0.55)' }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-secondary">{job.role}</p>
        {job.ctc && (
          <p
            className="text-xs mt-0.5"
            style={{ color: 'rgb(var(--rgb-ink) / 0.55)' }}
          >
            {job.ctc}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className="px-2.5 py-0.5 rounded-full font-semibold"
          style={{
            background: 'rgba(255, 200, 87, 0.3)',
            color: 'var(--color-ink)',
          }}
        >
          {job.role_type}
        </span>
        <span style={{ color: 'rgb(var(--rgb-ink) / 0.6)' }}>
          {formatLocation(job)}
        </span>
      </div>

      <div className="flex items-end justify-between gap-2 mt-auto -mx-5 -mb-5 px-5 py-3 bg-footer rounded-b-2xl">
        <div className="flex flex-col gap-1 min-w-0">
          <span
            className="text-xs"
            style={{ color: 'rgb(var(--rgb-on-dark) / 0.7)' }}
          >
            Applied {formatDateShort(job.date_of_application)}
          </span>
          {/* Always reserve this row so footer height is identical across cards */}
          <span
            className={`inline-flex items-center gap-1 text-xs ${
              followUp === 'today' || followUp === 'overdue'
                ? 'animate-pulse'
                : ''
            }`}
            style={{
              color: followUpColor,
              visibility: followUp ? 'visible' : 'hidden',
            }}
            aria-hidden={!followUp}
          >
            <CalendarIcon />
            Follow-up {followUp ? formatDateShort(job.follow_up_date) : '—'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasJd && (
            <button
              type="button"
              onClick={openJd}
              aria-label="Open job description"
              title="Open job description"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent text-secondary transition-all duration-200 ease-out hover:scale-[1.05]"
            >
              <ExternalLinkIcon />
              JD
            </button>
          )}
          {job.resume_url && (
            <button
              type="button"
              onClick={downloadResume}
              aria-label="Open resume"
              title="Open resume"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent text-secondary transition-all duration-200 ease-out hover:scale-[1.05]"
            >
              <PdfIcon />
              Resume
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
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

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="2"
        y="3.5"
        width="12"
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2 7h12M5.5 2v3M10.5 2v3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
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

function PdfIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 2h6l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 2v3h3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import type { JobApplication, JobStatus } from '@/types';
import { STATUS_OPTIONS } from '@/types';
import {
  formatCompensationDisplay,
  formatDateShort,
  formatLocation,
  getFollowUpState,
} from '@/utils/helpers';
import { StatusBadge } from './StatusBadge';

interface JobCardProps {
  job: JobApplication;
  index: number;
  onOpen: (rect: DOMRect) => void;
  onOpenJd: (rect: DOMRect) => void;
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
  const cardRef = useRef<HTMLElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Scroll shrink effect as card goes under sticky header (header is ~140px tall)
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ['start 160px', 'start 0px'],
  });
  
  const scrollScale = useTransform(scrollYProgress, [0, 1], [1, 0.85]);
  const scrollOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.3]);

  const isPointerInHoverZone = useCallback((x: number, y: number) => {
    const hit = (el: HTMLElement | null, topPad = 0) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return (
        x >= r.left &&
        x <= r.right &&
        y >= r.top - topPad &&
        y <= r.bottom
      );
    };
    return hit(cardRef.current) || hit(menuRef.current, 10);
  }, []);

  // Close when the cursor leaves both the card and the dropdown menu.
  useEffect(() => {
    if (!statusOpen) return;
    const onMove = (e: MouseEvent) => {
      if (!isPointerInHoverZone(e.clientX, e.clientY)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, [statusOpen, isPointerInHoverZone]);

  useEffect(() => {
    if (!statusOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (cardRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setStatusOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [statusOpen]);

  const followUpColor =
    followUp === 'overdue'
      ? '#dc2626' // matches the detail modal — row now sits on the card surface
      : followUp === 'today'
        ? '#d97706'
        : 'rgb(var(--rgb-ink) / 0.65)';

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
      onOpenJd(cardRef.current!.getBoundingClientRect());
    } else if (job.jd_url) {
      window.open(job.jd_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div 
      ref={wrapperRef} 
      style={{ scale: scrollScale, opacity: scrollOpacity, transformOrigin: 'top center' }}
      className="relative h-full"
    >
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: 0.25, type: 'spring', bounce: 0.1, delay: Math.min(index, 20) * 0.05 },
        }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ scale: 1.015, y: -2 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        ref={cardRef as any}
        onClick={() => {
          // While the status dropdown is open, a click on the card only
          // dismisses the dropdown — it must not open the detail modal.
          if (statusOpen) {
            setStatusOpen(false);
            return;
          }
          onOpen(cardRef.current!.getBoundingClientRect());
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (statusOpen) {
              setStatusOpen(false);
              return;
            }
            onOpen(cardRef.current!.getBoundingClientRect());
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Open details for ${job.company_name} — ${job.role}`}
        className={`group relative h-full bg-primary rounded-2xl p-5 cursor-pointer transition-[box-shadow,border-color] duration-300 shadow-card-accent hover:shadow-card-accent-hover flex flex-col gap-3 overflow-visible ${
          statusOpen ? 'z-30' : ''
        }`}
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
      {/* Header — dark band with company, role, and status */}
      <div className="flex items-start justify-between gap-3 -mx-5 -mt-5 px-5 py-4 bg-secondary rounded-t-2xl">
        <div className="min-w-0 flex-1">
          <h3
            className="font-display font-bold text-xl text-primary leading-tight truncate"
            title={job.company_name}
          >
            {job.company_name}
          </h3>
          <p
            className="text-xs mt-0.5 truncate min-h-[16px]"
            style={{ color: 'rgb(var(--rgb-on-dark) / 0.7)' }}
            title={job.industry || 'Not specified'}
          >
            {job.industry || '\u00A0'}
          </p>
        </div>

        {/* Status dropdown trigger */}
        <div
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
            className="flex items-center gap-1 rounded-full pl-1 pr-1.5 py-1 -my-1 -mx-1 bg-white/15 border border-white/40 hover:border-accent hover:bg-white/25 hover:scale-[1.05] transition-all duration-200 ease-out cursor-pointer"
          >
            <StatusBadge status={job.status} />
            <span
              className="inline-flex items-center justify-center w-4 h-4"
              style={{ color: 'rgb(var(--rgb-on-dark) / 0.7)' }}
              aria-hidden="true"
            >
              <ChevronDown />
            </span>
          </button>

          <AnimatePresence>
          {statusOpen && (
            <motion.div
              ref={menuRef as any}
              initial={{ scaleY: 0, opacity: 0.6 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={{ scaleY: 0, opacity: 0, transition: { duration: 0.14, ease: 'easeIn' } }}
              transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }}
              role="menu"
              className="dropdown-panel absolute right-0 mt-2 min-w-[160px] rounded-xl z-20 overflow-hidden"
              style={{ transformOrigin: 'top right' }}
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
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      <p
        className="text-base font-semibold text-secondary truncate"
        title={job.role}
      >
        {job.role}
      </p>

      <span
        className="inline-flex items-center gap-1.5 text-xs"
        style={{ color: 'rgb(var(--rgb-ink) / 0.7)' }}
      >
        <MoneyIcon />
        {job.ctc ? formatCompensationDisplay(job.ctc, job.compensation_period) : 'Not disclosed'}
      </span>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span
          className="inline-flex items-center gap-1.5"
          style={{ color: 'rgb(var(--rgb-ink) / 0.7)' }}
        >
          <BriefcaseIcon />
          {job.role_type}
        </span>
        <span
          className="inline-flex items-center gap-1.5"
          style={{ color: 'rgb(var(--rgb-ink) / 0.7)' }}
        >
          <PinIcon />
          {formatLocation(job)}
        </span>
      </div>

      <div
        className="mt-auto flex items-center justify-between gap-2 pt-3 min-h-[44px]"
        style={{ borderTop: '1px solid var(--color-accent)' }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            className="text-[11px] truncate shrink-0"
            style={{ color: 'rgb(var(--rgb-ink) / 0.5)' }}
          >
            Applied {formatDateShort(job.date_of_application)}
          </span>
          {/* Simple reminder — the tick-off control lives in the detail modal */}
          {followUp && !job.follow_up_done && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold truncate ${
                followUp === 'today' || followUp === 'overdue'
                  ? 'animate-pulse'
                  : ''
              }`}
              style={{ color: followUpColor }}
            >
              <CalendarIcon />
              Follow-up {formatDateShort(job.follow_up_date)}
            </span>
          )}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasJd && (
            <button
              type="button"
              onClick={openJd}
              aria-label="Open job description"
              title="Open job description"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/45 hover:bg-accent text-[color:var(--color-ink)] hover:text-[#2d3a3a] transition-all duration-200 ease-out hover:scale-[1.05]"
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
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/45 hover:bg-accent text-[color:var(--color-ink)] hover:text-[#2d3a3a] transition-all duration-200 ease-out hover:scale-[1.05]"
            >
              <PdfIcon />
              Resume
            </button>
          )}
          </div>
      </div>
    </motion.article>
    </motion.div>
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

function MoneyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="1.5"
        y="4"
        width="13"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="2"
        y="5"
        width="12"
        height="8.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M6 5V3.5A1.5 1.5 0 017.5 2h1A1.5 1.5 0 0110 3.5V5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
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

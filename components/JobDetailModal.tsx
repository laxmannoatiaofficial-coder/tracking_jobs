'use client';

import { useEffect, useRef, useState } from 'react';
import type { JobApplication } from '@/types';
import {
  formatDate,
  formatLocation,
  getFollowUpState,
} from '@/utils/helpers';
import { Modal } from './Modal';
import { StatusBadge } from './StatusBadge';

interface JobDetailModalProps {
  open: boolean;
  job: JobApplication | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  focusJd?: boolean;
}

export function JobDetailModal({
  open,
  job,
  onClose,
  onEdit,
  onDelete,
  focusJd = false,
}: JobDetailModalProps) {
  const [jdExpanded, setJdExpanded] = useState(false);
  const jdSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (focusJd && job?.jd_text) {
      setJdExpanded(true);
      // Scroll the JD section into view after the modal mounts
      setTimeout(() => {
        jdSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 50);
    } else {
      setJdExpanded(false);
    }
  }, [open, focusJd, job?.jd_text]);

  if (!job) return null;
  const followUp = getFollowUpState(job.follow_up_date);
  const followUpColor =
    followUp === 'overdue'
      ? '#dc2626'
      : followUp === 'today'
        ? '#d97706'
        : 'rgb(var(--rgb-secondary) / 0.75)';

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="job-detail-title"
      widthClass="max-w-2xl"
    >
      <header className="flex items-start justify-between gap-4 p-6 bg-secondary rounded-t-3xl">
        <div className="min-w-0 flex-1">
          <h2
            id="job-detail-title"
            className="font-display font-bold text-2xl sm:text-3xl text-primary leading-tight break-words"
          >
            {job.company_name}
          </h2>
          {job.industry && (
            <p
              className="text-sm mt-1"
              style={{ color: 'rgb(var(--rgb-on-dark) / 0.7)' }}
            >
              {job.industry}
            </p>
          )}
          <div className="mt-3">
            <StatusBadge status={job.status} size="md" />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit application"
            title="Edit"
            className="p-2 rounded-full hover:bg-accent/25 transition-colors"
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="p-2 rounded-full hover:bg-accent/25 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>
      </header>

      <div className="overflow-y-auto scroll-area px-6 py-5 flex-1">
        <dl className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-6 gap-y-3 text-sm">
          <Row label="Role" value={job.role} />
          <Row label="Type" value={job.role_type} />
          {job.industry && <Row label="Industry" value={job.industry} />}
          <Row label="Location" value={formatLocation(job)} />
          {job.ctc && <Row label="CTC" value={job.ctc} />}
          <Row label="Date Applied" value={formatDate(job.date_of_application)} />
          {job.follow_up_date && (
            <Row
              label="Follow-up Date"
              value={
                <span
                  className={
                    followUp === 'today' || followUp === 'overdue'
                      ? 'animate-pulse'
                      : ''
                  }
                  style={{ color: followUpColor }}
                >
                  {formatDate(job.follow_up_date)}
                  {followUp === 'overdue' && ' · overdue'}
                  {followUp === 'today' && ' · today'}
                </span>
              }
            />
          )}
          {job.jd_url && !job.jd_text && (
            <Row
              label="JD Link"
              value={
                <a
                  href={job.jd_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-secondary underline decoration-accent decoration-2 underline-offset-4 hover:text-accent transition-colors break-all"
                >
                  View Job Description →
                </a>
              }
            />
          )}
          {job.resume_url && (
            <Row
              label="Resume"
              value={
                <a
                  href={job.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-secondary underline decoration-accent decoration-2 underline-offset-4 hover:text-accent transition-colors break-all"
                >
                  {job.resume_file_name
                    ? `Download Resume (${job.resume_file_name})`
                    : 'Open Resume Link →'}
                </a>
              }
            />
          )}
        </dl>

        {job.jd_text && (
          <div ref={jdSectionRef} className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3
                className="text-xs uppercase tracking-wider font-semibold"
                style={{ color: 'rgb(var(--rgb-ink) / 0.55)' }}
              >
                Job Description
              </h3>
              <button
                type="button"
                onClick={() => setJdExpanded((v) => !v)}
                className="text-xs font-semibold underline decoration-accent decoration-2 underline-offset-4 hover:text-accent transition-colors"
                aria-expanded={jdExpanded}
              >
                {jdExpanded ? 'Show less' : 'Show more'}
              </button>
            </div>
            <div
              className={`p-4 rounded-2xl text-sm text-secondary whitespace-pre-wrap transition-all duration-200 ${
                jdExpanded ? '' : 'line-clamp-3'
              }`}
              style={{
                background: 'rgb(var(--rgb-secondary) / 0.05)',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              {job.jd_text}
            </div>
          </div>
        )}

        {job.personal_note && (
          <div className="mt-6">
            <h3
              className="text-xs uppercase tracking-wider mb-2 font-semibold"
              style={{ color: 'rgb(var(--rgb-ink) / 0.55)' }}
            >
              Personal Note
            </h3>
            <div
              className="p-4 rounded-2xl text-sm text-secondary whitespace-pre-wrap"
              style={{
                background: 'rgb(var(--rgb-secondary) / 0.05)',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              {job.personal_note}
            </div>
          </div>
        )}
      </div>

      <footer
        className="flex items-center justify-between p-5"
        style={{ borderTop: '1px solid rgb(var(--rgb-secondary) / 0.12)' }}
      >
        <button
          type="button"
          onClick={onDelete}
          className="px-4 py-2 rounded-full text-sm font-semibold transition-colors"
          style={{
            border: '1px solid #dc2626',
            color: '#dc2626',
          }}
        >
          Delete
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="px-5 py-2 rounded-full text-sm font-semibold bg-accent text-secondary transition-all duration-200 ease-out hover:scale-[1.03]"
        >
          Edit
        </button>
      </footer>
    </Modal>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
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

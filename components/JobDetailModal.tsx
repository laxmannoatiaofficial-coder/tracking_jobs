'use client';

import { useEffect, useRef, useState } from 'react';
import type { JobApplication } from '@/types';
import {
  formatCompensationDisplay,
  formatDate,
  formatLocation,
  getFollowUpState,
} from '@/utils/helpers';
import {
  draftFollowUp,
  interviewPrep,
  type FollowUpDraft,
  type InterviewPrep,
} from '@/utils/ai';
import { Modal } from './Modal';
import { StatusBadge } from './StatusBadge';

interface JobDetailModalProps {
  open: boolean;
  job: JobApplication | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFollowUpToggle: (id: string, done: boolean) => void;
  focusJd?: boolean;
  originRect?: DOMRect | null;
}

export function JobDetailModal({
  open,
  job,
  onClose,
  onEdit,
  onDelete,
  onFollowUpToggle,
  focusJd = false,
  originRect,
}: JobDetailModalProps) {
  const [cachedJob, setCachedJob] = useState<JobApplication | null>(job);

  useEffect(() => {
    if (job) setCachedJob(job);
  }, [job]);

  const displayJob = job || cachedJob;

  const [jdExpanded, setJdExpanded] = useState(false);
  const jdSectionRef = useRef<HTMLDivElement>(null);

  // AI Assist state.
  const [followUpResult, setFollowUpResult] = useState<FollowUpDraft | null>(
    null,
  );
  const [prepResult, setPrepResult] = useState<InterviewPrep | null>(null);
  const [aiBusy, setAiBusy] = useState<'follow-up' | 'prep' | null>(null);
  const [aiError, setAiError] = useState('');
  const [copied, setCopied] = useState(false);

  // Clear AI results when the modal switches to a different application.
  const jobId = displayJob?.id;
  useEffect(() => {
    setFollowUpResult(null);
    setPrepResult(null);
    setAiError('');
    setCopied(false);
  }, [jobId]);

  useEffect(() => {
    if (!open) return;
    if (focusJd && displayJob?.jd_text) {
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
  }, [open, focusJd, displayJob?.jd_text]);

  if (!displayJob) return null;
  const followUp = getFollowUpState(displayJob.follow_up_date);
  const followUpColor =
    followUp === 'overdue'
      ? '#dc2626'
      : followUp === 'today'
        ? '#d97706'
        : 'rgb(var(--rgb-secondary) / 0.75)';

  const runFollowUp = async () => {
    if (aiBusy) return;
    setAiBusy('follow-up');
    setAiError('');
    setFollowUpResult(null);
    try {
      setFollowUpResult(await draftFollowUp(displayJob));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setAiBusy(null);
    }
  };

  const runPrep = async () => {
    if (aiBusy) return;
    setAiBusy('prep');
    setAiError('');
    setPrepResult(null);
    try {
      setPrepResult(await interviewPrep(displayJob));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setAiBusy(null);
    }
  };

  const copyFollowUp = () => {
    if (!followUpResult) return;
    const text = `Subject: ${followUpResult.subject}\n\n${followUpResult.body}`;
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="job-detail-title"
      widthClass="max-w-2xl"
      originRect={originRect}
    >
      <header className="flex items-start justify-between gap-4 p-6 bg-secondary rounded-t-3xl">
        <div className="min-w-0 flex-1">
          <h2
            id="job-detail-title"
            className="font-display font-bold text-2xl sm:text-3xl text-primary leading-tight break-words"
          >
            {displayJob.company_name}
          </h2>
          {displayJob.industry && (
            <p
              className="text-sm mt-1"
              style={{ color: 'rgb(var(--rgb-on-dark) / 0.7)' }}
            >
              {displayJob.industry}
            </p>
          )}
          <div className="mt-3">
            <StatusBadge status={displayJob.status} size="md" />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit application"
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
          <Row label="Role" value={displayJob.role} />
          <Row label="Type" value={displayJob.role_type} />
          {displayJob.industry && <Row label="Industry" value={displayJob.industry} />}
          <Row label="Location" value={formatLocation(displayJob)} />
          {displayJob.ctc && (
            <Row
              label="Compensation"
              value={formatCompensationDisplay(displayJob.ctc, displayJob.compensation_period)}
            />
          )}
          <Row label="Date Applied" value={formatDate(displayJob.date_of_application)} />
          {displayJob.follow_up_date && (
            <Row
              label="Follow-up Date"
              value={
                displayJob.follow_up_done ? (
                  <span className="inline-flex flex-wrap items-center gap-2.5">
                    <span style={{ color: '#16a34a' }}>
                      {formatDate(displayJob.follow_up_date)} · follow-up
                      completed ✓
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onFollowUpToggle(displayJob.id, false)
                      }
                      className="press text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[rgb(var(--rgb-secondary)_/_0.35)] text-[color:var(--color-ink)] hover:border-accent hover:scale-[1.05]"
                    >
                      Undo
                    </button>
                  </span>
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-2.5">
                    <span
                      className={
                        followUp === 'today' || followUp === 'overdue'
                          ? 'animate-pulse'
                          : ''
                      }
                      style={{ color: followUpColor }}
                    >
                      {formatDate(displayJob.follow_up_date)}
                      {followUp === 'overdue' && ' · overdue'}
                      {followUp === 'today' && ' · today'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onFollowUpToggle(displayJob.id, true)
                      }
                      className="press inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white hover:scale-[1.05]"
                    >
                      <CheckIcon />
                      Mark as done
                    </button>
                  </span>
                )
              }
            />
          )}
          {displayJob.jd_url && !displayJob.jd_text && (
            <Row
              label="JD Link"
              value={
                <a
                  href={displayJob.jd_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press inline-block font-semibold text-secondary underline decoration-accent decoration-2 underline-offset-4 hover:text-accent hover:scale-[1.03] break-all origin-left"
                >
                  View Job Description →
                </a>
              }
            />
          )}
          {displayJob.resume_url && (
            <Row
              label="Resume"
              value={
                <a
                  href={displayJob.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press inline-block font-semibold text-secondary underline decoration-accent decoration-2 underline-offset-4 hover:text-accent hover:scale-[1.03] break-all origin-left"
                >
                  {displayJob.resume_file_name
                    ? `Download Resume (${displayJob.resume_file_name})`
                    : 'Open Resume Link →'}
                </a>
              }
            />
          )}
        </dl>

        {displayJob.jd_text && (
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
                className="press inline-block text-xs font-semibold underline decoration-accent decoration-2 underline-offset-4 hover:text-accent hover:scale-[1.05]"
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
              {displayJob.jd_text}
            </div>
          </div>
        )}

        {displayJob.personal_note && (
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
              {displayJob.personal_note}
            </div>
          </div>
        )}

        {/* AI Assist — follow-up draft + interview prep */}
        <div className="mt-6">
          <h3
            className="text-xs uppercase tracking-wider mb-2 font-semibold"
            style={{ color: 'rgb(var(--rgb-ink) / 0.55)' }}
          >
            AI Assist
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runFollowUp}
              disabled={aiBusy !== null}
              className="press inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-accent text-secondary hover:scale-[1.03] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {aiBusy === 'follow-up' && <AiSpinner />}
              ✨ Draft follow-up
            </button>
            <button
              type="button"
              onClick={runPrep}
              disabled={aiBusy !== null}
              className="press inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-[rgb(var(--rgb-secondary)_/_0.4)] hover:border-accent hover:scale-[1.03] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ color: 'var(--color-ink)' }}
            >
              {aiBusy === 'prep' && <AiSpinner />}
              ✨ Interview prep
            </button>
          </div>
          {aiError && (
            <p className="text-xs mt-2" style={{ color: '#dc2626' }}>
              {aiError}
            </p>
          )}

          {followUpResult && (
            <div
              className="mt-3 p-4 rounded-2xl text-sm"
              style={{ background: 'rgb(var(--rgb-secondary) / 0.05)' }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-semibold text-secondary">
                  Follow-up email
                </span>
                <button
                  type="button"
                  onClick={copyFollowUp}
                  className="press text-xs font-semibold px-2.5 py-1 rounded-full border border-[rgb(var(--rgb-secondary)_/_0.35)] hover:border-accent"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="font-semibold text-secondary">
                {followUpResult.subject}
              </p>
              <p
                className="text-secondary whitespace-pre-wrap mt-1"
                style={{ overflowWrap: 'anywhere' }}
              >
                {followUpResult.body}
              </p>
            </div>
          )}

          {prepResult && (
            <div
              className="mt-3 p-4 rounded-2xl text-sm text-secondary"
              style={{ background: 'rgb(var(--rgb-secondary) / 0.05)' }}
            >
              {prepResult.questions.length > 0 && (
                <>
                  <p className="font-semibold mb-1">Likely questions</p>
                  <ol className="list-decimal pl-5 space-y-1 mb-3">
                    {prepResult.questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ol>
                </>
              )}
              {prepResult.talking_points.length > 0 && (
                <>
                  <p className="font-semibold mb-1">Talking points</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {prepResult.talking_points.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <footer
        className="flex items-center justify-between p-5"
        style={{ borderTop: '1px solid rgb(var(--rgb-secondary) / 0.12)' }}
      >
        <button
          type="button"
          onClick={onDelete}
          className="press px-4 py-2 rounded-full text-sm font-semibold border border-[#dc2626] hover:border-accent hover:scale-[1.05]"
          style={{ color: '#dc2626' }}
        >
          Delete
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="press px-5 py-2 rounded-full text-sm font-semibold bg-accent text-secondary hover:scale-[1.03]"
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

function AiSpinner() {
  return (
    <span
      className="inline-block w-3.5 h-3.5 rounded-full animate-spin"
      style={{
        border: '2px solid rgb(var(--rgb-secondary) / 0.3)',
        borderTopColor: 'var(--color-secondary)',
      }}
      aria-hidden="true"
    />
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path
        d="M1.5 5.5L4 8l4.5-5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

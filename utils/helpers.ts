import type { CompensationPeriod, JobApplication } from '@/types';

export type FollowUpState = 'overdue' | 'today' | 'upcoming' | null;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function getFollowUpState(followUpDate: string): FollowUpState {
  if (!followUpDate) return null;
  const parts = followUpDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const follow = startOfDay(new Date(parts[0], parts[1] - 1, parts[2]));
  const today = startOfDay(new Date());
  const diff = follow.getTime() - today.getTime();
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  return 'upcoming';
}

/** Whole days from today to `iso` (YYYY-MM-DD). Negative = past. null if unparseable. */
export function daysUntilDate(iso: string): number | null {
  if (!iso) return null;
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const target = startOfDay(new Date(parts[0], parts[1] - 1, parts[2]));
  const today = startOfDay(new Date());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** Whole days since a timestamp (e.g. created_at). Used for stale-watchlist nudges. */
export function daysSince(timestamp: string): number {
  const then = new Date(timestamp).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.floor((Date.now() - then) / 86400000);
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return iso;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateShort(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return iso;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const COMPENSATION_SUFFIX_RE = /\s·\s(Monthly|Annual)$/;

export function formatCompensation(
  ctc: string,
  period?: CompensationPeriod | '' | null,
): string {
  const amount = ctc?.trim();
  if (!amount) return '';
  if (period === 'Annual') return `${amount} · Annual`;
  if (period === 'Monthly') return `${amount} · Monthly`;
  return amount;
}

/** Display variant: hides the period when the amount has no digits —
    "Not disclosed yet · Annual" reads as noise. Storage encoding must keep
    the period regardless, so encodeCompensationInCtc stays on
    formatCompensation. */
export function formatCompensationDisplay(
  ctc: string,
  period?: CompensationPeriod | '' | null,
): string {
  const amount = ctc?.trim();
  if (!amount) return '';
  if (!/\d/.test(amount)) return amount;
  return formatCompensation(amount, period);
}

/** When the DB has no compensation_period column, period is stored in ctc text. */
export function parseEncodedCompensation(ctc: string): {
  amount: string;
  period: CompensationPeriod | '';
} {
  const raw = ctc?.trim() ?? '';
  if (!raw) return { amount: '', period: '' };
  const match = raw.match(COMPENSATION_SUFFIX_RE);
  if (!match) return { amount: raw, period: '' };
  return {
    amount: raw.replace(COMPENSATION_SUFFIX_RE, '').trim(),
    period: match[1] as CompensationPeriod,
  };
}

export function encodeCompensationInCtc(
  ctc: string,
  period?: CompensationPeriod | '' | null,
): string {
  const amount = ctc?.trim() ?? '';
  if (!amount) return '';
  return formatCompensation(amount, period);
}

export function normalizeJobCompensation(
  job: JobApplication,
): JobApplication {
  if (job.compensation_period === 'Annual' || job.compensation_period === 'Monthly') {
    return job;
  }
  const parsed = parseEncodedCompensation(job.ctc);
  return {
    ...job,
    ctc: parsed.amount,
    compensation_period: parsed.period,
  };
}

export function formatLocation(job: JobApplication): string {
  if (job.location_type === 'Remote') return 'Remote';
  if (job.location_type === 'Hybrid') {
    return job.location_city ? `${job.location_city} · Hybrid` : 'Hybrid';
  }
  return job.location_city ? `${job.location_city} · On-site` : 'On-site';
}

export function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function truncateMiddle(s: string, maxLen = 18): string {
  if (s.length <= maxLen) return s;
  const half = Math.floor((maxLen - 1) / 2);
  return `${s.slice(0, half)}…${s.slice(-half)}`;
}

import type { JobApplication } from '@/types';

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

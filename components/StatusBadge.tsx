import type { JobStatus } from '@/types';

// Each status gets a CSS class — colors are defined in globals.css with
// brighter variants under `.dark` so they read clearly on dark surfaces too.
const CLASS_FOR: Record<JobStatus, string> = {
  Applied: 'badge-applied',
  Shortlisted: 'badge-shortlisted',
  Interviewing: 'badge-interviewing',
  Offered: 'badge-offered',
  Rejected: 'badge-rejected',
  Ghosted: 'badge-ghosted',
};

interface StatusBadgeProps {
  status: JobStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const sizing =
    size === 'md' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-0.5';
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${sizing} ${CLASS_FOR[status]}`}
    >
      {status}
    </span>
  );
}

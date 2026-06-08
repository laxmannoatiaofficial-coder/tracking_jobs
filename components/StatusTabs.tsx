'use client';

import type { JobApplication, StatusFilter } from '@/types';
import { STATUS_OPTIONS } from '@/types';

interface StatusFilterControlProps {
  jobs: JobApplication[];
  active: StatusFilter;
  onChange: (filter: StatusFilter) => void;
}

const ALL_OPTIONS: StatusFilter[] = ['All', ...STATUS_OPTIONS];

// Kept named `StatusTabs` to avoid touching imports — now renders as a dropdown.
export function StatusTabs({
  jobs,
  active,
  onChange,
}: StatusFilterControlProps) {
  const countFor = (s: StatusFilter) =>
    s === 'All' ? jobs.length : jobs.filter((j) => j.status === s).length;

  return (
    <select
      value={active}
      onChange={(e) => onChange(e.target.value as StatusFilter)}
      aria-label="Filter by status"
      className="bg-primary text-secondary text-sm rounded-full px-4 py-1.5 pr-9 cursor-pointer transition-all duration-200 ease-out hover:border-accent font-medium"
      style={{
        border: '1px solid rgb(var(--rgb-secondary) / 0.25)',
        appearance: 'none',
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path fill='%232D3A3A' d='M6 8L2 4h8z'/></svg>\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      }}
    >
      {ALL_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s} ({countFor(s)})
        </option>
      ))}
    </select>
  );
}

'use client';

import type { JobApplication, StatusFilter } from '@/types';
import { STATUS_OPTIONS } from '@/types';
import { SelectField } from './SelectField';

interface StatusFilterControlProps {
  jobs: JobApplication[];
  active: StatusFilter;
  onChange: (filter: StatusFilter) => void;
}

const ALL_OPTIONS: StatusFilter[] = ['All', ...STATUS_OPTIONS];

const pillClass =
  'w-auto bg-primary text-secondary text-sm rounded-full px-4 py-1.5 font-medium border border-[rgb(var(--rgb-secondary)_/_0.25)] hover:border-accent hover:scale-[1.03] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all duration-200 ease-out';

// Kept named `StatusTabs` to avoid touching imports — now renders as a dropdown.
export function StatusTabs({
  jobs,
  active,
  onChange,
}: StatusFilterControlProps) {
  const countFor = (s: StatusFilter) =>
    s === 'All' ? jobs.length : jobs.filter((j) => j.status === s).length;

  const options = ALL_OPTIONS.map((s) => ({
    value: s,
    label: `${s} (${countFor(s)})`,
  }));

  return (
    <SelectField
      value={active}
      onChange={onChange}
      options={options}
      className={pillClass}
      aria-label="Filter by status"
    />
  );
}

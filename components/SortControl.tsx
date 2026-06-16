'use client';

import type { SortOption } from '@/types';
import { SelectField } from './SelectField';

interface SortControlProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date-desc', label: 'Date Applied — Newest First' },
  { value: 'date-asc', label: 'Date Applied — Oldest First' },
  { value: 'company-asc', label: 'Company Name — A to Z' },
  { value: 'company-desc', label: 'Company Name — Z to A' },
];

const pillClass =
  'w-auto bg-primary text-secondary text-sm rounded-full px-4 py-1.5 font-medium border border-[rgb(var(--rgb-secondary)_/_0.25)] hover:border-accent hover:scale-[1.03] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all duration-200 ease-out';

export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <SelectField
      value={value}
      onChange={onChange}
      options={OPTIONS}
      className={pillClass}
      aria-label="Sort applications"
    />
  );
}

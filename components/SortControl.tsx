'use client';

import type { SortOption } from '@/types';

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

export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      aria-label="Sort applications"
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
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

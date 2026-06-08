'use client';

import type { StatusFilter } from '@/types';

interface EmptyStateProps {
  filter: StatusFilter;
  onAdd: () => void;
}

export function EmptyState({ filter, onAdd }: EmptyStateProps) {
  const subtext =
    filter === 'All'
      ? "The dream job won't apply itself — add your first one!"
      : `Nothing marked as ${filter} yet. Keep going!`;

  return (
    <div className="col-span-full flex flex-col items-center justify-center text-center py-20 px-6">
      <RocketIllustration />
      <h2 className="font-display font-bold text-2xl text-secondary mt-6 mb-2">
        No applications here yet
      </h2>
      <p
        className="mb-6 max-w-sm"
        style={{ color: 'rgb(var(--rgb-ink) / 0.6)' }}
      >
        {subtext}
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 bg-accent text-secondary px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ease-out hover:scale-[1.03]"
      >
        <span aria-hidden="true">+</span> Add Application
      </button>
    </div>
  );
}

function RocketIllustration() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="56" fill="rgba(255, 200, 87, 0.18)" />
      <path
        d="M60 22c12 8 22 22 22 36 0 6-2 12-6 16l-4-2-12 6-12-6-4 2c-4-4-6-10-6-16 0-14 10-28 22-36z"
        fill="var(--color-primary)"
        stroke="var(--color-secondary)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle
        cx="60"
        cy="52"
        r="6"
        fill="var(--color-accent)"
        stroke="var(--color-secondary)"
        strokeWidth="2.4"
      />
      <path
        d="M44 78l-6 10 10-2M76 78l6 10-10-2"
        stroke="var(--color-secondary)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M52 88l4 8 4-8 4 8 4-8"
        stroke="var(--color-accent)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

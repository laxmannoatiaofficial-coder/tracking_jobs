/**
 * Trackitt brand mark — a checkmark whose long arm sweeps up into a
 * forward arrow (accent arrowhead + swoosh). Dark strokes use
 * currentColor so the mark adapts to light or dark surfaces; the
 * accent pieces stay brand yellow.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      {/* Crossbar */}
      <path
        d="M17 16h19"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* Check sweeping into the arrow shaft */}
      <path
        d="M12 33l14 19c5.5-15 13-25 24-32"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Accent arrowhead */}
      <path d="M46 8l17 9.5L46 27z" fill="#FFC857" />
      {/* Accent swoosh */}
      <path
        d="M30 45c4-10 9-17.5 15-23"
        stroke="#FFC857"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Mark + wordmark lockup. Text size/color inherit from the parent. */
export function Logo({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="font-display font-extrabold tracking-tight">
        Trackitt
      </span>
    </span>
  );
}

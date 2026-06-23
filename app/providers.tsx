'use client';

import { MotionConfig } from 'framer-motion';

/**
 * App-wide motion context. `reducedMotion="user"` makes every framer-motion
 * animation automatically honor the OS "reduce motion" preference (transforms
 * collapse, opacity is kept), mirroring the CSS guard in globals.css.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

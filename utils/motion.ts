import type { Transition, Variants } from 'framer-motion';

/**
 * Shared motion vocabulary so every interaction across the app feels the same:
 * a snappy, slightly springy response on press and hover. Import these instead
 * of hand-tuning transitions per component.
 */

// Crisp spring for taps/hovers on buttons and chips.
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 24,
  mass: 0.7,
};

// Softer spring for larger surfaces (panels, cards).
export const springSoft: Transition = {
  type: 'spring',
  stiffness: 320,
  damping: 28,
  mass: 0.9,
};

// Standard tactile button feedback. Spread onto any motion.button / motion.a.
export const tactile = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.93 },
  transition: springSnappy,
} as const;

// Gentler variant for big primary CTAs where a 5% pop is too much.
export const tactileSubtle = {
  whileHover: { scale: 1.03, y: -1 },
  whileTap: { scale: 0.96 },
  transition: springSnappy,
} as const;

// Dropdown / popover reveal — grow from the top edge with a quick settle.
export const popoverReveal: Variants = {
  initial: { scaleY: 0, opacity: 0, y: -4 },
  animate: {
    scaleY: 1,
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 420, damping: 30, mass: 0.7 },
  },
  exit: {
    scaleY: 0,
    opacity: 0,
    transition: { duration: 0.13, ease: 'easeIn' },
  },
};

// Staggered list container — children cascade in for a satisfying reveal.
export const listStagger: Variants = {
  animate: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } },
};

// Individual list item used with `listStagger`.
export const listItem: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 500, damping: 30 },
  },
};

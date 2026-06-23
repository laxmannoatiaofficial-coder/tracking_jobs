'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from 'framer-motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  widthClass?: string;
  originRect?: DOMRect | null;
}

// Smooth decelerating grow on open (no spring bounce, so it reads as the card
// continuously morphing into the modal). Close mirrors it with a quick ease-in.
// Tuned snappy: a fast expo-out open and an even quicker accelerating close so
// the panel never lingers — important when one modal swaps straight to another.
const ZOOM_OPEN = { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const };
const ZOOM_CLOSE = { duration: 0.14, ease: [0.4, 0, 1, 1] as const };

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  widthClass = 'max-w-2xl',
  originRect,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute inset-0"
            style={{ background: 'rgb(var(--rgb-secondary) / 0.78)' }}
            onMouseDown={onClose}
            aria-hidden="true"
          />

          {originRect ? (
            <ZoomPanel originRect={originRect} widthClass={widthClass}>
              {children}
            </ZoomPanel>
          ) : (
            /* Regular scale-up path (no origin element) */
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className={`relative w-full ${widthClass} max-h-[92vh] sm:max-h-[90vh] bg-primary rounded-t-3xl sm:rounded-3xl flex flex-col shadow-modal overflow-hidden`}
              style={{ border: '1px solid rgba(255, 200, 87, 0.7)', borderRadius: 24 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Shared-element-style morph: the panel starts at the source card's exact
 * rectangle (independent X/Y scale, so its *shape* matches the card, not the
 * modal) and morphs to the modal's natural rectangle — and reverses on close.
 * A FLIP: measure the modal's natural box, transform it onto the card, then
 * animate the transform away. The inner content is counter-scaled so it stays
 * undistorted while the box morphs, and fades in/out to hide the brief clip.
 *
 * Separate component so its mount/unmount matches the panel (AnimatePresence),
 * and the mount-only effect always re-applies the start frame.
 */
function ZoomPanel({
  originRect,
  widthClass,
  children,
}: {
  originRect: DOMRect;
  widthClass: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scaleX = useMotionValue(1);
  const scaleY = useMotionValue(1);
  // Counter-scale for the content so it isn't stretched while the box morphs.
  const invX = useTransform(scaleX, (v) => 1 / v);
  const invY = useTransform(scaleY, (v) => 1 / v);
  // Card-aligned start frame, captured on open so close can reverse exactly.
  const [from, setFrom] = useState({ x: 0, y: 0, sx: 1, sy: 1 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const m = el.getBoundingClientRect();
    // Transform that maps the modal's natural box onto the card's box,
    // anchored at the top-left corner.
    const fx = originRect.left - m.left;
    const fy = originRect.top - m.top;
    const fsx = m.width > 0 ? originRect.width / m.width : 1;
    const fsy = m.height > 0 ? originRect.height / m.height : 1;

    setFrom({ x: fx, y: fy, sx: fsx, sy: fsy });
    x.set(fx);
    y.set(fy);
    scaleX.set(fsx);
    scaleY.set(fsy);

    const anims = [
      animate(x, 0, ZOOM_OPEN),
      animate(y, 0, ZOOM_OPEN),
      animate(scaleX, 1, ZOOM_OPEN),
      animate(scaleY, 1, ZOOM_OPEN),
    ];
    return () => anims.forEach((a) => a.stop());
    // Mount-only: runs once per open (the component remounts on each open).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      ref={ref}
      style={{
        x,
        y,
        scaleX,
        scaleY,
        transformOrigin: 'top left',
        border: '1px solid rgba(255, 200, 87, 0.7)',
        borderRadius: 24,
      }}
      // Close reverses the morph: shrink/translate back onto the card.
      exit={{
        x: from.x,
        y: from.y,
        scaleX: from.sx,
        scaleY: from.sy,
        opacity: 0,
        transition: ZOOM_CLOSE,
      }}
      className={`relative w-full ${widthClass} max-h-[92vh] sm:max-h-[90vh] bg-primary flex flex-col shadow-modal overflow-hidden`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Counter-scaled + faded so content stays crisp while the box morphs. */}
      <motion.div
        style={{ scaleX: invX, scaleY: invY, transformOrigin: 'top left' }}
        className="flex flex-col flex-1 min-h-0 origin-top-left"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.14, delay: 0.05 } }}
          exit={{ opacity: 0, transition: { duration: 0.08, ease: 'easeIn' } }}
          className="flex flex-col flex-1 min-h-0"
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { popoverReveal } from '@/utils/motion';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  className?: string;
  'aria-label'?: string;
  disabled?: boolean;
}

interface PanelPos {
  top: number;
  left: number;
  width: number;
}

export function optionsFrom<T extends string>(
  values: readonly T[],
): SelectOption<T>[] {
  return values.map((v) => ({ value: v, label: v }));
}

export function SelectField<T extends string>({
  value,
  onChange,
  options,
  className,
  'aria-label': ariaLabel,
  disabled = false,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [pos, setPos] = useState<PanelPos | null>(null);
  // True from the first client render (the portal only renders once `pos` is
  // set on open, so this never mismatches SSR). Avoids a wasted re-render per
  // dropdown on mount — and there are several in the edit form.
  const [mounted] = useState(() => typeof window !== 'undefined');

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (!open) setHighlight(-1);
  }, [open]);

  useEffect(() => {
    if (highlight >= options.length) setHighlight(-1);
  }, [options.length, highlight]);

  useEffect(() => {
    if (highlight < 0 || !panelRef.current) return;
    const el = panelRef.current.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const choose = (next: T) => {
    onChange(next);
    setOpen(false);
    setHighlight(-1);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlight(0);
        return;
      }
      setHighlight((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlight(options.length - 1);
        return;
      }
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (!open) {
        e.preventDefault();
        setOpen(true);
        setHighlight(Math.max(0, options.findIndex((o) => o.value === value)));
        return;
      }
      if (highlight >= 0) {
        e.preventDefault();
        choose(options[highlight].value);
      }
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      setHighlight(-1);
    }
  };

  const triggerClass =
    className ??
    'w-full bg-primary text-secondary text-sm rounded-xl px-3 py-2 border border-[rgb(var(--rgb-secondary)_/_0.25)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors';

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={`${triggerClass} press form-field cursor-pointer text-left flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className="min-w-0">
          <span className="block truncate">{selected?.label ?? value}</span>
          {/* Invisible ghosts of every option keep the trigger sized to the
              longest label, so the control doesn't resize on selection. */}
          <span aria-hidden="true" className="invisible block h-0 overflow-hidden">
            {options.map((o) => (
              <span key={o.value} className="block whitespace-nowrap">
                {o.label}
              </span>
            ))}
          </span>
        </span>
        <Chevron open={open} />
      </button>

      {mounted &&
        pos &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                variants={popoverReveal}
                initial="initial"
                animate="animate"
                exit="exit"
                id={listId}
                ref={panelRef as any}
                role="listbox"
                aria-label={ariaLabel}
                className="dropdown-panel rounded-xl overflow-hidden"
                style={{
                  position: 'fixed',
                  top: pos.top,
                  left: pos.left,
                  width: pos.width,
                  zIndex: 110,
                  transformOrigin: 'top',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(false);
                  }
                }}
              >
                {options.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isActive = idx === highlight;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => choose(opt.value)}
                      onMouseEnter={() => setHighlight(idx)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors active:bg-accent/40 ${
                        isActive ? 'bg-accent/30' : 'hover:bg-accent/15'
                      }`}
                      style={{ color: 'var(--color-ink)' }}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && (
                        <span
                          aria-hidden="true"
                          className="text-xs shrink-0"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      style={{ color: 'rgb(var(--rgb-ink) / 0.55)' }}
    >
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

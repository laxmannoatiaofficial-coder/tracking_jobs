'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { CITY_SUGGESTIONS } from '@/types';

interface CityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function matches(
  item: { name: string; aliases?: string[] },
  q: string,
): boolean {
  const haystack = [item.name, ...(item.aliases ?? [])].join(' ').toLowerCase();
  return haystack.includes(q);
}

interface PanelPos {
  top: number;
  left: number;
  width: number;
}

export function CityCombobox({
  value,
  onChange,
  placeholder,
  className,
}: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return CITY_SUGGESTIONS;
    return CITY_SUGGESTIONS.filter((c) => matches(c, q));
  }, [value]);

  // Position tracking — recalculate on open, scroll, resize
  const updatePos = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    // capture: true to catch scrolls on any ancestor (incl. modal body)
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, updatePos]);

  // Close on outside click — check both the input container and the portal panel
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
    if (highlight >= filtered.length) setHighlight(-1);
  }, [filtered.length, highlight]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlight < 0 || !panelRef.current) return;
    const el = panelRef.current.children[highlight] as
      | HTMLElement
      | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
    setHighlight(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (open && highlight >= 0) {
        e.preventDefault();
        choose(filtered[highlight].name);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
    }
  };

  const showNoMatch =
    open && filtered.length === 0 && value.trim() !== '' && pos !== null;

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="city-combobox-list"
        className={`${className ?? ''} pr-9`}
      />
      <button
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            inputRef.current?.focus();
            setOpen(true);
          }
        }}
        aria-label={open ? 'Close city list' : 'Open city list'}
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-accent/25 transition-colors"
      >
        <Chevron open={open} />
      </button>

      {mounted &&
        open &&
        pos &&
        filtered.length > 0 &&
        createPortal(
          <div
            id="city-combobox-list"
            ref={panelRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 100,
            }}
            className="bg-primary rounded-2xl overflow-y-auto scroll-area max-h-64 shadow-menu animate-modal-in"
          >
            {filtered.map((c, idx) => {
              const active = idx === highlight;
              return (
                <button
                  key={c.name}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(c.name)}
                  onMouseEnter={() => setHighlight(idx)}
                  className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                    active ? 'bg-accent/30' : 'hover:bg-accent/15'
                  }`}
                  style={{
                    color: 'var(--color-ink)',
                    border: 'none',
                    borderTop:
                      idx === 0
                        ? 'none'
                        : '1px solid rgb(var(--rgb-secondary) / 0.06)',
                  }}
                >
                  <span className="font-medium">{c.name}</span>
                  {c.aliases?.length && (
                    <span
                      className="ml-1.5 text-xs"
                      style={{ color: 'rgb(var(--rgb-ink) / 0.55)' }}
                    >
                      ({c.aliases.join(', ')})
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}

      {mounted &&
        showNoMatch &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 100,
            }}
            className="bg-primary rounded-2xl shadow-menu px-4 py-3 text-xs animate-modal-in"
          >
            <span style={{ color: 'rgb(var(--rgb-ink) / 0.65)' }}>
              No match in the list. Press Enter or click outside to keep
              &ldquo;
              <span className="text-secondary font-medium">{value}</span>
              &rdquo; as your city.
            </span>
          </div>,
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
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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

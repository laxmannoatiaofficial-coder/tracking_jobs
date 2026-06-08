'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  widthClass?: string;
}

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  widthClass = 'max-w-2xl',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        className="absolute inset-0 animate-backdrop-in backdrop-blur-sm"
        style={{ background: 'rgb(var(--rgb-secondary) / 0.7)' }}
        onMouseDown={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className={`relative w-full ${widthClass} max-h-[92vh] sm:max-h-[90vh] bg-primary rounded-t-3xl sm:rounded-3xl animate-modal-in flex flex-col shadow-modal overflow-hidden`}
        style={{ border: '1px solid rgba(255, 200, 87, 0.7)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

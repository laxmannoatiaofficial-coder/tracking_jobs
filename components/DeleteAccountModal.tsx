'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';

interface DeleteAccountModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

const CONFIRM_WORD = 'DELETE';

export function DeleteAccountModal({
  open,
  onCancel,
  onConfirm,
}: DeleteAccountModalProps) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setInput('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const canConfirm = input === CONFIRM_WORD && !submitting;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof Error
          ? err.message
          : 'Could not delete your account. Please try again.',
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onCancel}
      labelledBy="delete-account-title"
      widthClass="max-w-md"
    >
      <div className="p-6">
        <h2
          id="delete-account-title"
          className="font-display font-bold text-2xl text-secondary mb-3"
        >
          Delete your account?
        </h2>
        <p
          className="text-sm mb-5"
          style={{ color: 'rgb(var(--rgb-ink) / 0.8)' }}
        >
          This will permanently delete your account and all your job
          applications. This cannot be undone.
        </p>
        <label
          className="block text-xs font-medium text-secondary mb-1.5"
          htmlFor="delete-confirm-input"
        >
          Type <strong>{CONFIRM_WORD}</strong> to confirm
        </label>
        <input
          id="delete-confirm-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
          className="w-full bg-primary text-secondary text-sm rounded-xl px-3 py-2 border border-[rgb(var(--rgb-secondary)_/_0.25)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        {error && (
          <p
            className="text-xs mt-3"
            style={{ color: '#dc2626' }}
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-colors disabled:opacity-50"
            style={{
              border: '1px solid rgb(var(--rgb-secondary) / 0.4)',
              color: 'var(--color-ink)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="px-4 py-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ background: '#dc2626' }}
          >
            {submitting && (
              <span
                className="inline-block w-3.5 h-3.5 rounded-full animate-spin"
                style={{
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  borderTopColor: 'white',
                }}
                aria-hidden="true"
              />
            )}
            {submitting ? 'Deleting…' : 'Delete My Account'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

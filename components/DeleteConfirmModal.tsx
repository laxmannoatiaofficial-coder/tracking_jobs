'use client';

import { Modal } from './Modal';

interface DeleteConfirmModalProps {
  open: boolean;
  companyName: string;
  /** Heading + body copy variant. Defaults to deleting a job application. */
  variant?: 'application' | 'watchlist';
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  open,
  companyName,
  variant = 'application',
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      labelledBy="delete-modal-title"
      widthClass="max-w-md"
    >
      <div className="p-6">
        <h2
          id="delete-modal-title"
          className="font-display font-bold text-2xl text-secondary mb-3"
        >
          {variant === 'watchlist' ? 'Remove Company?' : 'Delete Application?'}
        </h2>
        <p
          className="text-sm mb-6"
          style={{ color: 'rgb(var(--rgb-ink) / 0.8)' }}
        >
          {variant === 'watchlist'
            ? 'This will remove '
            : 'This will permanently remove your application to '}
          <strong className="text-secondary">{companyName}</strong>
          {variant === 'watchlist' ? ' from your watchlist. ' : '. '}
          This cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-sm font-semibold border border-[rgb(var(--rgb-secondary)_/_0.4)] hover:border-accent hover:scale-[1.05] transition-all duration-200 ease-out"
            style={{ color: 'var(--color-ink)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-full text-sm font-semibold text-white border border-transparent hover:border-accent hover:opacity-90 hover:scale-[1.05] transition-all duration-200 ease-out"
            style={{ background: '#dc2626' }}
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}

'use client';

import { Modal } from './Modal';

interface DeleteConfirmModalProps {
  open: boolean;
  companyName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  open,
  companyName,
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
          Delete Application?
        </h2>
        <p
          className="text-sm mb-6"
          style={{ color: 'rgb(var(--rgb-ink) / 0.8)' }}
        >
          This will permanently remove your application to{' '}
          <strong className="text-secondary">{companyName}</strong>. This cannot
          be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-colors"
            style={{
              border: '1px solid rgb(var(--rgb-secondary) / 0.4)',
              color: 'var(--color-ink)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#dc2626' }}
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}

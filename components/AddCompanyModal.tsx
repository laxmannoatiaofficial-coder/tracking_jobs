'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  WatchlistCompany,
  WatchlistInput,
  WatchlistKind,
} from '@/types';
import { Modal } from './Modal';

interface AddCompanyModalProps {
  open: boolean;
  initialCompany: WatchlistCompany | null;
  onClose: () => void;
  onSave: (data: WatchlistInput) => Promise<void>;
}

interface FormState {
  kind: WatchlistKind;
  company_name: string;
  role: string;
  industry: string;
  website_url: string;
  location: string;
  note: string;
}

function emptyForm(): FormState {
  return {
    kind: 'Company',
    company_name: '',
    role: '',
    industry: '',
    website_url: '',
    location: '',
    note: '',
  };
}

export function AddCompanyModal({
  open,
  initialCompany,
  onClose,
  onSave,
}: AddCompanyModalProps) {
  const isEdit = initialCompany !== null;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(
        initialCompany
          ? {
              kind: initialCompany.kind ?? 'Company',
              company_name: initialCompany.company_name,
              role: initialCompany.role ?? '',
              industry: initialCompany.industry ?? '',
              website_url: initialCompany.website_url ?? '',
              location: initialCompany.location ?? '',
              note: initialCompany.note ?? '',
            }
          : emptyForm(),
      );
      setError(null);
      setSaving(false);
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [open, initialCompany]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isValid =
    form.company_name.trim() !== '' &&
    (form.kind === 'Company' || form.role.trim() !== '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError(null);
    setSaving(true);
    try {
      await onSave({
        kind: form.kind,
        company_name: form.company_name.trim(),
        role: form.kind === 'Job' ? form.role.trim() : '',
        industry: form.industry.trim(),
        website_url: form.website_url.trim(),
        location: form.location.trim(),
        note: form.note.trim(),
      });
      setSaving(false);
    } catch (err) {
      setSaving(false);
      setError(
        err instanceof Error ? err.message : 'Could not save the company',
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="add-company-title"
      widthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
        <header className="flex items-center justify-between p-5 bg-secondary rounded-t-3xl">
          <h2
            id="add-company-title"
            className="font-display font-bold text-2xl text-primary"
          >
            {isEdit ? 'Edit Company' : 'Add to Watchlist'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full border border-transparent hover:border-accent hover:bg-accent/25 hover:scale-110 transition-all duration-200 ease-out"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3.5 3.5l9 9M12.5 3.5l-9 9"
                stroke="var(--color-on-dark)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="overflow-y-auto scroll-area p-6 flex-1 flex flex-col gap-4">
          {/* What are you watching — a whole company, or a specific job? */}
          <div
            className="grid grid-cols-2 gap-1 p-1 rounded-full"
            style={{ background: 'rgb(var(--rgb-secondary) / 0.08)' }}
            role="radiogroup"
            aria-label="Watchlist entry type"
          >
            {(['Company', 'Job'] as WatchlistKind[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={form.kind === k}
                onClick={() => set('kind', k)}
                className={`py-1.5 rounded-full text-sm transition-all duration-200 ease-out ${
                  form.kind === k
                    ? 'bg-accent font-semibold text-[#2d3a3a]'
                    : 'font-medium text-secondary hover:bg-accent/15'
                }`}
              >
                {k === 'Company' ? 'A Company' : 'A Specific Job'}
              </button>
            ))}
          </div>

          <Field label="Company Name" required>
            <input
              ref={firstFieldRef}
              type="text"
              value={form.company_name}
              onChange={(e) => set('company_name', e.target.value)}
              className={inputClass}
            />
          </Field>

          {form.kind === 'Job' && (
            <Field label="Role / Job Title" required>
              <input
                type="text"
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                className={inputClass}
                placeholder="e.g. Product Manager"
              />
            </Field>
          )}

          <Field label="Industry">
            <input
              type="text"
              value={form.industry}
              onChange={(e) => set('industry', e.target.value)}
              className={inputClass}
              placeholder="e.g. FinTech, SaaS"
            />
          </Field>

          <Field
            label={
              form.kind === 'Job' ? 'Job Post Link' : 'Website / Careers Page'
            }
          >
            <input
              type="url"
              value={form.website_url}
              onChange={(e) => set('website_url', e.target.value)}
              className={inputClass}
              placeholder={
                form.kind === 'Job'
                  ? 'https://linkedin.com/jobs/...'
                  : 'https://company.com/careers'
              }
            />
          </Field>

          <Field label="Location">
            <input
              type="text"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              className={inputClass}
              placeholder="e.g. Bengaluru, Remote"
            />
          </Field>

          <Field
            label={form.kind === 'Job' ? 'Why this job?' : 'Why this company?'}
          >
            <textarea
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              rows={3}
              className={`${inputClass} resize-y`}
              placeholder={
                form.kind === 'Job'
                  ? 'What makes this role interesting — scope, team, timing...'
                  : "What caught your eye — product, team, roles you'd want..."
              }
            />
          </Field>

          {error && (
            <p
              className="text-xs rounded-xl px-3 py-2"
              style={{ color: '#dc2626', background: 'rgba(220, 38, 38, 0.08)' }}
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <footer
          className="flex items-center justify-between p-5"
          style={{ borderTop: '1px solid rgb(var(--rgb-secondary) / 0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-full text-sm font-semibold border border-[rgb(var(--rgb-secondary)_/_0.4)] hover:border-accent hover:scale-[1.05] transition-all duration-200 ease-out disabled:opacity-50 disabled:hover:scale-100"
            style={{ color: 'var(--color-ink)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || saving}
            className="px-5 py-2 rounded-full text-sm font-semibold bg-accent text-secondary transition-all duration-200 ease-out hover:scale-[1.03] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

const inputClass =
  'w-full bg-primary text-secondary text-sm rounded-xl px-3 py-2 border border-[rgb(var(--rgb-secondary)_/_0.25)] hover:border-accent hover:scale-[1.02] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all duration-200 ease-out';

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-secondary mb-1.5">
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

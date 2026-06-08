'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  JobApplication,
  JobInput,
  JobStatus,
  LocationType,
  RoleType,
} from '@/types';
import {
  LOCATION_TYPE_OPTIONS,
  ROLE_TYPE_OPTIONS,
  STATUS_OPTIONS,
} from '@/types';
import { todayIso } from '@/utils/helpers';
import { CityCombobox } from './CityCombobox';
import { Modal } from './Modal';

interface AddJobModalProps {
  open: boolean;
  initialJob: JobApplication | null;
  onClose: () => void;
  onSave: (
    data: JobInput,
    resumeFile: File | null,
    jdFile: File | null,
  ) => Promise<void>;
}

interface FormState {
  company_name: string;
  role: string;
  industry: string;
  status: JobStatus;
  date_of_application: string;
  follow_up_date: string;
  role_type: RoleType;
  location_type: LocationType;
  location_city: string;
  ctc: string;
  jd_url: string;
  jd_text: string;
  jd_file_name: string; // local-only display label for uploaded JD doc
  resume_file_name: string;
  resume_url: string;
  resume_link: string; // external link (Google Drive / Dropbox / etc.), alt to upload
  personal_note: string;
}

const MAX_PDF_BYTES = 5 * 1024 * 1024;

function emptyForm(): FormState {
  return {
    company_name: '',
    role: '',
    industry: '',
    status: 'Applied',
    date_of_application: todayIso(),
    follow_up_date: '',
    role_type: 'Full-time',
    location_type: 'Remote',
    location_city: '',
    ctc: '',
    jd_url: '',
    jd_text: '',
    jd_file_name: '',
    resume_file_name: '',
    resume_url: '',
    resume_link: '',
    personal_note: '',
  };
}

function jobToForm(job: JobApplication): FormState {
  // If the existing resume has a filename, treat it as an uploaded file.
  // If it has only a URL (no filename), treat it as a pasted link.
  const isUploadedFile = Boolean(job.resume_file_name);
  return {
    company_name: job.company_name,
    role: job.role,
    industry: job.industry,
    status: job.status,
    date_of_application: job.date_of_application,
    follow_up_date: job.follow_up_date ?? '',
    role_type: job.role_type,
    location_type: job.location_type,
    location_city: job.location_city ?? '',
    ctc: job.ctc ?? '',
    jd_url: job.jd_url ?? '',
    jd_text: job.jd_text ?? '',
    jd_file_name: '',
    resume_file_name: isUploadedFile ? job.resume_file_name : '',
    resume_url: isUploadedFile ? (job.resume_url ?? '') : '',
    resume_link: !isUploadedFile ? (job.resume_url ?? '') : '',
    personal_note: job.personal_note ?? '',
  };
}

export function AddJobModal({
  open,
  initialJob,
  onClose,
  onSave,
}: AddJobModalProps) {
  const isEdit = initialJob !== null;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [resumeError, setResumeError] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resumeMode, setResumeMode] = useState<'idle' | 'file' | 'link'>(
    'idle',
  );
  const [jdMode, setJdMode] = useState<'idle' | 'url' | 'text' | 'file'>(
    'idle',
  );
  const [pendingJdFile, setPendingJdFile] = useState<File | null>(null);
  const [jdError, setJdError] = useState<string>('');
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(initialJob ? jobToForm(initialJob) : emptyForm());
      setPendingFile(null);
      setErrors({});
      setResumeError('');
      setSubmitError(null);
      setSaving(false);
      // Resume mode follows existing data
      if (initialJob?.resume_file_name) {
        setResumeMode('file');
      } else if (initialJob?.resume_url) {
        setResumeMode('link');
      } else {
        setResumeMode('idle');
      }
      // JD mode: text > url (anything, link or uploaded file URL) > idle
      setPendingJdFile(null);
      setJdError('');
      if (initialJob?.jd_text) {
        setJdMode('text');
      } else if (initialJob?.jd_url) {
        setJdMode('url');
      } else {
        setJdMode('idle');
      }
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [open, initialJob]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.company_name.trim()) next.company_name = 'Required';
    if (!form.role.trim()) next.role = 'Required';
    if (!form.date_of_application) next.date_of_application = 'Required';
    if (!form.status) next.status = 'Required';
    if (!form.role_type) next.role_type = 'Required';
    if (!form.location_type) next.location_type = 'Required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const isValid =
    form.company_name.trim() !== '' &&
    form.role.trim() !== '' &&
    form.date_of_application !== '' &&
    !!form.status &&
    !!form.role_type &&
    !!form.location_type;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitError(null);
    setSaving(true);

    // Resume resolution: pendingFile > pasted link > existing upload (no change) > empty
    const linkTrimmed = form.resume_link.trim();
    let resumeUrl = form.resume_url;
    let resumeFileName = form.resume_file_name;
    if (pendingFile) {
      // useJobs will overwrite both fields after uploading
    } else if (linkTrimmed) {
      resumeUrl = linkTrimmed;
      resumeFileName = ''; // links have no filename
    }

    // JD resolution by mode. Mode dictates which fields are populated.
    let jdUrl = '';
    let jdText = '';
    if (pendingJdFile) {
      // useJobs will set jd_url to the uploaded file URL
    } else if (jdMode === 'url') {
      jdUrl = form.jd_url.trim();
    } else if (jdMode === 'text') {
      jdText = form.jd_text.trim();
    } else if (jdMode === 'file' && form.jd_url) {
      // Editing — existing uploaded file kept (no new file picked)
      jdUrl = form.jd_url.trim();
    }

    try {
      await onSave(
        {
          company_name: form.company_name.trim(),
          role: form.role.trim(),
          industry: form.industry.trim(),
          status: form.status,
          date_of_application: form.date_of_application,
          follow_up_date: form.follow_up_date,
          role_type: form.role_type,
          location_type: form.location_type,
          location_city:
            form.location_type === 'On-site' ||
            form.location_type === 'Hybrid'
              ? form.location_city.trim()
              : '',
          ctc: form.ctc.trim(),
          jd_url: jdUrl,
          jd_text: jdText,
          resume_file_name: resumeFileName,
          resume_url: resumeUrl,
          personal_note: form.personal_note.trim(),
        },
        pendingFile,
        pendingJdFile,
      );
    } catch (err) {
      setSaving(false);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Could not save the application';
      setSubmitError(msg);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setResumeError('Only PDF files are accepted.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setResumeError(
        `File is ${(file.size / 1024 / 1024).toFixed(1)}MB — max 5MB.`,
      );
      return;
    }
    setPendingFile(file);
    setForm((prev) => ({
      ...prev,
      resume_file_name: file.name,
      // Picking a file commits to file mode; drop any pending link
      resume_link: '',
    }));
    setResumeMode('file');
    setResumeError('');
  };

  const clearResume = () => {
    setPendingFile(null);
    setForm((prev) => ({ ...prev, resume_file_name: '', resume_url: '' }));
    setResumeError('');
    setResumeMode('idle');
  };

  const clearLink = () => {
    setForm((prev) => ({ ...prev, resume_link: '' }));
    setResumeMode('idle');
  };

  // ---- JD handlers ----

  const MAX_JD_BYTES = 5 * 1024 * 1024;

  const handleJdFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_JD_BYTES) {
      setJdError(
        `File is ${(file.size / 1024 / 1024).toFixed(1)}MB — max 5MB.`,
      );
      return;
    }
    setPendingJdFile(file);
    setForm((prev) => ({
      ...prev,
      jd_file_name: file.name,
      jd_text: '',
      jd_url: '',
    }));
    setJdMode('file');
    setJdError('');
  };

  const clearJd = () => {
    setPendingJdFile(null);
    setForm((prev) => ({
      ...prev,
      jd_url: '',
      jd_text: '',
      jd_file_name: '',
    }));
    setJdError('');
    setJdMode('idle');
  };

  const showCity =
    form.location_type === 'On-site' || form.location_type === 'Hybrid';

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="add-modal-title"
      widthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
        <header className="flex items-center justify-between p-5 bg-secondary rounded-t-3xl">
          <h2
            id="add-modal-title"
            className="font-display font-bold text-2xl text-primary"
          >
            {isEdit ? 'Edit Application' : 'Add Application'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full hover:bg-accent/25 transition-colors"
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

        <div className="overflow-y-auto scroll-area p-6 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Company Name" required error={errors.company_name} full>
              <input
                ref={firstFieldRef}
                type="text"
                value={form.company_name}
                onChange={(e) => set('company_name', e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Role" required error={errors.role} full>
              <input
                type="text"
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Industry">
              <input
                type="text"
                value={form.industry}
                onChange={(e) => set('industry', e.target.value)}
                className={inputClass}
                placeholder="e.g. FinTech, SaaS"
              />
            </Field>

            <Field label="Status" required>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as JobStatus)}
                className={selectClass}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Date of Application"
              required
              error={errors.date_of_application}
            >
              <input
                type="date"
                value={form.date_of_application}
                onChange={(e) => set('date_of_application', e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Follow-up Date (optional)">
              <input
                type="date"
                value={form.follow_up_date}
                onChange={(e) => set('follow_up_date', e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Type of Role" required>
              <select
                value={form.role_type}
                onChange={(e) => set('role_type', e.target.value as RoleType)}
                className={selectClass}
              >
                {ROLE_TYPE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Location Type" required>
              <select
                value={form.location_type}
                onChange={(e) =>
                  set('location_type', e.target.value as LocationType)
                }
                className={selectClass}
              >
                {LOCATION_TYPE_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>

            <div
              className={`sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-hidden transition-all duration-300 ${
                showCity ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <Field label="City">
                <CityCombobox
                  value={form.location_city}
                  onChange={(v) => set('location_city', v)}
                  placeholder="Pick from list or type your own"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="CTC Offered">
              <input
                type="text"
                value={form.ctc}
                onChange={(e) => set('ctc', e.target.value)}
                className={inputClass}
                placeholder='e.g. "12 LPA", "Not disclosed"'
              />
            </Field>

            <Field label="Job Description" full error={jdError}>
              {jdMode === 'idle' && (
                <div
                  className="flex items-center justify-center gap-3 px-3 py-4 rounded-xl"
                  style={{ border: '1px dashed rgb(var(--rgb-secondary) / 0.3)' }}
                >
                  <span
                    className="text-xs"
                    style={{ color: 'rgb(var(--rgb-ink) / 0.65)' }}
                  >
                    Add a JD:
                  </span>
                  <button
                    type="button"
                    onClick={() => setJdMode('url')}
                    className="flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 ease-out hover:scale-[1.05]"
                    style={{ background: 'rgba(255, 200, 87, 0.3)' }}
                    title="Paste a URL"
                    aria-label="Paste a URL"
                  >
                    <LinkIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setJdMode('text')}
                    className="flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 ease-out hover:scale-[1.05]"
                    style={{ background: 'rgba(255, 200, 87, 0.3)' }}
                    title="Paste JD text"
                    aria-label="Paste JD text"
                  >
                    <TextIcon />
                  </button>
                  <label
                    className="flex items-center justify-center w-11 h-11 rounded-xl cursor-pointer transition-all duration-200 ease-out hover:scale-[1.05]"
                    style={{ background: 'rgba(255, 200, 87, 0.3)' }}
                    title="Upload document (max 5MB)"
                    aria-label="Upload document"
                  >
                    <UploadIcon />
                    <input
                      type="file"
                      accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*,image/*"
                      onChange={handleJdFile}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {jdMode === 'url' && (
                <div className="flex items-stretch gap-2">
                  <input
                    type="url"
                    value={form.jd_url}
                    onChange={(e) => set('jd_url', e.target.value)}
                    autoFocus
                    className={inputClass}
                    placeholder="Paste JD or LinkedIn URL"
                  />
                  <button
                    type="button"
                    onClick={clearJd}
                    className="shrink-0 flex items-center justify-center w-10 rounded-xl transition-colors hover:bg-accent/25"
                    style={{ border: '1px solid rgb(var(--rgb-secondary) / 0.25)' }}
                    title="Cancel"
                    aria-label="Cancel"
                  >
                    <XIcon />
                  </button>
                </div>
              )}

              {jdMode === 'text' && (
                <div className="space-y-2">
                  <textarea
                    value={form.jd_text}
                    onChange={(e) => set('jd_text', e.target.value)}
                    rows={6}
                    autoFocus
                    className={`${inputClass} resize-y`}
                    placeholder="Paste the job description text here…"
                  />
                  <button
                    type="button"
                    onClick={clearJd}
                    className="text-xs font-semibold px-3 py-1 rounded-full transition-colors hover:bg-accent/25"
                    style={{ color: '#dc2626' }}
                  >
                    Clear and start over
                  </button>
                </div>
              )}

              {jdMode === 'file' && (
                <div
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl"
                  style={{ border: '1px solid rgb(var(--rgb-secondary) / 0.25)' }}
                >
                  <span className="text-sm text-secondary truncate flex items-center gap-2">
                    {pendingJdFile && (
                      <span aria-hidden="true" className="text-accent">
                        ✓
                      </span>
                    )}
                    {form.jd_file_name ||
                      (form.jd_url ? 'Existing uploaded document' : 'No file')}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <label
                      className="text-xs cursor-pointer px-2 py-1 rounded-full transition-colors hover:bg-accent/25 font-semibold"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      Replace
                      <input
                        type="file"
                        accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*,image/*"
                        onChange={handleJdFile}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={clearJd}
                      className="text-xs px-2 py-1 rounded-full transition-colors hover:bg-accent/25 font-semibold"
                      style={{ color: '#dc2626' }}
                      title="Remove (and switch input option)"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </Field>

            <Field label="Resume" full error={resumeError}>
              {resumeMode === 'idle' && (
                <div
                  className="flex items-center justify-center gap-3 px-3 py-4 rounded-xl"
                  style={{ border: '1px dashed rgb(var(--rgb-secondary) / 0.3)' }}
                >
                  <span
                    className="text-xs"
                    style={{ color: 'rgb(var(--rgb-ink) / 0.65)' }}
                  >
                    Add your resume:
                  </span>
                  <label
                    className="flex items-center justify-center w-11 h-11 rounded-xl cursor-pointer transition-all duration-200 ease-out hover:scale-[1.05]"
                    style={{ background: 'rgba(255, 200, 87, 0.3)' }}
                    title="Upload PDF (max 5MB)"
                    aria-label="Upload PDF"
                  >
                    <UploadIcon />
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFile}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setResumeMode('link')}
                    className="flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 ease-out hover:scale-[1.05]"
                    style={{ background: 'rgba(255, 200, 87, 0.3)' }}
                    title="Paste a link"
                    aria-label="Paste a link"
                  >
                    <LinkIcon />
                  </button>
                </div>
              )}

              {resumeMode === 'file' && (
                <div
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl"
                  style={{ border: '1px solid rgb(var(--rgb-secondary) / 0.25)' }}
                >
                  <span className="text-sm text-secondary truncate flex items-center gap-2">
                    {pendingFile && (
                      <span aria-hidden="true" className="text-accent">
                        ✓
                      </span>
                    )}
                    {form.resume_file_name || 'No file selected'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <label
                      className="text-xs cursor-pointer px-2 py-1 rounded-full transition-colors hover:bg-accent/25 font-semibold"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      Replace
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFile}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={clearResume}
                      className="text-xs px-2 py-1 rounded-full transition-colors hover:bg-accent/25 font-semibold"
                      style={{ color: '#dc2626' }}
                      title="Remove (and switch to link option)"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {resumeMode === 'link' && (
                <div className="flex items-stretch gap-2">
                  <input
                    type="url"
                    value={form.resume_link}
                    onChange={(e) => set('resume_link', e.target.value)}
                    autoFocus
                    className={inputClass}
                    placeholder="Google Drive / Dropbox / OneDrive URL"
                  />
                  <button
                    type="button"
                    onClick={clearLink}
                    className="shrink-0 flex items-center justify-center w-10 rounded-xl transition-colors hover:bg-accent/25"
                    style={{ border: '1px solid rgb(var(--rgb-secondary) / 0.25)' }}
                    title="Cancel (back to upload option)"
                    aria-label="Cancel link"
                  >
                    <XIcon />
                  </button>
                </div>
              )}
            </Field>

            <Field label="Personal Note" full>
              <textarea
                value={form.personal_note}
                onChange={(e) => set('personal_note', e.target.value)}
                rows={4}
                className={`${inputClass} resize-y`}
                placeholder="Any notes about this role, the company, or the application..."
              />
            </Field>

            {submitError && (
              <div className="sm:col-span-2">
                <p
                  className="text-xs rounded-xl px-3 py-2"
                  style={{
                    color: '#dc2626',
                    background: 'rgba(220, 38, 38, 0.08)',
                  }}
                  role="alert"
                >
                  {submitError}
                </p>
              </div>
            )}
          </div>
        </div>

        <footer
          className="flex items-center justify-between p-5"
          style={{ borderTop: '1px solid rgb(var(--rgb-secondary) / 0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-colors disabled:opacity-50"
            style={{
              border: '1px solid rgb(var(--rgb-secondary) / 0.4)',
              color: 'var(--color-ink)',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || saving}
            className="px-5 py-2 rounded-full text-sm font-semibold bg-accent text-secondary transition-all duration-200 ease-out hover:scale-[1.03] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
          >
            {saving && (
              <span
                className="inline-block w-3.5 h-3.5 rounded-full animate-spin"
                style={{
                  border: '2px solid rgb(var(--rgb-secondary) / 0.3)',
                  borderTopColor: 'var(--color-secondary)',
                }}
                aria-hidden="true"
              />
            )}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

const inputClass =
  'w-full bg-primary text-secondary text-sm rounded-xl px-3 py-2 border border-[rgb(var(--rgb-secondary)_/_0.25)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors';

const selectClass = `${inputClass} cursor-pointer pr-8 appearance-none`;

function Field({
  label,
  children,
  required,
  error,
  full,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-secondary mb-1.5">
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs mt-1" style={{ color: '#dc2626' }}>
          {error}
        </p>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 13V4M10 4l-3.5 3.5M10 4l3.5 3.5"
        stroke="var(--color-secondary)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 13v2a2 2 0 002 2h9a2 2 0 002-2v-2"
        stroke="var(--color-secondary)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 5h12M4 9h12M4 13h8M4 17h6"
        stroke="var(--color-secondary)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8.5 11.5a3 3 0 004.24 0l2.5-2.5a3 3 0 10-4.24-4.24L9.5 6.27"
        stroke="var(--color-secondary)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 8.5a3 3 0 00-4.24 0l-2.5 2.5a3 3 0 104.24 4.24L10.5 13.73"
        stroke="var(--color-secondary)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 3.5l9 9M12.5 3.5l-9 9"
        stroke="var(--color-secondary)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

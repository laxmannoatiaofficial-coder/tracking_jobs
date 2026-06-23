'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  CompensationPeriod,
  JobApplication,
  JobInput,
  JobStatus,
  LocationType,
  RoleType,
} from '@/types';
import {
  COMPENSATION_PERIOD_OPTIONS,
  LOCATION_TYPE_OPTIONS,
  ROLE_TYPE_OPTIONS,
  STATUS_OPTIONS,
} from '@/types';
import { todayIso } from '@/utils/helpers';
import { extractJob, extractJobFromFile, extractJobFromUrl } from '@/utils/ai';
import type { ExtractedJob } from '@/utils/ai';
import { CityCombobox } from './CityCombobox';
import { Modal } from './Modal';
import { optionsFrom, SelectField } from './SelectField';

interface AddJobModalProps {
  open: boolean;
  initialJob: JobApplication | null;
  /** Optional partial values for add mode (e.g. promoting a watchlist company). */
  prefill?: Partial<JobInput> | null;
  originRect?: DOMRect | null;
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
  compensation_period: CompensationPeriod;
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
    compensation_period: 'Annual',
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
    compensation_period:
      job.compensation_period === 'Monthly' ? 'Monthly' : 'Annual',
    jd_url: job.jd_url ?? '',
    jd_text: job.jd_text ?? '',
    jd_file_name: '',
    resume_file_name: isUploadedFile ? job.resume_file_name : '',
    resume_url: isUploadedFile ? (job.resume_url ?? '') : '',
    resume_link: !isUploadedFile ? (job.resume_url ?? '') : '',
    personal_note: job.personal_note ?? '',
  };
}

type ResumeMode = 'idle' | 'file' | 'link';
type JdMode = 'idle' | 'url' | 'text' | 'file';

// Pure: derive the full opening state for a session, so the form can mount
// already-populated in a single render instead of mounting empty then resetting.
function deriveOpenState(
  initialJob: JobApplication | null,
  prefill?: Partial<JobInput> | null,
): { form: FormState; resumeMode: ResumeMode; jdMode: JdMode } {
  const form = initialJob
    ? jobToForm(initialJob)
    : {
        ...emptyForm(),
        company_name: prefill?.company_name ?? '',
        role: prefill?.role ?? '',
        industry: prefill?.industry ?? '',
        jd_url: prefill?.jd_url ?? '',
        personal_note: prefill?.personal_note ?? '',
        ...(prefill?.location_type
          ? { location_type: prefill.location_type }
          : {}),
        location_city: prefill?.location_city ?? '',
      };
  const resumeMode: ResumeMode = initialJob?.resume_file_name
    ? 'file'
    : initialJob?.resume_url
      ? 'link'
      : 'idle';
  const jdMode: JdMode = initialJob?.jd_text
    ? 'text'
    : initialJob?.jd_url || (!initialJob && prefill?.jd_url)
      ? 'url'
      : 'idle';
  return { form, resumeMode, jdMode };
}

export function AddJobModal({
  open,
  initialJob,
  prefill,
  originRect,
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

  // AI autofill (reads from the Job Description field below).
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');

  // Reset the form on the open transition — during render, not in an effect, so
  // the fields mount once already-populated instead of mounting empty and then
  // re-rendering with the data (that second render was happening mid-animation).
  // The `prevOpen` guard makes this fire only when `open` flips.
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      const init = deriveOpenState(initialJob, prefill);
      setForm(init.form);
      setPendingFile(null);
      setErrors({});
      setResumeError('');
      setSubmitError(null);
      setSaving(false);
      setResumeMode(init.resumeMode);
      setPendingJdFile(null);
      setJdError('');
      setJdMode(init.jdMode);
      setAiError('');
      setAiBusy(false);
    }
  }

  // Focus the first field shortly after opening (needs the mounted DOM).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => firstFieldRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  // Fill the form from whatever JD the user provided. Only overwrites a field
  // when the AI returned a value for it.
  const applyExtracted = (d: ExtractedJob) => {
    const isLocation = (v: string): v is LocationType =>
      (LOCATION_TYPE_OPTIONS as string[]).includes(v) || v === 'On-site';
    const isRole = (v: string): v is RoleType =>
      (ROLE_TYPE_OPTIONS as string[]).includes(v) || v === 'Contract';
    const isPeriod = (v: string): v is CompensationPeriod =>
      (COMPENSATION_PERIOD_OPTIONS as string[]).includes(v);
    setForm((prev) => ({
      ...prev,
      company_name: d.company_name || prev.company_name,
      role: d.role || prev.role,
      industry: d.industry || prev.industry,
      location_type: isLocation(d.location_type)
        ? d.location_type
        : prev.location_type,
      location_city: d.location_city || prev.location_city,
      role_type: isRole(d.role_type) ? d.role_type : prev.role_type,
      ctc: d.ctc || prev.ctc,
      compensation_period: isPeriod(d.compensation_period)
        ? d.compensation_period
        : prev.compensation_period,
    }));
    setErrors({});
  };

  // Is there a JD to read from any of the three input modes?
  const hasJdSource =
    pendingJdFile !== null ||
    (jdMode === 'text' && form.jd_text.trim() !== '') ||
    form.jd_url.trim() !== '';

  const runAutofill = async () => {
    if (aiBusy || !hasJdSource) return;
    setAiBusy(true);
    setAiError('');
    try {
      let d: ExtractedJob;
      if (pendingJdFile) {
        d = await extractJobFromFile(pendingJdFile);
      } else if (jdMode === 'text' && form.jd_text.trim()) {
        d = await extractJob(form.jd_text.trim());
      } else {
        d = await extractJobFromUrl(form.jd_url.trim());
      }
      applyExtracted(d);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : 'Autofill failed — try again.',
      );
    } finally {
      setAiBusy(false);
    }
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
          // Rescheduling (or adding) a follow-up makes it pending again;
          // an unchanged date keeps its done state.
          follow_up_done:
            initialJob && initialJob.follow_up_date === form.follow_up_date
              ? initialJob.follow_up_done
              : false,
          role_type: form.role_type,
          location_type: form.location_type,
          location_city:
            form.location_type === 'On-site' ||
            form.location_type === 'Hybrid'
              ? form.location_city.trim()
              : '',
          ctc: form.ctc.trim(),
          compensation_period: form.ctc.trim()
            ? form.compensation_period
            : '',
          jd_url: jdUrl,
          jd_text: jdText,
          resume_file_name: resumeFileName,
          resume_url: resumeUrl,
          personal_note: form.personal_note.trim(),
        },
        pendingFile,
        pendingJdFile,
      );
      setSaving(false);
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
      originRect={originRect}
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
            className="press p-2 rounded-full border border-transparent hover:border-accent hover:bg-accent/25 hover:scale-110"
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
              <SelectField
                value={form.status}
                onChange={(v) => set('status', v)}
                options={optionsFrom(STATUS_OPTIONS)}
                className={selectClass}
                aria-label="Status"
              />
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
              <SelectField
                value={form.role_type}
                onChange={(v) => set('role_type', v)}
                options={optionsFrom(
                  initialJob?.role_type === 'Contract'
                    ? ([...ROLE_TYPE_OPTIONS, 'Contract'] as RoleType[])
                    : ROLE_TYPE_OPTIONS,
                )}
                className={selectClass}
                aria-label="Type of role"
              />
            </Field>

            <Field label="Location Type" required>
              <SelectField
                value={form.location_type}
                onChange={(v) => set('location_type', v)}
                options={optionsFrom(LOCATION_TYPE_OPTIONS)}
                className={selectClass}
                aria-label="Location type"
              />
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

            <Field label="Compensation" full>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={form.ctc}
                  onChange={(e) => set('ctc', e.target.value)}
                  className={`${inputClass} flex-1 min-w-0`}
                  placeholder='e.g. "12 LPA", "₹50,000", "Not disclosed"'
                />
                <SelectField
                  value={form.compensation_period}
                  onChange={(v) => set('compensation_period', v)}
                  options={optionsFrom(COMPENSATION_PERIOD_OPTIONS)}
                  className={`${inputClass} sm:w-36 shrink-0`}
                  aria-label="Compensation period"
                />
              </div>
            </Field>

            <div className="sm:col-span-2 order-first">
              {/* AI autofill — reads whichever JD you add (link, file, or
                  pasted text) and fills the whole form. */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={runAutofill}
                  disabled={aiBusy || !hasJdSource}
                  title={
                    hasJdSource
                      ? 'Fill the form from this job description'
                      : 'Add a link, file, or text below first'
                  }
                  className="press inline-flex items-center gap-2 bg-accent text-secondary px-3.5 py-1.5 rounded-full text-xs font-semibold hover:scale-[1.03] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {aiBusy ? (
                    <span
                      className="inline-block w-3 h-3 rounded-full animate-spin"
                      style={{
                        border: '2px solid rgb(var(--rgb-secondary) / 0.3)',
                        borderTopColor: 'var(--color-secondary)',
                      }}
                      aria-hidden="true"
                    />
                  ) : (
                    <span aria-hidden="true">✨</span>
                  )}
                  {aiBusy ? 'Reading the JD…' : 'Autofill the form with AI'}
                </button>
                <span
                  className="text-[11px]"
                  style={{ color: 'rgb(var(--rgb-ink) / 0.55)' }}
                >
                  Add a link, file, or text below — then autofill.
                </span>
                {aiError && (
                  <span
                    className="text-[11px] w-full"
                    style={{ color: '#dc2626' }}
                  >
                    {aiError}
                  </span>
                )}
              </div>
              {jdMode === 'idle' && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-secondary">
                    Add Job Description:
                  </span>
                  <button
                    type="button"
                    onClick={() => setJdMode('url')}
                    className="press flex items-center justify-center w-11 h-11 rounded-xl border border-transparent hover:border-accent hover:scale-[1.05]"
                    style={{ background: 'rgba(255, 200, 87, 0.3)' }}
                    title="Paste a URL"
                    aria-label="Paste a URL"
                  >
                    <LinkIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setJdMode('text')}
                    className="press flex items-center justify-center w-11 h-11 rounded-xl border border-transparent hover:border-accent hover:scale-[1.05]"
                    style={{ background: 'rgba(255, 200, 87, 0.3)' }}
                    title="Paste JD text"
                    aria-label="Paste JD text"
                  >
                    <TextIcon />
                  </button>
                  <label
                    className="press flex items-center justify-center w-11 h-11 rounded-xl cursor-pointer border border-transparent hover:border-accent hover:scale-[1.05]"
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
                    className="press shrink-0 flex items-center justify-center w-10 rounded-xl border border-[rgb(var(--rgb-secondary)_/_0.25)] hover:border-accent hover:bg-accent/25 hover:scale-[1.05]"
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
                    className="press text-xs font-semibold px-3 py-1 rounded-full border border-transparent hover:border-accent hover:bg-accent/25 hover:scale-[1.08]"
                    style={{ color: '#dc2626' }}
                  >
                    Clear and start over
                  </button>
                </div>
              )}

              {jdMode === 'file' && (
                <div
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-[rgb(var(--rgb-secondary)_/_0.25)] hover:border-accent hover:scale-[1.02] transition-all duration-200 ease-out"
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
                      className="press inline-block text-xs cursor-pointer px-2 py-1 rounded-full border border-transparent hover:border-accent hover:bg-accent/25 hover:scale-[1.08] font-semibold"
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
                      className="press text-xs px-2 py-1 rounded-full border border-transparent hover:border-accent hover:bg-accent/25 hover:scale-[1.08] font-semibold"
                      style={{ color: '#dc2626' }}
                      title="Remove (and switch input option)"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
              {jdError && (
                <p className="text-xs mt-1" style={{ color: '#dc2626' }}>
                  {jdError}
                </p>
              )}
            </div>

            <div className="sm:col-span-2 order-first">
              {resumeMode === 'idle' && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-secondary">
                    Add your resume:
                  </span>
                  <label
                    className="press flex items-center justify-center w-11 h-11 rounded-xl cursor-pointer border border-transparent hover:border-accent hover:scale-[1.05]"
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
                    className="press flex items-center justify-center w-11 h-11 rounded-xl border border-transparent hover:border-accent hover:scale-[1.05]"
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
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-[rgb(var(--rgb-secondary)_/_0.25)] hover:border-accent hover:scale-[1.02] transition-all duration-200 ease-out"
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
                      className="press inline-block text-xs cursor-pointer px-2 py-1 rounded-full border border-transparent hover:border-accent hover:bg-accent/25 hover:scale-[1.08] font-semibold"
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
                      className="press text-xs px-2 py-1 rounded-full border border-transparent hover:border-accent hover:bg-accent/25 hover:scale-[1.08] font-semibold"
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
                    className="press shrink-0 flex items-center justify-center w-10 rounded-xl border border-[rgb(var(--rgb-secondary)_/_0.25)] hover:border-accent hover:bg-accent/25 hover:scale-[1.05]"
                    title="Cancel (back to upload option)"
                    aria-label="Cancel link"
                  >
                    <XIcon />
                  </button>
                </div>
              )}
              {resumeError && (
                <p className="text-xs mt-1" style={{ color: '#dc2626' }}>
                  {resumeError}
                </p>
              )}
            </div>

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
            className="press px-4 py-2 rounded-full text-sm font-semibold border border-[rgb(var(--rgb-secondary)_/_0.4)] hover:border-accent hover:scale-[1.05] disabled:opacity-50 disabled:hover:scale-100"
            style={{ color: 'var(--color-ink)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || saving}
            className="press px-5 py-2 rounded-full text-sm font-semibold bg-accent text-secondary hover:scale-[1.03] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
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
  'w-full bg-primary text-secondary text-sm rounded-xl px-3 py-2 border border-[rgb(var(--rgb-secondary)_/_0.25)] hover:border-accent hover:scale-[1.02] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all duration-200 ease-out';

const selectClass = inputClass;

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
        stroke="var(--color-ink)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 13v2a2 2 0 002 2h9a2 2 0 002-2v-2"
        stroke="var(--color-ink)"
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
        stroke="var(--color-ink)"
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
        stroke="var(--color-ink)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 8.5a3 3 0 00-4.24 0l-2.5 2.5a3 3 0 104.24 4.24L10.5 13.73"
        stroke="var(--color-ink)"
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
        stroke="var(--color-ink)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

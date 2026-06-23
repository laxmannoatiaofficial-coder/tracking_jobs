// Thin client wrapper around the server-side /api/ai route. The browser never
// sees the API key — it only calls our own endpoint, which talks to Claude.

import type { JobApplication } from '@/types';

async function callAi<T>(task: string, payload: unknown): Promise<T> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data && typeof data.error === 'string' && data.error) ||
        'AI request failed',
    );
  }
  return data as T;
}

export interface ExtractedJob {
  company_name: string;
  role: string;
  industry: string;
  location_city: string;
  location_type: string;
  role_type: string;
  ctc: string;
  compensation_period: string;
}

export interface FollowUpDraft {
  subject: string;
  body: string;
}

export interface InterviewPrep {
  questions: string[];
  talking_points: string[];
}

/** Pull structured job fields out of a pasted job description. */
export function extractJob(text: string): Promise<ExtractedJob> {
  return callAi<ExtractedJob>('extract', { text });
}

/** Pull structured job fields from a job-posting URL (server fetches it). */
export function extractJobFromUrl(url: string): Promise<ExtractedJob> {
  return callAi<ExtractedJob>('extract-url', { url });
}

/** Pull structured job fields from an uploaded file (PDF / DOCX / text). The
 *  server reads the document text, then extracts the fields. */
export async function extractJobFromFile(file: File): Promise<ExtractedJob> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/ai', { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data && typeof data.error === 'string' && data.error) ||
        'Autofill failed',
    );
  }
  return data as ExtractedJob;
}

/** Draft a follow-up email for an application. */
export function draftFollowUp(
  job: Partial<JobApplication>,
): Promise<FollowUpDraft> {
  return callAi<FollowUpDraft>('follow-up', { job });
}

/** Generate interview questions + talking points for an application. */
export function interviewPrep(
  job: Partial<JobApplication>,
): Promise<InterviewPrep> {
  return callAi<InterviewPrep>('interview-prep', { job });
}

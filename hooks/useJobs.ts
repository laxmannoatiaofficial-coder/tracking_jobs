'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { PostgrestError } from '@supabase/supabase-js';
import type { JobApplication, JobInput } from '@/types';
import {
  encodeCompensationInCtc,
  normalizeJobCompensation,
} from '@/utils/helpers';
import { supabase, RESUMES_BUCKET } from '@/utils/supabase';

export interface UseJobsResult {
  jobs: JobApplication[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addJob: (
    data: JobInput,
    resumeFile?: File | null,
    jdFile?: File | null,
  ) => Promise<string | undefined>;
  editJob: (
    id: string,
    data: Partial<JobInput>,
    resumeFile?: File | null,
    jdFile?: File | null,
  ) => Promise<string | undefined>;
  deleteJob: (id: string) => Promise<void>;
}

const COMPENSATION_PERIOD_MIGRATION =
  'alter table job_applications add column if not exists compensation_period text;';

const COMPENSATION_FALLBACK_WARNING =
  'Saved, but compensation period is stored in the amount text until you add the compensation_period column in Supabase.';

// Postgres `date` columns reject '' — convert to null for nullable date fields.
function sanitizeForDb<T extends Record<string, unknown>>(payload: T): T {
  const out: Record<string, unknown> = { ...payload };
  if (out.follow_up_date === '') {
    out.follow_up_date = null;
    // A cleared follow-up can't stay "done"
    out.follow_up_done = false;
  }
  if (out.compensation_period === '') out.compensation_period = null;
  if (out.ctc === '') {
    out.ctc = null;
    out.compensation_period = null;
  }
  return out as T;
}

function isMissingCompensationPeriodColumn(error: PostgrestError | null): boolean {
  const msg = error?.message?.toLowerCase() ?? '';
  return (
    msg.includes('compensation_period') &&
    (msg.includes('column') ||
      msg.includes('schema cache') ||
      msg.includes('could not find'))
  );
}

function withoutCompensationPeriodColumn(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const period = payload.compensation_period as string | null | undefined;
  const ctc = (payload.ctc as string | null | undefined) ?? '';
  const { compensation_period: _drop, ...rest } = payload;
  return sanitizeForDb({
    ...rest,
    ctc: encodeCompensationInCtc(ctc, period as '' | 'Annual' | 'Monthly'),
  });
}

async function uploadResume(
  userId: string,
  file: File,
): Promise<{ url: string; fileName: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${Date.now()}_${safeName}`;
  const { error: uploadErr } = await supabase.storage
    .from(RESUMES_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/pdf',
    });
  if (uploadErr) throw uploadErr;
  const { data } = supabase.storage.from(RESUMES_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, fileName: file.name };
}

async function uploadJdFile(
  userId: string,
  file: File,
): Promise<{ url: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/jd/${Date.now()}_${safeName}`;
  const { error: uploadErr } = await supabase.storage
    .from(RESUMES_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
  if (uploadErr) throw uploadErr;
  const { data } = supabase.storage.from(RESUMES_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

// Cross-instance sync: multiple useJobs instances (e.g. the dashboard grid and
// the header's follow-up bell) stay consistent by broadcasting each mutation as
// a patch other instances apply locally — no refetch, no flicker.
const JOBS_EVENT = 'trackitt:jobs';
type JobsPatch =
  | { kind: 'upsert'; job: JobApplication; sourceId: string }
  | { kind: 'delete'; id: string; sourceId: string };

export function useJobs(user: User | null): UseJobsResult {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const instanceId = useState(() => Math.random().toString(36).slice(2))[0];

  const broadcast = useCallback(
    (
      patch:
        | { kind: 'upsert'; job: JobApplication }
        | { kind: 'delete'; id: string },
    ) => {
      window.dispatchEvent(
        new CustomEvent(JOBS_EVENT, {
          detail: { ...patch, sourceId: instanceId },
        }),
      );
    },
    [instanceId],
  );

  // Apply patches broadcast by other instances.
  useEffect(() => {
    const onPatch = (e: Event) => {
      const d = (e as CustomEvent<JobsPatch>).detail;
      if (!d || d.sourceId === instanceId) return;
      if (d.kind === 'delete') {
        setJobs((prev) => prev.filter((j) => j.id !== d.id));
      } else {
        setJobs((prev) =>
          prev.some((j) => j.id === d.job.id)
            ? prev.map((j) => (j.id === d.job.id ? d.job : j))
            : [d.job, ...prev],
        );
      }
    };
    window.addEventListener(JOBS_EVENT, onPatch);
    return () => window.removeEventListener(JOBS_EVENT, onPatch);
  }, [instanceId]);

  const fetchJobs = useCallback(async () => {
    if (!user) {
      setJobs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('job_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (err) {
      setError(err.message);
      setJobs([]);
    } else {
      setJobs(
        (data ?? []).map((row) =>
          normalizeJobCompensation(row as JobApplication),
        ),
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const persistJob = useCallback(
    async (
      mode: 'insert' | 'update',
      payload: Record<string, unknown>,
      id?: string,
    ): Promise<{ row: JobApplication; warning?: string }> => {
      const sanitized = sanitizeForDb(payload);

      const run = async (body: Record<string, unknown>) => {
        if (mode === 'insert') {
          return supabase
            .from('job_applications')
            .insert(body)
            .select()
            .single();
        }
        return supabase
          .from('job_applications')
          .update(body)
          .eq('id', id!)
          .select()
          .single();
      };

      let result = await run(sanitized);

      if (isMissingCompensationPeriodColumn(result.error)) {
        result = await run(withoutCompensationPeriodColumn(sanitized));
        if (result.error) throw result.error;
        return {
          row: normalizeJobCompensation(result.data as JobApplication),
          warning: COMPENSATION_FALLBACK_WARNING,
        };
      }

      if (result.error) {
        if (result.error.message.includes('compensation_period')) {
          throw new Error(
            `Could not save compensation period. Add this column in Supabase SQL Editor:\n${COMPENSATION_PERIOD_MIGRATION}`,
          );
        }
        throw result.error;
      }

      return {
        row: normalizeJobCompensation(result.data as JobApplication),
      };
    },
    [],
  );

  const addJob = useCallback(
    async (
      data: JobInput,
      resumeFile?: File | null,
      jdFile?: File | null,
    ): Promise<string | undefined> => {
      if (!user) throw new Error('Not signed in');
      let resumeUrl = data.resume_url;
      let resumeFileName = data.resume_file_name;
      let jdUrl = data.jd_url;
      if (resumeFile) {
        const uploaded = await uploadResume(user.id, resumeFile);
        resumeUrl = uploaded.url;
        resumeFileName = uploaded.fileName;
      }
      if (jdFile) {
        const uploaded = await uploadJdFile(user.id, jdFile);
        jdUrl = uploaded.url;
      }
      const { row, warning } = await persistJob('insert', {
        ...data,
        resume_url: resumeUrl,
        resume_file_name: resumeFileName,
        jd_url: jdUrl,
        user_id: user.id,
      });
      setJobs((prev) => [row, ...prev]);
      broadcast({ kind: 'upsert', job: row });
      return warning;
    },
    [user, persistJob, broadcast],
  );

  const editJob = useCallback(
    async (
      id: string,
      data: Partial<JobInput>,
      resumeFile?: File | null,
      jdFile?: File | null,
    ): Promise<string | undefined> => {
      if (!user) throw new Error('Not signed in');
      const patch: Partial<JobInput> = { ...data };
      if (resumeFile) {
        const uploaded = await uploadResume(user.id, resumeFile);
        patch.resume_url = uploaded.url;
        patch.resume_file_name = uploaded.fileName;
      }
      if (jdFile) {
        const uploaded = await uploadJdFile(user.id, jdFile);
        patch.jd_url = uploaded.url;
      }
      const { row, warning } = await persistJob('update', patch, id);
      setJobs((prev) => prev.map((j) => (j.id === id ? row : j)));
      broadcast({ kind: 'upsert', job: row });
      return warning;
    },
    [user, persistJob, broadcast],
  );

  const deleteJob = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not signed in');
      const { error: err } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', id);
      if (err) throw err;
      setJobs((prev) => prev.filter((j) => j.id !== id));
      broadcast({ kind: 'delete', id });
    },
    [user, broadcast],
  );

  return {
    jobs,
    loading,
    error,
    refetch: fetchJobs,
    addJob,
    editJob,
    deleteJob,
  };
}

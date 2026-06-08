'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { JobApplication, JobInput } from '@/types';
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
  ) => Promise<void>;
  editJob: (
    id: string,
    data: Partial<JobInput>,
    resumeFile?: File | null,
    jdFile?: File | null,
  ) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
}

// Postgres `date` columns reject '' — convert to null for nullable date fields.
function sanitizeForDb<T extends Record<string, unknown>>(payload: T): T {
  const out: Record<string, unknown> = { ...payload };
  if (out.follow_up_date === '') out.follow_up_date = null;
  return out as T;
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

export function useJobs(user: User | null): UseJobsResult {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setJobs((data ?? []) as JobApplication[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const addJob = useCallback(
    async (
      data: JobInput,
      resumeFile?: File | null,
      jdFile?: File | null,
    ) => {
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
      const payload = sanitizeForDb({
        ...data,
        resume_url: resumeUrl,
        resume_file_name: resumeFileName,
        jd_url: jdUrl,
        user_id: user.id,
      });
      const { data: inserted, error: err } = await supabase
        .from('job_applications')
        .insert(payload)
        .select()
        .single();
      if (err) throw err;
      setJobs((prev) => [inserted as JobApplication, ...prev]);
    },
    [user],
  );

  const editJob = useCallback(
    async (
      id: string,
      data: Partial<JobInput>,
      resumeFile?: File | null,
      jdFile?: File | null,
    ) => {
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
      const { data: updated, error: err } = await supabase
        .from('job_applications')
        .update(sanitizeForDb(patch))
        .eq('id', id)
        .select()
        .single();
      if (err) throw err;
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? (updated as JobApplication) : j)),
      );
    },
    [user],
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
    },
    [user],
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

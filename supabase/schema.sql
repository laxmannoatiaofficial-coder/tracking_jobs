-- ============================================================================
-- Job Tracker — Supabase schema
-- Paste this whole file into the Supabase SQL Editor and run once.
-- ============================================================================

-- 1. Create the job_applications table
create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  company_name text not null,
  role text not null,
  industry text,
  ctc text,
  compensation_period text,
  role_type text not null,
  location_type text not null,
  location_city text,
  resume_file_name text,
  resume_url text,
  jd_url text,
  jd_text text,
  personal_note text,
  status text not null default 'Applied',
  date_of_application date not null,
  follow_up_date date,
  follow_up_done boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Enable Row Level Security
alter table job_applications enable row level security;

-- 3. RLS Policy: users can only read their own rows
create policy "Users can view their own jobs"
  on job_applications for select
  using (auth.uid() = user_id);

-- 4. RLS Policy: users can only insert rows for themselves
create policy "Users can insert their own jobs"
  on job_applications for insert
  with check (auth.uid() = user_id);

-- 5. RLS Policy: users can only update their own rows
create policy "Users can update their own jobs"
  on job_applications for update
  using (auth.uid() = user_id);

-- 6. RLS Policy: users can only delete their own rows
create policy "Users can delete their own jobs"
  on job_applications for delete
  using (auth.uid() = user_id);

-- 7. Helpful index for the dashboard's per-user, newest-first query
create index if not exists job_applications_user_created_idx
  on job_applications (user_id, created_at desc);

-- ============================================================================
-- Company Watchlist — companies you may apply to in the future
-- ============================================================================
create table if not exists company_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  kind text not null default 'Company', -- 'Company' or 'Job'
  company_name text not null,
  role text,                            -- only for kind = 'Job'
  industry text,
  website_url text,
  location text,
  note text,
  created_at timestamptz not null default now()
);

alter table company_watchlist enable row level security;

create policy "Users can view their own watchlist"
  on company_watchlist for select
  using (auth.uid() = user_id);

create policy "Users can insert their own watchlist"
  on company_watchlist for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own watchlist"
  on company_watchlist for update
  using (auth.uid() = user_id);

create policy "Users can delete their own watchlist"
  on company_watchlist for delete
  using (auth.uid() = user_id);

create index if not exists company_watchlist_user_created_idx
  on company_watchlist (user_id, created_at desc);

-- ============================================================================
-- EXISTING PROJECTS: if you already ran this schema, add the new columns with:
--
--   alter table job_applications
--     add column if not exists compensation_period text;
--   alter table job_applications
--     add column if not exists follow_up_done boolean not null default false;
--
-- ============================================================================
-- AFTER RUNNING THIS FILE:
--
-- A. Storage bucket for resumes
--    1. Go to Supabase Dashboard → Storage → New bucket
--    2. Name: resumes
--    3. Mark it as PUBLIC (so the public URLs we save work without auth)
--    4. Add this Storage policy (Storage → Policies → New policy on `resumes`):
--
--       create policy "Authenticated users can upload to their own folder"
--         on storage.objects for insert
--         to authenticated
--         with check (
--           bucket_id = 'resumes'
--           and (storage.foldername(name))[1] = auth.uid()::text
--         );
--
--       create policy "Public read of resumes"
--         on storage.objects for select
--         using (bucket_id = 'resumes');
--
-- B. Enable auth providers
--    1. Authentication → Providers → Email: enable
--       (disable email confirmation for easier local dev)
--    2. Authentication → Providers → Google: enable
--       (paste Google OAuth Client ID + Secret from Google Cloud Console)
-- ============================================================================

# Job Tracker

A personal, multi-user job application tracker built with **Next.js**, **TypeScript**, **Tailwind CSS**, and **Supabase** (Auth + Postgres + Storage). Sign in with Google or email/password, track every application across its full lifecycle, and store your resumes — all scoped per-user with database-level Row Level Security.

## Features

- Google OAuth + email/password authentication via Supabase Auth
- Per-user data isolation enforced by Row Level Security policies
- Add, edit, and delete job applications
- Track status across Applied → Shortlisted → Interviewing → Offered/Rejected
- Filter by status, sort by date or company name
- Upload a resume PDF (≤ 5MB) per application — stored in Supabase Storage
- Follow-up dates with overdue / today / upcoming indicators
- Delete your account (and all your data) from the in-app menu

## Prerequisites

- **Node.js ≥ 18.17** and **npm**
- A free **Supabase** project — sign up at [supabase.com](https://supabase.com)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com) → New Project. Pick a name, region, and database password.

### 3. Run the schema

Open Supabase Dashboard → SQL Editor → New Query. Paste the contents of [`supabase/schema.sql`](./supabase/schema.sql) and click **Run**. This creates the `job_applications` table, enables RLS, and adds the per-user policies.

### 4. Create the resumes storage bucket

Supabase Dashboard → Storage → **New bucket**:
- Name: `resumes`
- Mark as **Public** (the public URLs we save reference files here)

Then go to Storage → Policies → New policy on the `resumes` bucket and add the two policies shown at the bottom of `supabase/schema.sql` (upload restricted to the user's own folder, public read).

### 5. Enable auth providers

- **Email**: Authentication → Providers → Email → enable. For easier local dev, also disable "Confirm email".
- **Google**: Authentication → Providers → Google → enable.
  - You'll need a Google OAuth Client ID + Secret from [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client ID.
  - Add `http://localhost:3000` (and your production URL) as an authorised JavaScript origin.
  - Add the Supabase-provided callback URL (shown in the provider settings, e.g. `https://YOUR-REF.supabase.co/auth/v1/callback`) as an authorised redirect URI.

### 6. Wire up your env vars

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in three values from Supabase Dashboard → Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

> **Never commit `.env.local`.** The `SUPABASE_SERVICE_ROLE_KEY` is server-only — it must NOT have the `NEXT_PUBLIC_` prefix and is used exclusively by the `/api/delete-account` route.

### 7. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → sign up or continue with Google → start tracking.

## Build

```bash
npm run build
npm start
```

## Architecture notes

- **Single Supabase client** in `utils/supabase.ts` is shared across the app.
- **`useAuth`** hook (`hooks/useAuth.ts`) manages the session, subscribes to `onAuthStateChange`, and exposes `signIn`, `signUp`, `signInWithGoogle`, `signOut`, `deleteAccount`.
- **`useJobs`** hook (`hooks/useJobs.ts`) handles all CRUD on `job_applications`, scoped per-user (RLS also enforces this server-side).
- **`AuthGuard`** wraps `/dashboard` and redirects to `/login` if no session.
- **Account deletion** goes through `/api/delete-account` (server-only, uses the service-role key). Because the schema declares `on delete cascade` for `user_id`, deleting the user automatically drops all their job rows.
- **Resume uploads** land in `resumes/{userId}/{timestamp}_{filename}` so each user's files live in their own folder, gated by a storage RLS policy.

## Troubleshooting

- **"Missing Supabase env vars" warning in the console** → your `.env.local` isn't set up. See step 6.
- **Google sign-in lands on `/login` instead of `/dashboard`** → check that your Supabase Auth → URL Configuration → Site URL matches the URL you're running from.
- **Pop-up blocked on Google sign-in** → not an issue here; `signInWithOAuth` uses a full-page redirect, not a popup.

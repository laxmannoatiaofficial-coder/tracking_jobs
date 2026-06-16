# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Trackitt** — a personal, multi-user job-application tracker. Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (Auth + Postgres + Storage), with framer-motion for animation. Deployed on Netlify at `trackingjobs.netlify.app`; backend is the Supabase project `cyzpjcntakgxcjnwlrnp`. The README has full Supabase/Google-OAuth setup steps.

## Commands

```bash
npm run dev      # dev server on :3000
npm run build    # production build — full type-check + lint + static gen
npm run lint     # next lint (eslint) only
npx tsc --noEmit # fast type-check without building
```

- **There is no test suite** (no jest/vitest, no test script). Don't invent test commands.
- **Always run `npm run build` before deploying.** Dev mode does not full-type-check or run static generation, so the production build catches errors dev silently allows.
- On Windows, prefer the **Bash** tool for git and PowerShell only where needed. Two processes touching `.next` simultaneously corrupts it — stop the dev server before `npm run build`, and avoid running two dev servers at once.
- `reactStrictMode` is on, so effects double-invoke in dev. Mount-only effects must be safe to run twice (see `Modal.tsx`).

## Deployment

Netlify auto-builds from GitHub `main` (`netlify.toml` → `npm run build`, `@netlify/plugin-nextjs`). **Deploying = committing and pushing to `main`** (this is the one case where pushing straight to the default branch is intended). There is no separate deploy command. Database schema changes are applied directly to the live Supabase project (MCP or dashboard) — there is no CLI migration folder; `supabase/schema.sql` is the source-of-truth document and includes `ALTER` snippets for existing projects.

## Architecture

### Auth & data isolation
- One shared Supabase client (`utils/supabase.ts`), browser-side, localStorage sessions.
- `hooks/useAuth.ts` owns the session (`onAuthStateChange`) and exposes sign-in/up/google/out + `deleteAccount`.
- Every signed-in page is wrapped in `AuthGuard`, which renders a spinner until the session resolves, then redirects to `/login` if absent. **Consequence: protected pages render nothing meaningful in the server HTML** — content paints only after JS + auth resolve client-side (this is the main LCP cost).
- Per-user isolation is enforced by Postgres **Row Level Security** (every table policy keys on `auth.uid() = user_id`), not just client filtering.
- Account deletion needs the service-role key, which must never reach the browser — it lives only in `/app/api/delete-account/route.ts`. `ON DELETE CASCADE` on `user_id` means deleting the auth user drops all their rows.

### Data hooks and cross-instance sync (non-obvious)
- `hooks/useJobs.ts` and `hooks/useWatchlist.ts` are per-user CRUD hooks. The same hook is instantiated in **multiple places at once** — e.g. the dashboard grid and the header's reminders bell both call `useJobs`.
- To keep those independent instances consistent without refetching, `useJobs` **broadcasts each mutation as a patch over a `window` CustomEvent (`trackitt:jobs`)** tagged with an instance id; every other instance applies the patch to its own local state and ignores its own events. When editing job data, prefer going through `useJobs` so this stays in sync.
- `useJobs` has a resilience quirk: if the DB is missing the `compensation_period` column it falls back to encoding the period inside the `ctc` text (`encodeCompensationInCtc` / `normalizeJobCompensation` in `utils/helpers.ts`).

### Shared header + notification bell
- `components/AppHeader.tsx` is the ribbon on all signed-in pages: section nav (Applications / Watchlist / About), the **reminders bell**, account menu (with the dark-mode toggle inside it).
- The bell reads `useJobs` + `useWatchlist` and surfaces: follow-ups due today/tomorrow/overdue, plus watchlist entries older than a week. Clicking a reminder opens that specific item's detail modal **on another page** via a two-channel handoff: `sessionStorage` (`trackitt-open-job` / `trackitt-open-watch`) for fresh navigations + a `window` CustomEvent (`trackitt:open-job` / `trackitt:open-watch`) for when already on the page. The target page reads both on mount and via listener. The Watchlist→Applications "promote" flow uses the same pattern with `trackitt-promote`.

### Card → modal morph
- `components/Modal.tsx` `ZoomPanel` does a FLIP morph: the panel starts at a source card's `DOMRect` (`originRect`, captured on card click) and morphs to the modal box, reversing on close. Pages pass `originRect` through the detail modals. When opened without a source (e.g. from the bell), `originRect` is null and a plain scale-up is used.

### Design system (enforced conventions)
- **Three color tokens only**: `primary` / `secondary` / `accent`, defined as CSS variables in `app/globals.css` and mapped in `tailwind.config.ts`. Do **not** use Tailwind default colors (`gray`, `slate`, `zinc`, `white`, etc.) — everything routes through the tokens (status-badge colors in `globals.css` are the one exception).
- **Dark mode** swaps the CSS variables under a `.dark` class; the class is set pre-paint by an inline script in `app/layout.tsx` to avoid a flash. Because both light/dark surface palettes can be dark, `globals.css` force-overrides `text-primary`/`text-secondary` with `!important` in dark mode — keep that in mind when text color looks wrong.
- Global **squircle corners** (`corner-shape: squircle`) applied in `globals.css`, with `rounded-full` elements opted back out.
- Fonts: Plus Jakarta Sans (`font-display`) + DM Sans (`font-body`) via `next/font` in `layout.tsx`.

### Supabase schema
- Two tables, both per-user with RLS + cascade delete: `job_applications` and `company_watchlist` (a watchlist entry is a `kind` of `'Company'` or `'Job'`). See `supabase/schema.sql`.
- Resume/JD files go to the public `resumes` bucket under `resumes/{userId}/...`, gated by a storage policy.

# trackitt-mcp-server

A remote **MCP (Model Context Protocol)** server for [Trackitt](https://trackingjobs.netlify.app).
Connect it to Claude and manage your job applications and company watchlist in natural language —
*"mark the Google SDE application as Interviewing and set a follow-up for next Friday"*, *"add Stripe
to my watchlist"*, *"delete the duplicate Amazon row"*.

It talks directly to the same Supabase project the web app uses. **Per-user isolation is enforced by
Supabase Row Level Security**, not by this server: every request authenticates as one user, the server
only ever holds that user's JWT (never the service-role key), so users can only ever see and change
their own rows.

## Tools

| Tool | What it does |
| --- | --- |
| `trackitt_list_jobs` | List applications, filter by status / company, paginated |
| `trackitt_get_job` | Fetch one application by id |
| `trackitt_create_job` | Add an application |
| `trackitt_update_job` | Patch fields (status, follow-up, notes, …) |
| `trackitt_delete_job` | Delete an application |
| `trackitt_list_watchlist` | List watchlist entries, filter by kind / company |
| `trackitt_create_watchlist_entry` | Add a company/job to the watchlist |
| `trackitt_update_watchlist_entry` | Patch a watchlist entry |
| `trackitt_delete_watchlist_entry` | Delete a watchlist entry |

(Resume/JD **file uploads** are intentionally not exposed — do those in the web app.)

## Authentication

Each request must say which user it acts for, via HTTP headers, in one of two ways:

1. **`Authorization: Bearer <supabase-access-token>`** — preferred; no password on the wire.
2. **`x-trackitt-email` + `x-trackitt-password`** — the server exchanges them for a token per request.

> ⚠️ Email+password means each user's password reaches this server over HTTPS. That's fine for a
> personal-scale project, but if this grows, switch the auth layer (`src/auth.ts`) to a proper
> Supabase OAuth flow — none of the tool code changes.

## Configuration

Set these env vars (same values as the app's `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`):

```
SUPABASE_URL=https://cyzpjcntakgxcjnwlrnp.supabase.co
SUPABASE_ANON_KEY=<anon key>
```

## Run locally

```bash
cd mcp-server
npm install
cp .env.example .env          # fill in SUPABASE_ANON_KEY
npm run build
npm start                     # http://localhost:3333/mcp
```

Inspect/test the tools with the official inspector:

```bash
npx @modelcontextprotocol/inspector
# Transport: Streamable HTTP · URL: http://localhost:3333/mcp
# Add headers: x-trackitt-email / x-trackitt-password (or Authorization: Bearer ...)
```

## Deploy to Netlify (its own site)

Deploy this folder as a **separate** Netlify site from the Next.js app:

1. Netlify → **Add new site** → pick this repo.
2. **Base directory:** `mcp-server` (build command `npm run build` and functions dir come from `netlify.toml`).
3. **Site settings → Environment variables:** add `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
4. Deploy. Your endpoint is `https://<your-mcp-site>.netlify.app/mcp`.

## Connect it to Claude

Add it as a custom connector / remote MCP server pointing at your `…/mcp` URL, and supply your
Trackitt credentials as headers (`x-trackitt-email`, `x-trackitt-password`) or a Bearer token.
Then just ask Claude to read or update your applications.

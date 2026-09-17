# Vajra · AI Enablement Audit

A free audit that shows a company how much of its work AI could carry today, where it stands, and where to start. Every response is saved to Supabase and visible on a private admin page.

- **Audit:** `/` (Executive snapshot, 3 min · Department audit, 10 min per team)
- **Admin:** `/admin` (password login, response list, detail view, CSV export)

## How it works

| Piece | What it does |
|---|---|
| `index.html`, `app.js`, `audit-data.js`, `styles.css` | The audit. Plain HTML/JS, no build step. Vajra brand. |
| `api/save.js` | Receives answers as people go and saves them. Validates everything. |
| `api/admin/*` | Admin login (signed, HttpOnly cookie), logout, and response list. |
| `supabase/schema.sql` | One table (`audit_responses`) and one function (`audit_save`). Only the server can read or write. |

- Visitors enter **name, work email and company** before starting either path.
- Answers **autosave** (debounced) and on tab close, so drop-offs are captured as `in_progress`.
- Each response gets a random edit token in the visitor's browser. Updates without that token are rejected, so nobody can overwrite someone else's response.
- On completion, people can **download a 2-page branded PDF report** (`report.js`) with a *Book a consultation* link to vajra.work/demo. Downloads are flagged as hot leads in `/admin` and the CSV.
- The "See a finished sample" demo never saves.
- A new database row is created when the email or company changes, so a shared computer doesn't overwrite a previous person.

## Setup

1. **Supabase:** open the SQL editor and run `supabase/schema.sql`. It only creates objects named `audit_*`, so it's safe in an existing project, and it can be re-run.
2. **Vercel:** import this repo (framework preset: *Other*, no build command) and add environment variables:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Project URL, e.g. `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project settings → API keys → **New secret key** (name it `ai-enablement-audit`, so it can be revoked on its own). A legacy `service_role` key also works. Server-only, never exposed to the browser. |
| `ADMIN_PASSWORD` | A long password (min 10 chars) for `/admin`. Changing it logs everyone out. |

3. Deploy, open `/api/health` (every line should say `ok` or `secret key`), take the audit with a test email, then check `/admin`.

## Edit the content

Tasks, benchmarks, department ceilings and sources are in `audit-data.js` (`DEPTS`, `THEO`, `TYP`, `PROOF`, `CONNECT`).

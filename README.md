# Vajra · AI Enablement Audit

A free audit that shows a company how much of its work AI could carry today, where it stands, and where to start. Every response is saved to Supabase and visible on a private admin page.

- **Audit:** `/` (Executive snapshot, 3 min · Department audit, 10 min per team)
- **Admin:** `/admin` (email one-time-code login, restricted to a pre-defined list of emails · response list, detail view, CSV export)

## How it works

| Piece | What it does |
|---|---|
| `index.html`, `app.js`, `audit-data.js`, `styles.css` | The audit. Plain HTML/JS, no build step. Vajra brand. |
| `api/save.js` | Receives answers as people go and saves them. Validates everything. |
| `api/admin/request-otp.js`, `api/admin/verify-otp.js` | Admin login: emails a 6-digit code to a pre-defined address, then exchanges the code for a signed, HttpOnly session cookie. |
| `api/admin/logout.js`, `api/admin/responses.js` | Logout and the response list, both gated on that cookie. |
| `supabase/schema.sql` | `audit_responses` (audit answers) and `vajra_admin_otp` (pending login codes). Only the server can read or write either. |

- Visitors enter **name, work email and company** before starting either path.
- Answers **autosave** (debounced) and on tab close, so drop-offs are captured as `in_progress`.
- Each response gets a random edit token in the visitor's browser. Updates without that token are rejected, so nobody can overwrite someone else's response.
- On completion, people can **download a 2-page branded PDF report** (`report.js`) with a *Book a consultation* link to vajra.work/demo. Downloads are flagged as hot leads in `/admin` and the CSV.
- The "See a finished sample" demo never saves.
- A new database row is created when the email or company changes, so a shared computer doesn't overwrite a previous person.
- Admin login: enter an allowed email, get a 6-digit code by email (expires in 10 min, 5 attempts, one active code per email), enter it to get a session that lasts a week.

## Setup

1. **Supabase:** open the SQL editor and run `supabase/schema.sql`. It only creates objects named `audit_*` and the `vajra_admin_otp` table, so it's safe in an existing project, and it can be re-run.
2. **Resend:** create a free account at resend.com and grab an API key. Sending works out of the box from Resend's shared test address; verify your own domain there before switching `RESEND_FROM_EMAIL` to an `@vajra.work` address.
3. **Vercel:** import this repo (framework preset: *Other*, no build command) and add environment variables:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Project URL, e.g. `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project settings → API keys → **New secret key** (name it `ai-enablement-audit`, so it can be revoked on its own). A legacy `service_role` key also works. Server-only, never exposed to the browser. |
| `ADMIN_ALLOWED_EMAILS` | Comma-separated list of the only emails allowed into `/admin`, e.g. `you@x.com,teammate@x.com` |
| `ADMIN_SESSION_SECRET` | A long random string used to sign admin session cookies — e.g. run `openssl rand -hex 32` and paste the result. Changing it logs everyone out. |
| `RESEND_API_KEY` | From resend.com, used to email the one-time login codes |
| `RESEND_FROM_EMAIL` *(optional)* | A verified sender, e.g. `Vajra Admin <admin@vajra.work>`. Defaults to Resend's shared test address if unset. |

4. Deploy, open `/api/health` (every line should say `ok`), take the audit with a test email, then check `/admin`.

## Edit the content

Tasks, benchmarks, department ceilings and sources are in `audit-data.js` (`DEPTS`, `THEO`, `TYP`, `PROOF`, `CONNECT`).

# CII Kerala · AI Adoption Panel Survey

A rebranded clone of the Vajra AI enablement audit, prepared in association with CII Kerala (Confederation of Indian Industry, Kerala) as a research study for CII Kerala-affiliated founders. Same audit mechanics and scoring as the original; no Vajra branding, no consultation CTA, and submissions are kept in a completely separate set of database objects from the Vajra audit — even though both currently share the same Supabase project.

- **Audit:** `/` (Executive snapshot, 3 min · Department audit, 10 min per team)
- **Admin:** `/admin` (email one-time-code login, restricted to a pre-defined list of emails · response list, detail view, CSV export, PDF report generation)

## How this differs from the Vajra audit

- Branding: CII Kerala mark/wordmark, navy colour token in place of Vajra's green, no Vajra references anywhere in the UI or the generated PDF.
- No self-serve "Download report (PDF)" button for visitors. On completion, the page tells them the team will email a detailed report. The admin panel can still generate and download the identical PDF (via `report.js` / `admin-report.js`) so it can be sent manually.
- No "Book a consultation" / commercial CTA anywhere, in the app or in the PDF report.
- Fully separate data: this app writes to `cii_audit_responses` and `cii_admin_otp` (not `audit_responses` / `vajra_admin_otp`), so it can safely share a Supabase project with the Vajra audit without any overlap.
- Storage key in the browser is `cii-audit-v1` (not `vajra-audit-v1`), so testing both apps in the same browser doesn't collide.

## How it works

| Piece | What it does |
|---|---|
| `index.html`, `app.js`, `audit-data.js`, `styles.css` | The audit. Plain HTML/JS, no build step. CII Kerala-adapted brand. |
| `api/save.js` | Receives answers as people go and saves them. Validates everything. |
| `api/admin/request-otp.js`, `api/admin/verify-otp.js` | Admin login: emails a 6-digit code to a pre-defined address, then exchanges the code for a signed, HttpOnly session cookie. |
| `api/admin/logout.js`, `api/admin/responses.js` | Logout and the response list, both gated on that cookie. |
| `supabase/schema.sql` | `cii_audit_responses` (audit answers) and `cii_admin_otp` (pending login codes). Only the server can read or write either. |

- Visitors enter **name, work email and company** before starting either path.
- Answers **autosave** (debounced) and on tab close, so drop-offs are captured as `in_progress`.
- Each response gets a random edit token in the visitor's browser. Updates without that token are rejected, so nobody can overwrite someone else's response.
- On completion, people see a note that the team will email them a detailed report — there's no self-serve download. Report downloads from the admin panel are flagged in `/admin` and the CSV, same as before.
- The "See a finished sample" demo never saves.
- A new database row is created when the email or company changes, so a shared computer doesn't overwrite a previous person.
- Admin login: enter an allowed email, get a 6-digit code by email (expires in 10 min, 5 attempts, one active code per email), enter it to get a session that lasts a week.

## Setup

1. **Supabase:** open the SQL editor of the **same project already used for the Vajra audit** (or a different one, if you'd rather) and run `supabase/schema.sql`. It only creates objects named `cii_audit_*` and the `cii_admin_otp` table, so it's safe to run alongside the Vajra audit's schema, and it can be re-run.
2. **Resend:** reuse the existing Resend account/API key, or create a new one at resend.com. Sending works out of the box from Resend's shared test address; verify a domain there before switching `RESEND_FROM_EMAIL` to a real address.
3. **Vercel:** create a **new** Vercel project from this same GitHub repo, but set it to deploy the `cii-research` branch (Project Settings → Git → Production Branch) instead of `main`, so it stays independent of the Vajra audit's deployment. Framework preset: *Other*, no build command. Add environment variables:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Same project URL as the Vajra audit (or a new project's URL), e.g. `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project settings → API keys → **New secret key** (name it e.g. `cii-audit`, so it can be revoked on its own). A legacy `service_role` key also works. Server-only, never exposed to the browser. |
| `ADMIN_ALLOWED_EMAILS` | Comma-separated list of the only emails allowed into `/admin` |
| `ADMIN_SESSION_SECRET` | A long random string used to sign admin session cookies — run `openssl rand -hex 32` and paste the result. Use a **different** value from the Vajra audit's secret, so admin sessions don't cross over. Changing it logs everyone out. |
| `RESEND_API_KEY` | From resend.com, used to email the one-time login codes |
| `RESEND_FROM_EMAIL` *(optional)* | A verified sender. Defaults to Resend's shared test address if unset. |

4. **Domain:** point `survey.fastrbuild.com` (or whichever domain you choose) at this Vercel project.
5. Deploy, open `/api/health` (every line should say `ok`), take the audit with a test email, then check `/admin`.

## Edit the content

Tasks, benchmarks, department ceilings and sources are in `audit-data.js` (`DEPTS`, `THEO`, `TYP`, `PROOF`, `CONNECT`) — unchanged from the Vajra audit, since the methodology itself isn't brand-specific.

## Before this goes out to CII Kerala founders

The on-page copy (privacy line, eyebrow text, footer attribution, closing message) uses reasonable defaults referencing "in association with CII Kerala" — review the exact wording in `index.html`, `app.js` and `report.js` before sharing this externally, since it's the wording founders will actually read.

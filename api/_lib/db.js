import crypto from 'node:crypto';

const URL_ = () => (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function configured() {
  return Boolean(URL_() && KEY());
}

function headers(extra = {}) {
  const key = KEY();
  // New Supabase secret keys (sb_secret_...) are not JWTs: send them only as `apikey`.
  // Legacy service_role keys are JWTs and also go in the Authorization header.
  const auth = key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` };
  return { apikey: key, ...auth, 'Content-Type': 'application/json', ...extra };
}

export async function rpc(fn, args) {
  const r = await fetch(`${URL_()}/rest/v1/rpc/${fn}`, { method: 'POST', headers: headers(), body: JSON.stringify(args) });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}

export async function select(path) {
  const r = await fetch(`${URL_()}/rest/v1/${path}`, { headers: headers() });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}

// Generic write (POST upsert / PATCH / DELETE) against a table, for server-only use.
// `path` may include a query string, e.g. `vajra_admin_otp?on_conflict=email` or `vajra_admin_otp?email=eq.x`.
export async function write(path, method, body) {
  const prefer = method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal';
  const r = await fetch(`${URL_()}/rest/v1/${path}`, {
    method,
    headers: headers({ Prefer: prefer }),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, status: r.status };
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8'));
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 300_000) throw new Error('too large');
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

/* ---- admin allowlist ---- */
export function allowedEmails() {
  return String(process.env.ADMIN_ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email) {
  return allowedEmails().includes(String(email || '').trim().toLowerCase());
}

/* ---- admin session: signed, expiring cookie carrying the logged-in email. No secrets stored in the browser. ---- */
const COOKIE = 'vajra_audit_admin';
const WEEK = 7 * 24 * 3600;

function signingKey() {
  return crypto.createHash('sha256').update(`${process.env.ADMIN_SESSION_SECRET || ''}::${KEY()}`).digest();
}

export function sessionCookie(email) {
  const exp = Math.floor(Date.now() / 1000) + WEEK;
  const e = Buffer.from(String(email || '').trim().toLowerCase()).toString('base64url');
  const payload = `${exp}.${e}`;
  const sig = crypto.createHmac('sha256', signingKey()).update(payload).digest('hex');
  return `${COOKIE}=${payload}.${sig}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${WEEK}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function isAdmin(req) {
  if (!process.env.ADMIN_SESSION_SECRET) return false;
  const raw = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return false;
  const parts = raw.slice(COOKIE.length + 1).split('.');
  if (parts.length !== 3) return false;
  const [exp, e, sig] = parts;
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const want = crypto.createHmac('sha256', signingKey()).update(`${exp}.${e}`).digest('hex');
  if (want.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return false;
  let email = '';
  try { email = Buffer.from(e, 'base64url').toString('utf8'); } catch { /* ignore */ }
  return email ? { email } : false;
}

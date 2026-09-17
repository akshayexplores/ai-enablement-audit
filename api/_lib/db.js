import crypto from 'node:crypto';

const URL_ = () => (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function configured() {
  return Boolean(URL_() && KEY());
}

function headers(extra = {}) {
  return { apikey: KEY(), Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json', ...extra };
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

/* ---- admin session: signed, expiring cookie. No secrets stored in the browser. ---- */
const COOKIE = 'vajra_audit_admin';
const WEEK = 7 * 24 * 3600;

function signingKey() {
  return crypto.createHash('sha256').update(`${process.env.ADMIN_PASSWORD || ''}::${KEY()}`).digest();
}

export function passwordMatches(input) {
  const want = process.env.ADMIN_PASSWORD || '';
  if (!want || want.length < 10) return false;
  const a = crypto.createHash('sha256').update(String(input || '')).digest();
  const b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

export function sessionCookie() {
  const exp = Math.floor(Date.now() / 1000) + WEEK;
  const sig = crypto.createHmac('sha256', signingKey()).update(String(exp)).digest('hex');
  return `${COOKIE}=${exp}.${sig}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${WEEK}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function isAdmin(req) {
  if (!process.env.ADMIN_PASSWORD) return false;
  const raw = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return false;
  const [exp, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const want = crypto.createHmac('sha256', signingKey()).update(String(exp)).digest('hex');
  return want.length === sig.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig));
}

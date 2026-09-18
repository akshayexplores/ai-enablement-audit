import crypto from 'node:crypto';
import { configured, isAllowedEmail, readJson, select, sessionCookie, write } from '../_lib/db.js';

const MAX_ATTEMPTS = 5;
const normEmail = (v) => String(v || '').trim().toLowerCase();

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ADMIN_SESSION_SECRET) return res.status(503).json({ error: 'ADMIN_SESSION_SECRET is not set' });
  if (!configured()) return res.status(503).json({ error: 'Backend not configured' });

  let b = {};
  try { b = await readJson(req); } catch { /* empty */ }
  const email = normEmail(b.email);
  const code = String(b.code || '').trim();
  if (!email || !/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the 6-digit code' });
  if (!isAllowedEmail(email)) {
    await new Promise((r) => setTimeout(r, 400));
    return res.status(401).json({ error: 'Wrong code' });
  }

  const r = await select(`cii_admin_otp?email=eq.${encodeURIComponent(email)}&select=code_hash,attempts,expires_at`);
  const row = r.ok && Array.isArray(r.data) && r.data[0];
  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(401).json({ error: 'Code expired, request a new one' });
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return res.status(401).json({ error: 'Too many attempts, request a new code' });
  }

  const got = crypto.createHash('sha256').update(code).digest();
  const want = Buffer.from(row.code_hash, 'hex');
  const match = got.length === want.length && crypto.timingSafeEqual(got, want);

  if (!match) {
    await write(`cii_admin_otp?email=eq.${encodeURIComponent(email)}`, 'PATCH', { attempts: row.attempts + 1 });
    return res.status(401).json({ error: 'Wrong code' });
  }

  await write(`cii_admin_otp?email=eq.${encodeURIComponent(email)}`, 'DELETE');
  res.setHeader('Set-Cookie', sessionCookie(email));
  return res.status(200).json({ ok: true });
}

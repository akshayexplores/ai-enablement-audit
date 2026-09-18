import crypto from 'node:crypto';
import { configured, isAllowedEmail, readJson, select, write } from '../_lib/db.js';
import { mailConfigured, sendOtpEmail } from '../_lib/mail.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const MIN_GAP_MS = 45 * 1000;

const normEmail = (v) => String(v || '').trim().toLowerCase();

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ADMIN_SESSION_SECRET) return res.status(503).json({ error: 'ADMIN_SESSION_SECRET is not set' });
  if (!process.env.ADMIN_ALLOWED_EMAILS) return res.status(503).json({ error: 'ADMIN_ALLOWED_EMAILS is not set' });
  if (!mailConfigured()) return res.status(503).json({ error: 'RESEND_API_KEY is not set' });
  if (!configured()) return res.status(503).json({ error: 'Backend not configured' });

  let b = {};
  try { b = await readJson(req); } catch { /* empty */ }
  const email = normEmail(b.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email' });

  if (!isAllowedEmail(email)) {
    // Same response either way, so the login page can't be used to find out who's on the allowlist.
    await new Promise((r) => setTimeout(r, 400));
    return res.status(200).json({ ok: true });
  }

  const existing = await select(`cii_admin_otp?email=eq.${encodeURIComponent(email)}&select=created_at`);
  const last = existing.ok && Array.isArray(existing.data) && existing.data[0];
  if (last && Date.now() - new Date(last.created_at).getTime() < MIN_GAP_MS) {
    return res.status(429).json({ error: 'Wait a bit before requesting another code' });
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const w = await write('cii_admin_otp?on_conflict=email', 'POST', {
    email, code_hash: codeHash, attempts: 0, created_at: new Date().toISOString(), expires_at: expiresAt,
  });
  if (!w.ok) {
    console.error('otp write failed', w.status);
    return res.status(502).json({ error: 'Could not start login' });
  }

  try {
    await sendOtpEmail(email, code);
  } catch (e) {
    console.error('otp email failed', String(e));
    return res.status(502).json({ error: 'Could not send the code, try again' });
  }

  return res.status(200).json({ ok: true });
}

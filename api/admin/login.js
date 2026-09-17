import { passwordMatches, readJson, sessionCookie } from '../_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({ error: 'ADMIN_PASSWORD is not set' });
  let b = {};
  try { b = await readJson(req); } catch { /* empty */ }
  if (!passwordMatches(b.password)) {
    await new Promise((r) => setTimeout(r, 800));
    return res.status(401).json({ error: 'Wrong password' });
  }
  res.setHeader('Set-Cookie', sessionCookie());
  return res.status(200).json({ ok: true });
}

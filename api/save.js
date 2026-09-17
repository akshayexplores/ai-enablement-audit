import { configured, readJson, rpc } from './_lib/db.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{32,64}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!configured()) return res.status(503).json({ error: 'Backend not configured' });

  let b;
  try { b = await readJson(req); } catch { return res.status(400).json({ error: 'Invalid body' }); }

  const name = str(b.name, 120), email = str(b.email, 200).toLowerCase(), company = str(b.company, 200);
  const bad =
    !UUID.test(b.id || '') || !TOKEN.test(b.token || '') ||
    !['executive', 'department'].includes(b.kind) || !['in_progress', 'completed'].includes(b.status) ||
    name.length < 2 || !EMAIL.test(email) || !company ||
    !isObj(b.answers) || !isObj(b.summary);
  if (bad) return res.status(400).json({ error: 'Invalid submission' });
  if (JSON.stringify(b.answers).length + JSON.stringify(b.summary).length > 200_000) {
    return res.status(413).json({ error: 'Too large' });
  }

  const meta = {
    user_agent: str(req.headers['user-agent'], 300),
    referrer: str(req.headers.referer, 300),
    country: str(req.headers['x-vercel-ip-country'], 8),
    city: str(decodeURIComponent(req.headers['x-vercel-ip-city'] || ''), 80),
  };

  const r = await rpc('audit_save', {
    p_id: b.id, p_token: b.token, p_kind: b.kind, p_status: b.status,
    p_name: name, p_email: email, p_company: company,
    p_progress: Math.max(0, Math.min(100, Math.round(Number(b.progress) || 0))),
    p_answers: b.answers, p_summary: b.summary, p_meta: meta,
  });

  if (r.ok) return res.status(200).json({ ok: true });
  const msg = JSON.stringify(r.data || '');
  if (msg.includes('forbidden')) return res.status(403).json({ error: 'Not allowed' });
  console.error('audit_save failed', r.status, msg.slice(0, 500));
  return res.status(502).json({ error: 'Save failed' });
}

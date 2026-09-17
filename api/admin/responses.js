import { configured, isAdmin, select } from '../_lib/db.js';

const COLS = 'id,kind,status,name,email,company,progress,answers,summary,meta,created_at,updated_at,completed_at';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Log in first' });
  if (!configured()) return res.status(503).json({ error: 'Backend not configured' });
  const r = await select(`audit_responses?select=${COLS}&order=updated_at.desc&limit=2000`);
  if (!r.ok) {
    console.error('list failed', r.status, JSON.stringify(r.data).slice(0, 500));
    return res.status(502).json({ error: 'Could not load responses' });
  }
  return res.status(200).json({ responses: r.data });
}

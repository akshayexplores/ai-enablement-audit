import { clearCookie } from '../_lib/db.js';

export default function handler(req, res) {
  res.setHeader('Set-Cookie', clearCookie());
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true });
}

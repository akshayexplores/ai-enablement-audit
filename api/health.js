import { select } from './_lib/db.js';

/* Reports which settings are present and whether the database answers. Never returns values. */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const keyType = !key ? 'missing' : key.startsWith('sb_secret_') ? 'secret key' : key.startsWith('sb_publishable_') ? 'WRONG: publishable key' : key.split('.').length === 3 ? 'legacy JWT key' : 'unrecognised format';
  const out = {
    supabaseUrl: !url ? 'missing' : /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url.trim()) ? 'ok' : 'unexpected format',
    supabaseKey: keyType,
    adminPassword: !process.env.ADMIN_PASSWORD ? 'missing' : process.env.ADMIN_PASSWORD.length < 10 ? 'too short' : 'ok',
    database: 'not checked',
  };
  if (url && key) {
    try {
      const r = await select('audit_responses?select=id&limit=1');
      out.database = r.ok ? 'ok' : `error ${r.status}`;
    } catch (e) {
      out.database = 'unreachable';
    }
  }
  return res.status(200).json(out);
}

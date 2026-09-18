// Thin wrapper around Resend's HTTP API. No SDK dependency, so no build step is needed.
const RESEND_URL = 'https://api.resend.com/emails';

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendOtpEmail(email, code) {
  const from = process.env.RESEND_FROM_EMAIL || 'CII Research Admin <onboarding@resend.dev>';
  const r = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `${code} is your admin login code`,
      text: `Your admin login code is ${code}. It expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
      html: `<p>Your admin login code is:</p><p style="font:600 28px monospace;letter-spacing:.08em">${code}</p><p>It expires in 10 minutes. If you didn't request this, ignore this email.</p>`,
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`resend ${r.status}: ${t.slice(0, 300)}`);
  }
}

// Sends transactional email via Resend if RESEND_API_KEY is configured.
// Degrades gracefully if it isn't set yet: instead of failing the request,
// it returns the content so the caller can still surface the link/message
// (e.g. show it directly in the UI) rather than the feature being dead.
// Once a Resend key is added to Vercel env vars, real sending switches on
// automatically — no code change needed.
export async function sendEmail({ to, subject, html, from }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('RESEND_API_KEY not set — email not actually sent. Content:', { to, subject });
    return { sent: false, reason: 'no_email_key_configured' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from || 'Ask Shree <noreply@askshree.com>',
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Resend send failed:', errText);
    return { sent: false, reason: 'send_failed' };
  }
  return { sent: true };
}

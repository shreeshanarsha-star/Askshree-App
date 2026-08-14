import { NextResponse } from 'next/server';
import { sendEmail } from '../../../../../lib/email';
import { requireSiteKey } from '../../../../../lib/siteAuth';

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Emails the recruiter's selected shortlist to whatever address they type
// in — their own inbox, a hiring manager, whoever. Uses the same Resend
// helper as the rest of the site; degrades gracefully (returns sent:false
// with a plain reason) if RESEND_API_KEY isn't configured yet, same as
// every other email path on askshree.com.
export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const { to, candidates } = await req.json();

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json({ ok: false, error: 'Select at least one candidate to share.' }, { status: 400 });
  }

  const rows = candidates.map((c) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(c.name || '—')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(c.designation || '—')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(c.company || '—')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(c.location || '—')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${c.match_score != null ? escapeHtml(c.match_score) + '%' : '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${c.profile_url ? `<a href="${escapeHtml(c.profile_url)}">View profile</a>` : '—'}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:sans-serif;color:#111;">
      <p>Shortlist of ${candidates.length} candidate${candidates.length > 1 ? 's' : ''} from Smart Source.ai:</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead>
          <tr style="text-align:left;background:#f5f5f5;">
            <th style="padding:8px 12px;">Candidate</th>
            <th style="padding:8px 12px;">Designation</th>
            <th style="padding:8px 12px;">Company</th>
            <th style="padding:8px 12px;">Location</th>
            <th style="padding:8px 12px;">Match</th>
            <th style="padding:8px 12px;">Profile</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#888;font-size:12px;margin-top:16px;">Sent from Ask Shree — Smart Source.ai</p>
    </div>
  `;

  const result = await sendEmail({
    to,
    subject: `Candidate shortlist — ${candidates.length} candidate${candidates.length > 1 ? 's' : ''}`,
    html,
  });

  if (!result.sent) {
    return NextResponse.json({
      ok: false,
      error: result.reason === 'no_email_key_configured'
        ? 'Email sending isn’t configured yet — ask the site owner to add a Resend API key.'
        : 'Could not send that email. Try again in a moment.',
    }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

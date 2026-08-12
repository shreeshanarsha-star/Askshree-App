import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { sendEmail } from '../../../../../lib/email';
import { requireSiteKey } from '../../../../../lib/siteAuth';

// Same pattern as Job Postings.ai's send-verification, adapted for screening
// batches. This is a non-blocking follow-up (results already exist) — it
// exists for accountability, since these CVs are recruiter-sourced rather
// than self-submitted, not to gate the tool itself.
export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const { email, batchIds } = await req.json();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
  }
  if (!Array.isArray(batchIds) || batchIds.length === 0) {
    return NextResponse.json({ error: 'No batches to verify.' }, { status: 400 });
  }

  const token = crypto.randomBytes(24).toString('hex');
  const db = supabaseAdmin();
  const { error } = await db.from('email_verifications').insert({
    token,
    email,
    screening_batch_ids: batchIds,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = req.headers.get('origin') || 'https://askshree.com';
  const verifyLink = `${origin}/api/tools/smart-screen/verify-email?token=${token}`;

  const result = await sendEmail({
    to: email,
    subject: 'Confirm your email — Smart screen.ai',
    html: `<p>Click the link below to confirm your email for your recent screening batch${batchIds.length > 1 ? 'es' : ''}:</p>
           <p><a href="${verifyLink}">${verifyLink}</a></p>
           <p>This link expires in 2 days.</p>`,
  });

  return NextResponse.json({
    ok: true,
    emailSent: result.sent,
    verifyLink: result.sent ? undefined : verifyLink,
  });
}

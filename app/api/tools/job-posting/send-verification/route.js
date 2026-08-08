import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { sendEmail } from '../../../../../lib/email';

export async function POST(req) {
  const { email, jobPostingIds } = await req.json();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
  }
  if (!Array.isArray(jobPostingIds) || jobPostingIds.length === 0) {
    return NextResponse.json({ error: 'No postings to verify.' }, { status: 400 });
  }

  const token = crypto.randomBytes(24).toString('hex');
  const db = supabaseAdmin();
  const { error } = await db.from('email_verifications').insert({
    token,
    email,
    job_posting_ids: jobPostingIds,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = req.headers.get('origin') || 'https://askshree.com';
  const verifyLink = `${origin}/api/tools/job-posting/verify-email?token=${token}`;

  const result = await sendEmail({
    to: email,
    subject: 'Confirm your job posting — Ask Shree',
    html: `<p>Click the link below to confirm your email and verify your job posting${jobPostingIds.length > 1 ? 's' : ''}:</p>
           <p><a href="${verifyLink}">${verifyLink}</a></p>
           <p>This link expires in 2 days.</p>`,
  });

  // If no email provider is configured yet, hand the link straight back so the
  // flow still works end to end (shown as a clickable link in the UI) instead
  // of silently failing.
  return NextResponse.json({
    ok: true,
    emailSent: result.sent,
    verifyLink: result.sent ? undefined : verifyLink,
  });
}

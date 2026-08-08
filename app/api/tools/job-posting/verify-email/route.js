import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { getDomain } from '../../../../../lib/domain';

// GET because this is what the link in the email actually opens.
export async function GET(req) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/tools/job-posting-ai?verify=missing_token', req.url));

  const db = supabaseAdmin();
  const { data: v } = await db
    .from('email_verifications')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (!v || v.verified || new Date(v.expires_at) < new Date()) {
    return NextResponse.redirect(new URL('/tools/job-posting-ai?verify=invalid', req.url));
  }

  const posterDomain = getDomain(v.email);
  const ids = v.job_posting_ids || [];

  for (const id of ids) {
    const { data: job } = await db.from('job_postings').select('company_url').eq('id', id).maybeSingle();
    const domainMatch = !!job?.company_url && getDomain(job.company_url) === posterDomain;
    await db
      .from('job_postings')
      .update({ poster_email: v.email, email_verified: true, domain_match: domainMatch })
      .eq('id', id);
  }

  await db.from('email_verifications').update({ verified: true }).eq('token', token);

  return NextResponse.redirect(new URL('/tools/job-posting-ai?verify=success', req.url));
}

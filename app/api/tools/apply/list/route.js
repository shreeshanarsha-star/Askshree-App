import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { requireSiteKey } from '../../../../../lib/siteAuth';

// Approved, not-yet-expired listings — what candidates see in Find & apply.
export async function GET(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('job_postings')
    .select('id, title, company, company_url, location, must_have_skills, good_to_have_skills, qualification, created_at, expires_at')
    .eq('approved', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ postings: data });
}

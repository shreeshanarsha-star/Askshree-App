import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { requireSiteKey } from '../../../../../lib/siteAuth';

// Generic field-save for everything on the proposal builder that isn't the
// comp table itself (candidate details, currency, other benefits, the
// justification text, recruiter email, job role). Whitelisted columns only.
const ALLOWED = [
  'candidate_name', 'current_designation', 'proposed_designation', 'grade', 'division', 'department',
  'notice_period', 'tentative_joining_date', 'currency', 'other_benefits', 'justification',
  'recruiter_email', 'job_role', 'budget_band', 'role_title',
];

export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const { proposalId, patch } = await req.json();
  if (!proposalId || !patch) return NextResponse.json({ error: 'Missing proposalId or patch.' }, { status: 400 });

  const update = { updated_at: new Date().toISOString() };
  for (const key of ALLOWED) {
    if (key in patch) update[key] = patch[key];
  }

  const db = supabaseAdmin();
  const { error } = await db.from('offer_proposals').update(update).eq('id', proposalId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

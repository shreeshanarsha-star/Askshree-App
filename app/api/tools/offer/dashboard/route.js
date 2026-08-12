import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { requireSiteKey } from '../../../../../lib/siteAuth';

// Per-recruiter dashboard — mirrors Assessment.ai's dashboard route. Shows
// every proposal created under the given email, with where it stands in the
// approval chain.
export async function GET(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get('email') || '').trim().toLowerCase();
  const jobRole = searchParams.get('jobRole') || '';
  if (!email.includes('@')) return NextResponse.json({ error: 'Enter the email you created proposals under.' }, { status: 400 });

  const db = supabaseAdmin();
  let query = db.from('offer_proposals').select('*').eq('recruiter_email', email).order('updated_at', { ascending: false });
  if (jobRole) query = query.eq('job_role', jobRole);
  const { data: proposals, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = [];
  for (const p of proposals) {
    let pendingWith = null;
    if (p.status === 'pending_approval') {
      const { data: current } = await db
        .from('offer_approvals')
        .select('approver_email, sequence_order')
        .eq('proposal_id', p.id)
        .eq('sequence_order', p.current_approval_step)
        .neq('status', 'superseded')
        .maybeSingle();
      const { count: total } = await db
        .from('offer_approvals')
        .select('id', { count: 'exact', head: true })
        .eq('proposal_id', p.id)
        .neq('status', 'superseded');
      if (current) pendingWith = `${current.approver_email} (${current.sequence_order} of ${total})`;
    }
    rows.push({
      id: p.id,
      candidateName: p.candidate_name,
      roleTitle: p.proposed_designation || p.role_title,
      totalCtcProposed: p.total_ctc_proposed,
      currency: p.currency,
      status: p.status,
      pendingWith,
      updatedAt: p.updated_at,
    });
  }

  const { data: allForRoles } = await db.from('offer_proposals').select('job_role').eq('recruiter_email', email);
  const jobRoles = [...new Set((allForRoles || []).map((r) => r.job_role).filter(Boolean))];

  return NextResponse.json({ rows, jobRoles });
}

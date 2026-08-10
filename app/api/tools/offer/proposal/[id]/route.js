import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase';

// Full proposal snapshot — backs the recruiter's builder view (resuming a
// draft) and the printable "download proposal" page. Same content an
// approver sees, per the "proposal is exactly what the approver sees" rule.
export async function GET(req, { params }) {
  const db = supabaseAdmin();
  const { data: p, error } = await db.from('offer_proposals').select('*').eq('id', params.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!p) return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 });

  const { data: documents } = await db
    .from('offer_documents')
    .select('doc_type, file_name, needs_review')
    .eq('proposal_id', params.id);

  const { data: approvals } = await db
    .from('offer_approvals')
    .select('sequence_order, approver_email, status, comment, decided_at')
    .eq('proposal_id', params.id)
    .neq('status', 'superseded')
    .order('sequence_order');

  return NextResponse.json({ proposal: p, documents: documents || [], approvals: approvals || [] });
}

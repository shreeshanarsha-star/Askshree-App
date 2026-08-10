import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { computeProposedComponents } from '../../../../../lib/offerAI';

// Recomputes proposed figures from the recruiter's hike % — auto rows scale
// with the hike, manual rows (edited or added by the recruiter) are left
// exactly as given. Runs on every hike-% change and every manual edit so the
// Gross Salary / Total CTC subtotals never drift out of sync with the table.
export async function POST(req) {
  const { proposalId, hikePercent, components } = await req.json();
  if (!proposalId) return NextResponse.json({ error: 'Missing proposalId.' }, { status: 400 });

  const db = supabaseAdmin();
  let rows = components;
  if (!rows) {
    const { data: existing } = await db.from('offer_proposals').select('components').eq('id', proposalId).maybeSingle();
    rows = existing?.components || [];
  }

  const result = computeProposedComponents(rows, hikePercent);

  const { error } = await db.from('offer_proposals').update({
    hike_percent: hikePercent,
    components: result.components,
    gross_current: result.gross_current,
    gross_proposed: result.gross_proposed,
    total_ctc_current: result.total_ctc_current,
    total_ctc_proposed: result.total_ctc_proposed,
    updated_at: new Date().toISOString(),
  }).eq('id', proposalId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ...result });
}

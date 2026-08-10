import { NextResponse } from 'next/server';
import { requireMarginKey } from '../../../../../lib/marginAuth';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function GET(req) {
  const denied = requireMarginKey(req);
  if (denied) return denied;

  const db = supabaseAdmin();
  const { data: recs, error } = await db
    .from('margin_recommendations')
    .select('*, margin_products(product_name, customer_name, category)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ actions: recs || [] });
}

// Approve or dismiss a recommendation — a record of the decision, nothing
// executes automatically.
export async function POST(req) {
  const denied = requireMarginKey(req);
  if (denied) return denied;

  const { recommendationId, status, decidedBy } = await req.json();
  if (!recommendationId || !['approved', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from('margin_recommendations').update({
    status, decided_at: new Date().toISOString(), decided_by: decidedBy || null,
  }).eq('id', recommendationId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

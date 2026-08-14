import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { getSessionAccount } from '../../../../lib/gauriAuth';

// paramed/admin-only. Returns unassigned orders (open pool, anyone can
// claim) plus this paramed's own claimed orders, each joined with just
// enough case info to actually make the delivery (farmer name/phone/
// address) — never the AI draft or vet's internal notes.
export async function GET(req) {
  const account = await getSessionAccount(req);
  if (!account || (account.role !== 'paramed' && account.role !== 'admin')) {
    return NextResponse.json({ error: 'Paramed login required.' }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data: orders } = await db
    .from('gauri_orders')
    .select('*')
    .in('status', ['pending_dispatch', 'out_for_delivery'])
    .order('created_at', { ascending: true });

  const caseIds = [...new Set((orders || []).map((o) => o.case_id))];
  let casesById = {};
  if (caseIds.length) {
    const { data: cases } = await db
      .from('gauri_cases')
      .select('id, farmer_name, farmer_phone, farmer_address, cow_details')
      .in('id', caseIds);
    casesById = Object.fromEntries((cases || []).map((c) => [c.id, c]));
  }

  const enriched = (orders || []).map((o) => ({ ...o, case: casesById[o.case_id] || null }));
  return NextResponse.json({
    unassigned: enriched.filter((o) => !o.paramed_id),
    mine: enriched.filter((o) => o.paramed_id === account.id),
  });
}

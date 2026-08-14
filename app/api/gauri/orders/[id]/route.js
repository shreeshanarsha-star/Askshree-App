import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { getSessionAccount } from '../../../../../lib/gauriAuth';

export async function PATCH(req, { params }) {
  const account = await getSessionAccount(req);
  if (!account || (account.role !== 'paramed' && account.role !== 'admin')) {
    return NextResponse.json({ error: 'Paramed login required.' }, { status: 401 });
  }

  const { action, paymentNote } = await req.json();
  const db = supabaseAdmin();

  if (action === 'claim') {
    await db.from('gauri_orders')
      .update({ paramed_id: account.id, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .is('paramed_id', null);
    return NextResponse.json({ ok: true });
  }

  if (action === 'mark_dispatched') {
    await db.from('gauri_orders')
      .update({ status: 'out_for_delivery', updated_at: new Date().toISOString() })
      .eq('id', params.id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'mark_delivered') {
    await db.from('gauri_orders')
      .update({ status: 'delivered', payment_note: paymentNote || null, updated_at: new Date().toISOString() })
      .eq('id', params.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}

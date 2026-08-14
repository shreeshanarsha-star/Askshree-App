import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase';
import { getSessionAccount } from '../../../../../../lib/gauriAuth';

// Soft-delete only — sets active:false rather than deleting the row, so
// gauri_cases.vet_id foreign keys and audit history stay intact.
export async function DELETE(req, { params }) {
  const account = await getSessionAccount(req);
  if (!account || account.role !== 'admin') {
    return NextResponse.json({ error: 'Admin login required.' }, { status: 401 });
  }
  const db = supabaseAdmin();
  await db.from('gauri_accounts').update({ active: false }).eq('id', params.id);
  return NextResponse.json({ ok: true });
}

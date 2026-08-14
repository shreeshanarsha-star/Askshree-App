import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { getSessionAccount } from '../../../../../lib/gauriAuth';

// GET serves two audiences from one endpoint: a vet/admin session sees the
// full case (including the AI draft, never meant for farmer eyes), while an
// unauthenticated request — the farmer checking their status link — only
// ever gets status + the final, vet-approved recommendation. The AI draft
// and vet notes are never included in the public shape, on purpose.
export async function GET(req, { params }) {
  const db = supabaseAdmin();
  const { data: caseRow } = await db
    .from('gauri_cases')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (!caseRow) {
    return NextResponse.json({ error: 'Case not found.' }, { status: 404 });
  }

  const account = await getSessionAccount(req);
  if (account && (account.role === 'vet' || account.role === 'admin')) {
    return NextResponse.json({ case: caseRow, full: true });
  }

  return NextResponse.json({
    case: {
      id: caseRow.id,
      status: caseRow.status,
      final_recommendation: caseRow.status === 'approved' ? caseRow.final_recommendation : null,
      created_at: caseRow.created_at,
    },
    full: false,
  });
}

export async function PATCH(req, { params }) {
  const account = await getSessionAccount(req);
  if (!account || (account.role !== 'vet' && account.role !== 'admin')) {
    return NextResponse.json({ error: 'Vet login required.' }, { status: 401 });
  }

  const { action, finalRecommendation, vetNotes } = await req.json();
  const db = supabaseAdmin();

  if (action === 'approve') {
    if (!finalRecommendation || !finalRecommendation.trim()) {
      return NextResponse.json({ error: 'Write or confirm a recommendation before approving.' }, { status: 400 });
    }
    await db.from('gauri_cases').update({
      status: 'approved',
      final_recommendation: finalRecommendation.trim(),
      vet_notes: vetNotes || null,
      vet_id: account.id,
      updated_at: new Date().toISOString(),
    }).eq('id', params.id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    await db.from('gauri_cases').update({
      status: 'rejected',
      vet_notes: vetNotes || null,
      vet_id: account.id,
      updated_at: new Date().toISOString(),
    }).eq('id', params.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}

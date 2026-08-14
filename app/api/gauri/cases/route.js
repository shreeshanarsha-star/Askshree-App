import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { getSessionAccount } from '../../../../lib/gauriAuth';
import { draftTriage } from '../../../../lib/gauriVet';

// POST is public — farmers never get an account, so there's no auth check
// here on purpose. GET is for the vet queue only.
export async function POST(req) {
  const { farmerName, farmerPhone, cowDetails, issueText } = await req.json();
  if (!issueText || issueText.trim().length < 5) {
    return NextResponse.json({ ok: false, error: 'Describe the issue first.' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: caseRow, error: insertError } = await db
    .from('gauri_cases')
    .insert({
      farmer_name: farmerName || null,
      farmer_phone: farmerPhone || null,
      cow_details: cowDetails || null,
      issue_text: issueText.trim(),
      status: 'pending_ai',
    })
    .select('id')
    .single();
  if (insertError) {
    return NextResponse.json({ ok: false, error: 'Could not submit that. Try again.' }, { status: 500 });
  }

  // AI draft runs inline — a case is only useful to a vet once the draft
  // exists, and the farmer's confirmation screen already tells them "a vet
  // will review shortly," so there's no premature status to show either way.
  try {
    const draft = await draftTriage({ issueText, cowDetails });
    await db.from('gauri_cases').update({
      ai_draft: JSON.stringify(draft),
      status: 'pending_vet_review',
      updated_at: new Date().toISOString(),
    }).eq('id', caseRow.id);
  } catch (e) {
    // AI drafting failed — leave status as pending_ai so a vet can still
    // see the raw case and write a recommendation from scratch.
  }

  return NextResponse.json({ ok: true, caseId: caseRow.id });
}

export async function GET(req) {
  const account = await getSessionAccount(req);
  if (!account || (account.role !== 'vet' && account.role !== 'admin')) {
    return NextResponse.json({ error: 'Vet login required.' }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data } = await db
    .from('gauri_cases')
    .select('id, farmer_name, cow_details, issue_text, status, ai_draft, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  return NextResponse.json({ cases: data || [] });
}

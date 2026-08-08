import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/requireAdmin';

export async function GET(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('job_postings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ postings: data });
}

// action: 'approve' | 'reject'
export async function PATCH(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { id, action } = await req.json();
  const db = supabaseAdmin();

  if (action === 'approve') {
    const { error } = await db.from('job_postings').update({ approved: true, approved_at: new Date().toISOString() }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === 'reject') {
    const { error } = await db.from('job_postings').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ error: 'action must be approve or reject.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

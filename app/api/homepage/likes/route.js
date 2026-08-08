import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

// A single global counter for the homepage Like button. Every click
// increments it — no toggle/unlike, no per-visitor cap.
export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db.from('homepage_likes').select('count').eq('id', 1).maybeSingle();
  return NextResponse.json({ count: data?.count ?? 0 });
}

export async function POST() {
  const db = supabaseAdmin();
  const { data: row } = await db.from('homepage_likes').select('count').eq('id', 1).maybeSingle();
  const next = (row?.count ?? 0) + 1;

  const { data, error } = await db
    .from('homepage_likes')
    .update({ count: next, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select('count')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ count: data.count });
}

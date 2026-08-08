import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

// A single global counter for the homepage Like button — no per-visitor
// identity beyond the browser's own localStorage toggle (handled client-side),
// consistent with this site's lightweight, no-account-required approach.
export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db.from('homepage_likes').select('count').eq('id', 1).maybeSingle();
  return NextResponse.json({ count: data?.count ?? 0 });
}

export async function POST(req) {
  const { action } = await req.json(); // 'like' | 'unlike'
  const db = supabaseAdmin();
  const { data: row } = await db.from('homepage_likes').select('count').eq('id', 1).maybeSingle();
  const current = row?.count ?? 0;
  const next = action === 'unlike' ? Math.max(0, current - 1) : current + 1;

  const { data, error } = await db
    .from('homepage_likes')
    .update({ count: next, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select('count')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ count: data.count });
}

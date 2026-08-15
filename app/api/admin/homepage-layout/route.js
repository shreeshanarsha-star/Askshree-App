import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/requireAdmin';

const VALID = ['reactor', 'classic'];

export async function GET(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const db = supabaseAdmin();
  const { data } = await db.from('site_settings').select('value').eq('key', 'homepage_layout').maybeSingle();
  return NextResponse.json({ layout: data?.value || 'reactor' });
}

export async function POST(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { layout } = await req.json();
  if (!VALID.includes(layout)) {
    return NextResponse.json({ error: 'Unknown layout.' }, { status: 400 });
  }
  const db = supabaseAdmin();
  await db.from('site_settings').upsert({ key: 'homepage_layout', value: layout, updated_at: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}

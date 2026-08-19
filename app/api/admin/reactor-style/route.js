import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/requireAdmin';

const VALID = ['sunburst', 'dial', 'arc'];

export async function GET(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const db = supabaseAdmin();
  const { data } = await db.from('site_settings').select('value').eq('key', 'reactor_style').maybeSingle();
  return NextResponse.json({ style: data?.value || 'sunburst' });
}

export async function POST(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { style } = await req.json();
  if (!VALID.includes(style)) {
    return NextResponse.json({ error: 'Unknown reactor style.' }, { status: 400 });
  }
  const db = supabaseAdmin();
  await db.from('site_settings').upsert({ key: 'reactor_style', value: style, updated_at: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}

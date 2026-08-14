import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/requireAdmin';
import { THEMES, DEFAULT_THEME } from '../../../../lib/themes';

export async function GET(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const db = supabaseAdmin();
  const { data } = await db.from('site_settings').select('value').eq('key', 'default_theme').maybeSingle();
  return NextResponse.json({ theme: data?.value || DEFAULT_THEME });
}

export async function POST(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { theme } = await req.json();
  if (!THEMES.some((t) => t.id === theme)) {
    return NextResponse.json({ error: 'Unknown theme.' }, { status: 400 });
  }
  const db = supabaseAdmin();
  await db.from('site_settings').upsert({ key: 'default_theme', value: theme, updated_at: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}

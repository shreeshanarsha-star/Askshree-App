import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { DEFAULT_THEME } from '../../../lib/themes';

export const dynamic = 'force-dynamic';

// Public, read-only — the site-wide default theme, used for any visitor
// who hasn't picked their own override in Settings (localStorage).
export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db.from('site_settings').select('value').eq('key', 'default_theme').maybeSingle();
  return NextResponse.json({ theme: data?.value || DEFAULT_THEME });
}

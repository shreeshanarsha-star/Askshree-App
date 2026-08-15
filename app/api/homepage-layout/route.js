import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

// Public, read-only — which homepage layout askshree.com/ should render.
// 'reactor' = the current AI-systems console (default). 'classic' = the
// original sidebar homepage, kept selectable here for reference/reversion.
export async function GET() {
  const db = supabaseAdmin();
  const { data } = await db.from('site_settings').select('value').eq('key', 'homepage_layout').maybeSingle();
  return NextResponse.json({ layout: data?.value || 'reactor' });
}

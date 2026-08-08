import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = supabaseAdmin();
  const { data, error } = await db.from('homepage_likes').select('*').eq('id', 1).maybeSingle();
  return NextResponse.json(
    { marker: 'debug-route-v1', now: new Date().toISOString(), data, error: error?.message || null },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  );
}

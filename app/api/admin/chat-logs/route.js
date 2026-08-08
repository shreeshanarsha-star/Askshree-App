import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/requireAdmin';

export async function GET(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const db = supabaseAdmin();

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recent, error } = await db
    .from('chat_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count: weekCount } = await db
    .from('chat_logs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);

  const { count: flaggedCount } = await db
    .from('chat_logs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)
    .not('flagged_reason', 'is', null);

  const confidentPct = weekCount ? Math.round(((weekCount - (flaggedCount || 0)) / weekCount) * 100) : 100;

  return NextResponse.json({
    logs: recent,
    stats: { weekCount: weekCount || 0, flaggedCount: flaggedCount || 0, confidentPct },
  });
}

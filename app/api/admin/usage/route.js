import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/requireAdmin';

export async function GET(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const db = supabaseAdmin();

  const [{ count: freeCount }, { count: graceCount }, { count: subCount }, { data: recentIps }, { data: toolRuns }] =
    await Promise.all([
      db.from('ip_usage').select('*', { count: 'exact', head: true }).eq('status', 'free'),
      db.from('ip_usage').select('*', { count: 'exact', head: true }).eq('status', 'grace'),
      db.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('ip_usage').select('*').order('last_used_at', { ascending: false }).limit(20),
      db.from('tool_runs').select('tool').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);

  const toolCounts = {};
  (toolRuns || []).forEach((r) => {
    toolCounts[r.tool] = (toolCounts[r.tool] || 0) + 1;
  });

  return NextResponse.json({
    metrics: { freeCount: freeCount || 0, graceCount: graceCount || 0, subCount: subCount || 0 },
    recentIps: recentIps || [],
    toolCounts,
  });
}

// Manual override: whitelist, block, or extend an IP from the admin table.
export async function PATCH(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { ip, action } = await req.json();
  const db = supabaseAdmin();

  if (action === 'whitelist') {
    await db.from('ip_usage').update({ status: 'whitelisted' }).eq('ip_address', ip);
  } else if (action === 'block') {
    await db.from('ip_usage').update({ status: 'locked' }).eq('ip_address', ip);
  } else if (action === 'extend') {
    await db.from('ip_usage').update({ grace_started_at: new Date().toISOString(), status: 'grace' }).eq('ip_address', ip);
  } else {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

import { supabaseAdmin } from './supabase';

// Same 3-free-then-log-in pattern as every other tool.
const FREE_SEARCHES = 3;

export async function checkAndRecordSmartHuntUsage(ip, userId = null) {
  if (userId) return { allowed: true, status: 'authenticated' };
  const db = supabaseAdmin();
  const { data: row } = await db
    .from('smart_hunt_usage')
    .select('*')
    .eq('ip_address', ip)
    .maybeSingle();

  if (!row) {
    await db.from('smart_hunt_usage').insert({
      ip_address: ip,
      search_count: 1,
      status: 'free',
      last_used_at: new Date().toISOString(),
    });
    return { allowed: true, status: 'free' };
  }

  if (row.status === 'whitelisted') return { allowed: true, status: 'whitelisted' };

  if (row.status === 'locked') {
    return {
      allowed: false,
      status: 'locked',
      message: 'You’ve used your 3 free hunts. Log in to keep going.',
    };
  }

  const newCount = row.search_count + 1;
  const status = newCount >= FREE_SEARCHES ? 'locked' : 'free';
  await db
    .from('smart_hunt_usage')
    .update({ search_count: newCount, status, last_used_at: new Date().toISOString() })
    .eq('ip_address', ip);

  return { allowed: true, status };
}

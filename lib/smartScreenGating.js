import { supabaseAdmin } from './supabase';

// Separate free-use counter for Smart screen.ai specifically. A single batch
// can screen up to 20 CVs — meaningfully more AI cost than one JD post or one
// apply — so it gets its own pool rather than sharing job_posting_usage or
// the general ip_usage gate.
const FREE_BATCHES = 2;

export async function checkAndRecordSmartScreenUsage(ip, userId = null) {
  if (userId) return { allowed: true, status: 'authenticated' };
  const db = supabaseAdmin();
  const { data: row } = await db
    .from('smart_screen_usage')
    .select('*')
    .eq('ip_address', ip)
    .maybeSingle();

  if (!row) {
    await db.from('smart_screen_usage').insert({
      ip_address: ip,
      batch_count: 1,
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
      message: 'You’ve used your 2 free screening batches. Log in to keep screening.',
    };
  }

  const newCount = row.batch_count + 1;
  const status = newCount >= FREE_BATCHES ? 'locked' : 'free';
  await db
    .from('smart_screen_usage')
    .update({ batch_count: newCount, status, last_used_at: new Date().toISOString() })
    .eq('ip_address', ip);

  return { allowed: true, status };
}

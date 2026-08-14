import { supabaseAdmin } from './supabase';

// Same 3-free-then-log-in pattern as every other tool. Each use costs a
// real transcription call and/or a web-search-enabled Claude call, so it's
// not left ungated.
const FREE_USES = 3;

export async function checkAndRecordVoiceUsage(ip, userId = null) {
  if (userId) return { allowed: true, status: 'authenticated' };
  const db = supabaseAdmin();
  const { data: row } = await db
    .from('voice_usage')
    .select('*')
    .eq('ip_address', ip)
    .maybeSingle();

  if (!row) {
    await db.from('voice_usage').insert({
      ip_address: ip,
      use_count: 1,
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
      message: 'You’ve used your 3 free Voice.ai requests. Log in to keep going.',
    };
  }

  const newCount = row.use_count + 1;
  const status = newCount >= FREE_USES ? 'locked' : 'free';
  await db
    .from('voice_usage')
    .update({ use_count: newCount, status, last_used_at: new Date().toISOString() })
    .eq('ip_address', ip);

  return { allowed: true, status };
}

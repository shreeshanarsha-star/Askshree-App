import { supabaseAdmin } from './supabase';

// Separate free-use counter for JOB POSTERS specifically (3 free postings per IP).
// Job SEEKERS (apply/auto-apply) intentionally reuse the existing checkAndRecordUsage()
// gate from lib/gating.js as-is — this file only covers the posting side.
const FREE_POSTINGS = 3;

export async function checkAndRecordPostingUsage(ip) {
  const db = supabaseAdmin();
  const { data: row } = await db
    .from('job_posting_usage')
    .select('*')
    .eq('ip_address', ip)
    .maybeSingle();

  if (!row) {
    await db.from('job_posting_usage').insert({
      ip_address: ip,
      post_count: 1,
      status: 'free',
      last_posted_at: new Date().toISOString(),
    });
    return { allowed: true, status: 'free' };
  }

  if (row.status === 'whitelisted') return { allowed: true, status: 'whitelisted' };

  if (row.status === 'locked') {
    return {
      allowed: false,
      status: 'locked',
      message: 'You’ve used your 3 free job postings. Log in to keep posting.',
    };
  }

  const newCount = row.post_count + 1;
  const status = newCount >= FREE_POSTINGS ? 'locked' : 'free';
  await db
    .from('job_posting_usage')
    .update({ post_count: newCount, status, last_posted_at: new Date().toISOString() })
    .eq('ip_address', ip);

  return { allowed: true, status };
}

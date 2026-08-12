import { supabaseAdmin } from './supabase';

// Separate free-use counter for Assessment.ai. Counts "Assign assessment"
// actions per IP — the same 3-free pattern the employer-side job-posting gate
// uses, since assigning an assessment is likewise a recruiter-side action with
// real downstream AI/email cost.
const FREE_ASSIGNMENTS = 3;

export async function checkAndRecordAssessmentUsage(ip, userId = null) {
  if (userId) return { allowed: true, status: 'authenticated' };
  const db = supabaseAdmin();
  const { data: row } = await db
    .from('assessment_usage')
    .select('*')
    .eq('ip_address', ip)
    .maybeSingle();

  if (!row) {
    await db.from('assessment_usage').insert({
      ip_address: ip,
      assign_count: 1,
      status: 'free',
      last_assigned_at: new Date().toISOString(),
    });
    return { allowed: true, status: 'free' };
  }

  if (row.status === 'whitelisted') return { allowed: true, status: 'whitelisted' };

  if (row.status === 'locked') {
    return {
      allowed: false,
      status: 'locked',
      message: 'You’ve used your 3 free assessment assignments. Log in to keep assigning.',
    };
  }

  const newCount = row.assign_count + 1;
  const status = newCount >= FREE_ASSIGNMENTS ? 'locked' : 'free';
  await db
    .from('assessment_usage')
    .update({ assign_count: newCount, status, last_assigned_at: new Date().toISOString() })
    .eq('ip_address', ip);

  return { allowed: true, status };
}

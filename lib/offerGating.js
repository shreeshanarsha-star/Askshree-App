import { supabaseAdmin } from './supabase';

// Free-use counter for Offer.ai's "create proposal" action (document upload +
// AI analysis). Same 3-free-per-IP pattern as assessmentGating.js — creating
// a proposal has real AI/document-parsing cost behind it.
const FREE_CREATES = 3;

export async function checkAndRecordOfferUsage(ip) {
  const db = supabaseAdmin();
  const { data: row } = await db
    .from('offer_usage')
    .select('*')
    .eq('ip_address', ip)
    .maybeSingle();

  if (!row) {
    await db.from('offer_usage').insert({
      ip_address: ip,
      create_count: 1,
      status: 'free',
      last_created_at: new Date().toISOString(),
    });
    return { allowed: true, status: 'free' };
  }

  if (row.status === 'whitelisted') return { allowed: true, status: 'whitelisted' };

  if (row.status === 'locked') {
    return {
      allowed: false,
      status: 'locked',
      message: 'You’ve used your 3 free proposals. Log in to keep creating them.',
    };
  }

  const newCount = row.create_count + 1;
  const status = newCount >= FREE_CREATES ? 'locked' : 'free';
  await db
    .from('offer_usage')
    .update({ create_count: newCount, status, last_created_at: new Date().toISOString() })
    .eq('ip_address', ip);

  return { allowed: true, status };
}

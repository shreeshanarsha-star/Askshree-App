// Phase 5 caching for revealed SignalHire contacts. A candidate found again
// in a later search (same LinkedIn profile_url) gets their contact back for
// free instead of spending another SignalHire credit.
import { supabaseAdmin } from './supabase';

export async function getCachedContact(profileUrl) {
  const db = supabaseAdmin();
  const { data } = await db
    .from('smart_source_candidates')
    .select('contact_email, contact_phone, contact_email_confidence, contact_phone_confidence')
    .eq('profile_url', profileUrl)
    .not('contact_revealed_at', 'is', null)
    .order('contact_revealed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data || (!data.contact_email && !data.contact_phone)) return null;
  return {
    ok: true,
    email: data.contact_email || null,
    phone: data.contact_phone || null,
    emailConfidence: data.contact_email_confidence || null,
    phoneConfidence: data.contact_phone_confidence || null,
    provider: 'cache',
  };
}

export async function persistContact(profileUrl, result) {
  const db = supabaseAdmin();
  // Every historical row for this profile gets the contact -- a candidate
  // can appear across multiple past searches, and all of them should read
  // as "already revealed" going forward.
  await db
    .from('smart_source_candidates')
    .update({
      contact_email: result.email || null,
      contact_phone: result.phone || null,
      contact_email_confidence: result.emailConfidence || null,
      contact_phone_confidence: result.phoneConfidence || null,
      contact_revealed_at: new Date().toISOString(),
    })
    .eq('profile_url', profileUrl);
}

// Monthly reveal cap. Only fresh SignalHire reveals count against this --
// a cache hit above costs nothing, so it never touches the counter. Caps
// spend at a predictable ceiling regardless of how many recruiters are
// using the tool.
export const MONTHLY_REVEAL_CAP = 200;

export async function getMonthlyRevealCount() {
  const db = supabaseAdmin();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count } = await db
    .from('contact_reveal_log')
    .select('id', { count: 'exact', head: true })
    .gte('revealed_at', monthStart.toISOString());
  return count || 0;
}

export async function logReveal(profileUrl) {
  const db = supabaseAdmin();
  await db.from('contact_reveal_log').insert({ profile_url: profileUrl });
}

export const CAP_MESSAGE = `Monthly contact-reveal limit (${MONTHLY_REVEAL_CAP}) reached. Resets on the 1st.`;

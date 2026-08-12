import { supabaseAdmin } from './supabase';

// Non-blocking check: is there a valid signed-in user on this request?
// Used by the tool usage-gating functions to lift the free-use limit for
// anyone with a real account (any role), regardless of IP. Unlike
// requireAdmin, this never denies the request — a missing/invalid token
// just means "treat as anonymous" and the normal IP-based free limit
// still applies.
export async function getAuthedUser(req) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;

  const db = supabaseAdmin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email };
}

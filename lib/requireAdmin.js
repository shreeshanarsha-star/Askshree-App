import { NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase';

// The admin dashboard sends its Supabase Auth access token in the
// Authorization header on every request to /api/admin/*. This checks it's
// a real, valid session AND that the account is actually flagged as admin
// (user_metadata.role === 'admin') — not just any signed-in user. Regular
// site accounts (self-serve signup at /login, used to lift the free-use
// limits on the tools) must NOT pass this check.
export async function requireAdmin(req) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) {
    return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
  }
  if (data.user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  return null; // null means "not denied" — request may proceed
}

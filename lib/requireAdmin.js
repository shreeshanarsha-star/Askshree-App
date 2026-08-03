import { NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase';

// The admin dashboard sends its Supabase Auth access token in the
// Authorization header on every request to /api/admin/*. This checks it's
// a real, valid session before allowing the request through.
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

  return null; // null means "not denied" — request may proceed
}

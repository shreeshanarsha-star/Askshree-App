import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function GET(req) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return NextResponse.redirect(new URL('/tools/smart-screen-ai?verify=missing_token', req.url));

  const db = supabaseAdmin();
  const { data: v } = await db
    .from('email_verifications')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (!v || v.verified || new Date(v.expires_at) < new Date()) {
    return NextResponse.redirect(new URL('/tools/smart-screen-ai?verify=invalid', req.url));
  }

  const ids = v.screening_batch_ids || [];
  for (const id of ids) {
    await db.from('screening_batches').update({ poster_email: v.email, email_verified: true }).eq('id', id);
  }

  await db.from('email_verifications').update({ verified: true }).eq('token', token);

  return NextResponse.redirect(new URL('/tools/smart-screen-ai?verify=success', req.url));
}

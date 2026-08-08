import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';

// Generates a short-lived signed URL for a candidate's stored CV file — never
// a public URL, so files aren't guessable/scrapeable from outside.
export async function GET(req) {
  const candidateId = new URL(req.url).searchParams.get('candidateId');
  if (!candidateId) return NextResponse.json({ error: 'candidateId is required.' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: candidate } = await db.from('candidates').select('resume_url').eq('id', candidateId).maybeSingle();
  if (!candidate?.resume_url) {
    return NextResponse.json({ error: 'No file stored for this candidate.' }, { status: 404 });
  }

  const { data, error } = await db.storage.from('cv-files').createSignedUrl(candidate.resume_url, 600);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}

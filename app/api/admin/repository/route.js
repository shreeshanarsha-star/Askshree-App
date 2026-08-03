import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/requireAdmin';
import { askClaude } from '../../../../lib/anthropic';

export async function GET(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('repository_sources')
    .select('id, source_type, label, url, created_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sources: data });
}

// Adds a URL source. Fetches the page and summarizes it into stored content
// so Ask Shree doesn't need to re-fetch it live on every question.
export async function POST(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { type, label, url, docText } = await req.json();
  const db = supabaseAdmin();

  if (type === 'url') {
    if (!url) return NextResponse.json({ error: 'Provide a URL.' }, { status: 400 });
    let pageText = '';
    try {
      const pageRes = await fetch(url, { headers: { 'User-Agent': 'AskShreeBot/1.0' } });
      pageText = await pageRes.text();
      pageText = pageText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 20000);
    } catch (e) {
      return NextResponse.json({ error: 'Could not fetch that URL.' }, { status: 400 });
    }
    const summary = await askClaude(
      'Summarize the following page content into dense reference notes (under 800 words) that a support chatbot can use to answer questions accurately. Keep concrete facts, drop navigation/boilerplate.',
      pageText,
      1200
    );
    const { error } = await db.from('repository_sources').insert({
      source_type: 'url',
      label: label || url,
      url,
      content: summary,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (type === 'doc') {
    if (!docText) return NextResponse.json({ error: 'No document text provided.' }, { status: 400 });
    const { error } = await db.from('repository_sources').insert({
      source_type: 'doc',
      label: label || 'Uploaded document',
      content: docText.slice(0, 20000),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'type must be "url" or "doc".' }, { status: 400 });
}

export async function DELETE(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { id } = await req.json();
  const db = supabaseAdmin();
  const { error } = await db.from('repository_sources').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

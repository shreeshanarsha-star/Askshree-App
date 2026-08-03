import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { askClaudeWithSearch } from '../../../lib/anthropic';

// Ask Shree is intentionally NOT behind enforceGate() — per spec, it's
// unrestricted regardless of the visitor's trial/grace/locked status.

const SYSTEM_PROMPT = `You are Ask Shree, the assistant on Ask Shree's recruiting
toolkit site. You help visitors with anything about talent acquisition, this
site's tools, or general recruiting knowledge. You've been given reference
material the site admin curated below — treat it as your first, most trusted
source. If it doesn't fully answer the question, use web search to fill the
gap. Be concise, direct, and specific. Never invent facts about the admin's
own company or tools that aren't in the reference material.`;

export async function POST(req) {
  const { message } = await req.json();
  if (!message) {
    return NextResponse.json({ error: 'Provide a message.' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: sources } = await db
    .from('repository_sources')
    .select('label, url, content')
    .limit(20);

  const repoContext = (sources || [])
    .map((s) => `[${s.label}]${s.url ? ` (${s.url})` : ''}\n${(s.content || '').slice(0, 3000)}`)
    .join('\n\n---\n\n');

  const userMessage = repoContext
    ? `Reference material from the admin's repository:\n\n${repoContext}\n\n---\n\nVisitor question: ${message}`
    : `Visitor question: ${message}`;

  try {
    const reply = await askClaudeWithSearch(SYSTEM_PROMPT, userMessage, 1200);
    return NextResponse.json({ reply: reply.trim() });
  } catch (err) {
    return NextResponse.json({ error: 'Ask Shree had trouble answering that. Try again.' }, { status: 500 });
  }
}

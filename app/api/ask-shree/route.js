import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { askClaude } from '../../../lib/anthropic';
import { getClientIp } from '../../../lib/gating';

// Ask Shree v2 — deliberately restricted:
// - No web search. Answers ONLY from admin-curated chatbot_sources content.
// - Same behavior on every page (no per-page scoping).
// - Every question + answer is logged to chat_logs for admin review/analysis.
// - If it can't answer from the knowledge base, it says so plainly rather
//   than guessing — and it's told to ask a clarifying question when a
//   question is genuinely ambiguous (e.g. "how do I apply" — apply as a
//   candidate, or post as an employer?).
// Ask Shree remains unrestricted by the site's free-use gate — it's always
// available regardless of the visitor's trial/grace/locked status.

const SYSTEM_PROMPT = `You are Ask Shree, the assistant on askshree.com. You ONLY answer questions
about this site and its tools, using the reference material provided below — you have no other
knowledge source and must not use general knowledge or guess. If the reference material doesn't
cover something, say so plainly and point the visitor to Shree's contact details (in the reference
material) rather than guessing. If a question is genuinely ambiguous (for example "how do I apply"
could mean applying as a candidate or posting as an employer), ask ONE short clarifying question
back instead of guessing which one they mean. Be crisp, specific, and accurate — no filler, no
hedging language, no long preambles. Do not answer questions unrelated to askshree.com or its
tools (general knowledge, coding help, etc.) — politely explain you only answer questions about
this site.

Keep answers short by default — 2-4 sentences, plain prose, no headers or bullet points, no
markdown bold. Only go longer than that if the visitor's question explicitly asks for a list, a
step-by-step walkthrough, or more detail. A visitor asking "what can X do" wants a quick, useful
answer, not a feature audit.`;

export async function POST(req) {
  const { message, page } = await req.json();
  if (!message) {
    return NextResponse.json({ error: 'Provide a message.' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: sources } = await db
    .from('chatbot_sources')
    .select('source_type, label, url, content, question, answer')
    .limit(50);

  const contextBlocks = (sources || []).map((s) => {
    if (s.source_type === 'qa') return `Q: ${s.question}\nA: ${s.answer}`;
    return `[${s.label}]${s.url ? ` (${s.url})` : ''}\n${(s.content || '').slice(0, 3000)}`;
  });

  const userMessage = contextBlocks.length
    ? `Reference material (this is your ONLY knowledge source):\n\n${contextBlocks.join('\n\n---\n\n')}\n\n---\n\nVisitor question: ${message}`
    : `No reference material has been added yet. Visitor question: ${message}`;

  let reply;
  let confident = true;
  let flagged_reason = null;
  try {
    reply = (await askClaude(SYSTEM_PROMPT, userMessage, 800)).trim();
    const lower = reply.toLowerCase();
    if (lower.includes("don't have") || lower.includes('not covered') || lower.includes("i don't know")) {
      confident = false;
      flagged_reason = 'no_answer';
    }
  } catch (err) {
    reply = 'Ask Shree had trouble answering that. Try again.';
    confident = false;
    flagged_reason = 'error';
  }

  const ip = getClientIp(req);
  await db.from('chat_logs').insert({
    question: message,
    answer: reply,
    page: page || null,
    ip_address: ip,
    confident,
    flagged_reason,
  });

  return NextResponse.json({ reply });
}

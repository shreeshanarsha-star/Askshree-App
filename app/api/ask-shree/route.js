import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { askClaudeStream } from '../../../lib/anthropic';
import { getClientIp } from '../../../lib/gating';

// Ask Shree v3 — same restrictions as before (answers ONLY from
// admin-curated chatbot_sources, logs every Q&A), plus three real fixes
// found in a functional audit of the widget:
//
// 1. CONVERSATION MEMORY. v2 sent/used only the latest message -- a
//    follow-up like "how much does that cost?" had zero context. The
//    client now sends its recent message history and it's threaded into
//    the actual multi-turn `messages` array sent to Claude (capped to the
//    last MAX_HISTORY_TURNS turns to bound token cost).
// 2. STREAMING. v2 waited for the full reply before showing anything.
//    This now streams text deltas back as a raw chunked response the
//    client renders incrementally.
// 3. RELEVANT-ONLY CONTEXT. v2 stuffed ALL chatbot_sources rows (up to 50)
//    into every single prompt regardless of what was asked -- wasteful and
//    it would only get slower/pricier as more sources get added, plus
//    irrelevant sources dilute the answer. Now scores sources by keyword
//    overlap against the question and only includes the top matches.
// 4. RELIABLE "can't answer" DETECTION. v2 guessed at low-confidence
//    replies by string-matching the NATURAL LANGUAGE reply text for
//    phrases like "don't have" -- easy for a differently-worded answer to
//    slip past. The model is now asked for an explicit machine-readable
//    [NO_ANSWER] prefix when it can't answer, which is parsed and
//    stripped before anything reaches the visitor.
// 5. RATE LIMIT. This endpoint is deliberately exempt from the site's
//    usage gate (v2 comment: "always available") but had literally no cap
//    -- anyone could script requests against it and run up the Claude
//    bill. chat_logs already has ip_address + created_at, so this counts
//    today's rows for the IP instead of needing a new table.

const SYSTEM_PROMPT = `You are Ask Shree, the assistant on askshree.com. You ONLY answer questions
about this site and its tools, using the reference material provided below — you have no other
knowledge source and must not use general knowledge or guess. You may also see earlier turns of
this same conversation — use them for context (e.g. resolving "that" or "it"), but the reference
material is still your only source of facts.

If the reference material doesn't cover something, begin your reply with the exact token
[NO_ANSWER] (nothing before it) followed by a short plain-language explanation that you don't have
that info, pointing the visitor to Shree's contact details (in the reference material) if available.
Do not use [NO_ANSWER] just because a question is broad — only when the reference material truly
doesn't cover it.

If a question is genuinely ambiguous (for example "how do I apply" could mean applying as a
candidate or posting as an employer), ask ONE short clarifying question back instead of guessing
which one they mean. Be crisp, specific, and accurate — no filler, no hedging language, no long
preambles. Do not answer questions unrelated to askshree.com or its tools (general knowledge,
coding help, etc.) — politely explain you only answer questions about this site.

Keep answers short by default — 2-4 sentences, plain prose, no headers or bullet points, no
markdown bold. Only go longer than that if the visitor's question explicitly asks for a list, a
step-by-step walkthrough, or more detail. A visitor asking "what can X do" wants a quick, useful
answer, not a feature audit.`;

const NO_ANSWER_TOKEN = '[NO_ANSWER]';
const MAX_HISTORY_TURNS = 8; // 8 back-and-forths (~16 messages) is plenty of context without letting token cost creep unbounded on a long-running chat.
const MAX_SOURCES = 12; // top matches by relevance, not "all of them" -- see comment above.
const DAILY_MESSAGE_CAP = 20;

const STOPWORDS = new Set(['the','a','an','is','are','was','were','be','been','to','of','in','on','for','and','or','it','this','that','with','as','at','by','from','how','what','do','does','can','i','you','your','my','me','about','so','if','will','would','could','should','have','has','had','not','no','yes','please','tell','know']);

function keywords(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

// Cheap, dependency-free relevance ranking -- no embeddings/vector search
// infra needed. Question/label matches count for more than a hit buried in
// the body text, since those are a stronger signal of "this source is
// about what was asked."
function rankSources(sources, queryText) {
  const terms = keywords(queryText);
  if (!terms.length) return sources.slice(0, MAX_SOURCES);
  const scored = sources.map((s) => {
    const bodyWords = keywords(s.source_type === 'qa' ? `${s.question} ${s.answer}` : `${s.label} ${s.content}`);
    const headWords = keywords(s.source_type === 'qa' ? s.question : s.label);
    let score = 0;
    for (const t of terms) {
      if (headWords.includes(t)) score += 3;
      score += bodyWords.filter((w) => w === t).length;
    }
    return { s, score };
  });
  const matched = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, MAX_SOURCES);
  // A vague/generic question ("hi", "what can you do") won't keyword-match
  // anything -- fall back to the first MAX_SOURCES rather than going in
  // with zero context, same safety net the old "just fetch everything"
  // behavior gave for free.
  if (!matched.length) return sources.slice(0, MAX_SOURCES);
  return matched.map((x) => x.s);
}

export async function POST(req) {
  const { message, page, history } = await req.json();
  if (!message) {
    return NextResponse.json({ error: 'Provide a message.' }, { status: 400 });
  }

  const ip = getClientIp(req);
  const db = supabaseAdmin();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: usedToday } = await db
    .from('chat_logs')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('created_at', since);
  if ((usedToday || 0) >= DAILY_MESSAGE_CAP) {
    return NextResponse.json(
      { error: `You've reached today's message limit for Ask Shree. Try again tomorrow, or reach Shree directly.` },
      { status: 429 }
    );
  }

  const { data: sources } = await db
    .from('chatbot_sources')
    .select('source_type, label, url, content, question, answer')
    .limit(200); // relevance-ranked below, so this can safely be a wider pool than the old hard cap of 50.

  const relevant = rankSources(sources || [], message);
  const contextBlocks = relevant.map((s) => {
    if (s.source_type === 'qa') return `Q: ${s.question}\nA: ${s.answer}`;
    return `[${s.label}]${s.url ? ` (${s.url})` : ''}\n${(s.content || '').slice(0, 3000)}`;
  });

  const referenceText = contextBlocks.length
    ? `Reference material (this is your ONLY knowledge source):\n\n${contextBlocks.join('\n\n---\n\n')}`
    : `No reference material has been added yet.`;

  // Thread real conversation history into the actual multi-turn messages
  // array (not just concatenated into one string) so Claude sees it as
  // genuine prior turns. The reference material is re-sent with the LATEST
  // user turn only -- resending it on every historical turn would blow up
  // token cost for no benefit, since it doesn't change turn to turn.
  const priorTurns = (Array.isArray(history) ? history : [])
    .slice(-MAX_HISTORY_TURNS * 2)
    .filter((m) => m && m.text && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({ role: m.role, content: m.text }));

  const messages = [
    ...priorTurns,
    { role: 'user', content: `${referenceText}\n\n---\n\nVisitor question: ${message}` },
  ];

  const encoder = new TextEncoder();
  let full = '';
  let streamError = null;

  const body = new ReadableStream({
    async start(controller) {
      let buffer = '';
      let decided = false; // whether we've resolved the [NO_ANSWER]-prefix check yet
      try {
        for await (const delta of askClaudeStream(SYSTEM_PROMPT, messages, 800)) {
          full += delta;
          if (!decided) {
            buffer += delta;
            if (buffer.length < NO_ANSWER_TOKEN.length && full.length < 4000) continue; // keep buffering until we can tell
            decided = true;
            if (buffer.startsWith(NO_ANSWER_TOKEN)) {
              buffer = buffer.slice(NO_ANSWER_TOKEN.length).replace(/^\s+/, '');
            }
            if (buffer) controller.enqueue(encoder.encode(buffer));
          } else {
            controller.enqueue(encoder.encode(delta));
          }
        }
        if (!decided && buffer) {
          // Reply ended before we ever hit the buffering threshold (very
          // short reply) -- resolve now.
          if (buffer.startsWith(NO_ANSWER_TOKEN)) buffer = buffer.slice(NO_ANSWER_TOKEN.length).replace(/^\s+/, '');
          if (buffer) controller.enqueue(encoder.encode(buffer));
        }
      } catch (err) {
        streamError = err;
        const fallback = 'Ask Shree had trouble answering that. Try again.';
        controller.enqueue(encoder.encode(fallback));
        full = fallback;
      } finally {
        controller.close();
        const wasNoAnswer = full.startsWith(NO_ANSWER_TOKEN);
        await db.from('chat_logs').insert({
          question: message,
          answer: wasNoAnswer ? full.slice(NO_ANSWER_TOKEN.length).replace(/^\s+/, '') : full,
          page: page || null,
          ip_address: ip,
          confident: streamError ? false : !wasNoAnswer,
          flagged_reason: streamError ? 'error' : (wasNoAnswer ? 'no_answer' : null),
        });
      }
    },
  });

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}

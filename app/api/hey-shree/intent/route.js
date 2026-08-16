import { NextResponse } from 'next/server';
import { askClaude } from '../../../../lib/anthropic';

// Tiny, fast classifier that sits between the reactor mic and two existing
// systems: it decides whether a spoken sentence that didn't match a tool
// name is (a) a candidate-sourcing request -- in which case the caller
// opens Smart Source.ai and hands it the raw sentence, reusing that tool's
// own AI job-description parser to do the real extraction -- or (b)
// anything else, which falls back to the existing Ask Shree knowledge-base
// brain. This route does no extraction itself on purpose: Smart Source.ai
// already has a real, tested pipeline for turning messy text into a
// structured search (extractSearchCriteria) -- duplicating that here would
// just be a second, worse version of the same thing.
const SYSTEM_PROMPT = `Classify a single spoken sentence from a recruiting-site voice assistant into
exactly one of two intents:

"search" — the person wants to find/source/hunt for a candidate or a type of person to hire
(e.g. "find a sales guy in Mexico with pharma experience", "source me a React developer in
Bangalore", "I need a finance manager candidate").

"general" — anything else: a question about the site, a greeting, small talk, or anything that
isn't a request to find a candidate.

Reply with ONLY a JSON object, no other text: {"intent": "search"} or {"intent": "general"}`;

export async function POST(req) {
  const { message } = await req.json();
  if (!message || !message.trim()) {
    return NextResponse.json({ intent: 'general' });
  }

  try {
    const raw = (await askClaude(SYSTEM_PROMPT, message.trim(), 40)).trim();
    const jsonMatch = raw.match(/\{[^}]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    const intent = parsed.intent === 'search' ? 'search' : 'general';
    return NextResponse.json({ intent });
  } catch (e) {
    return NextResponse.json({ intent: 'general' });
  }
}

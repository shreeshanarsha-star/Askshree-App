import OpenAI from 'openai';

// MIGRATED FROM ANTHROPIC TO NVIDIA'S API CATALOG (build.nvidia.com).
// Reason: the Anthropic Console account got stuck behind a billing/payment
// verification failure (card passes bank 3DS, then Anthropic's own identity
// check rejects it -- a known bug affecting other users too, not fixable
// from our side) with zero AI features working as a result. NVIDIA's API
// catalog issues a free key with no credit card required and speaks the
// OpenAI chat-completions format, so this file now wraps that instead of
// the Anthropic SDK.
//
// File is still named lib/anthropic.js (not renamed) and every exported
// function below keeps its EXACT original name and signature -- that was
// deliberate, so none of the 15+ files across the codebase that import
// { askClaude, askClaudeWithSearch, askClaudeStream } from here needed to
// change at all. Only this file's internals changed.
//
// Needs NVIDIA_API_KEY set in the environment (get a free one at
// https://build.nvidia.com, no card required). NVIDIA_MODEL is optional --
// defaults to a strong general-purpose instruct model; override it to try
// a different one from the catalog without a code change.
// Falls back to a placeholder string (never a real key) so the OpenAI SDK's
// constructor doesn't throw at MODULE LOAD TIME when NVIDIA_API_KEY isn't
// set -- that would break `next build`'s page-data collection step for
// every route that imports this file (it evaluates the module without
// making a real request), the same way a missing Supabase env var already
// does for one unrelated admin route in this build. A missing/placeholder
// key still fails loudly the moment an actual API call is made at runtime,
// which is the correct behavior -- it just shouldn't fail at build time.
const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || 'not-configured',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});
const MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct';

// Standard call for tools that just need a single structured response
// (scoring, drafting, reformatting). Returns the raw text of the reply.
export async function askClaude(systemPrompt, userMessage, maxTokens = 2000) {
  const res = await client.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });
  return res.choices?.[0]?.message?.content || '';
}

// Live web search, restored via SerpApi (the same Google-results proxy
// already paying for Smart Source.ai/Smart Hunt.ai's candidate search --
// see lib/smartSource.js -- reusing the existing SERPAPI_KEY, no new
// signup). NVIDIA's OpenAI-compatible endpoint has no built-in search tool
// like Anthropic's did, so this is a manual two-step pipeline instead of
// the model deciding on its own when to search:
//   1. A small, cheap AI call turns the (often long, prompt-shaped)
//      `userMessage` into an actual short search query -- sending the raw
//      prompt straight to Google would return junk, since it reads like
//      instructions, not a search query.
//   2. That query goes to SerpApi, and the top results get appended to the
//      real prompt as grounding context before the normal askClaude call.
// This covers the three real call sites (Offer.ai comp-band chat, Margin.ai
// recommendation drafting, Gauri.ai's search toggle) without needing a full
// agentic tool-calling loop. If a missing key, a failed search, or a search
// returning nothing happens, this falls back to a plain askClaude call
// rather than blocking the feature entirely on search working.
async function deriveSearchQuery(userMessage) {
  try {
    const q = await askClaude(
      'Output ONLY a short web search query (3-8 words, no quotes, no ' +
      'explanation, nothing else) that would find the most useful current ' +
      'information to help answer or act on the context given.',
      String(userMessage).slice(0, 4000),
      40
    );
    const clean = q.trim().replace(/^["']|["']$/g, '').split('\n')[0].slice(0, 200);
    return clean || null;
  } catch (e) {
    return null;
  }
}

async function webSearch(query) {
  const key = process.env.SERPAPI_KEY;
  if (!key || !query) return [];
  try {
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=5&api_key=${encodeURIComponent(key)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.error) return [];
    return (data.organic_results || []).slice(0, 5).map((r) => ({
      title: r.title,
      snippet: r.snippet || '',
      link: r.link,
    }));
  } catch (e) {
    return [];
  }
}

export async function askClaudeWithSearch(systemPrompt, userMessage, maxTokens = 2000) {
  const query = await deriveSearchQuery(userMessage);
  const results = query ? await webSearch(query) : [];
  if (!results.length) {
    return askClaude(systemPrompt, userMessage, maxTokens);
  }
  const searchBlock = `Live web search results for "${query}" (use for current/factual ` +
    `grounding where relevant):\n\n` +
    results.map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}\n${r.link}`).join('\n\n');
  const augmentedMessage = `${userMessage}\n\n---\n\n${searchBlock}`;
  return askClaude(systemPrompt, augmentedMessage, maxTokens);
}

export default client;

// Streaming variant for the Ask Shree chat widget -- takes a full multi-turn
// message array (not a single string) so conversation history survives
// across turns, and yields text deltas as they arrive instead of waiting
// for the full response. Callers consume it with `for await`. `messages`
// items are already { role: 'user'|'assistant', content: string } -- the
// same shape both Anthropic and OpenAI-compatible APIs expect, so this
// keeps working unchanged from the caller's side.
export async function* askClaudeStream(systemPrompt, messages, maxTokens = 800) {
  const stream = await client.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}

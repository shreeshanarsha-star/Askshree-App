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
const MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-405b-instruct';

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

// NOTE ON THIS MIGRATION: Anthropic's Messages API had a native web_search
// tool that this function used to pass through (`tools: [{ type:
// 'web_search_20250305', ... }]`), giving live web results to Offer.ai's
// comp-band chat, Margin.ai's recommendation drafting, and Gauri.ai's
// optional "search the web" toggle. NVIDIA's OpenAI-compatible endpoint has
// no equivalent built-in tool -- there's no live web grounding available
// here without wiring up a separate search API (e.g. the Serper integration
// already used by Smart Source.ai) and manually feeding results into the
// prompt, which wasn't done here to keep this migration fast and unblock
// the site today. Right now this is a plain (non-search) call, identical to
// askClaude -- kept as a separate export so call sites don't need to change
// and so it's easy to find every place that WANTS real search if that gets
// built later.
export async function askClaudeWithSearch(systemPrompt, userMessage, maxTokens = 2000) {
  return askClaude(systemPrompt, userMessage, maxTokens);
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

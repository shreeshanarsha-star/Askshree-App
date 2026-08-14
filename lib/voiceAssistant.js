import { askClaude, askClaudeWithSearch } from './anthropic';

// Deliberately open-ended — Voice.ai is a general assistant, not a fixed
// scoring/extraction pipeline like the other tools. It's told to actually
// do whatever's asked (research, compare, draft, summarize, analyze) using
// whatever context it's given, rather than deflecting to "I can't do that."
const ASSISTANT_PROMPT = `You are Voice.ai, Ask Shree's voice-driven assistant for a recruiter.
You're given a spoken-or-typed request, optionally the text of a file the recruiter uploaded, and
(when enabled) live web search. Do whatever the request actually asks — research, summarize,
compare, draft, extract, analyze, answer a question — using the uploaded file and the web as your
sources. Be direct and concrete, skip generic disclaimers and hedging. If the request refers to
"the file", "this", or similar, assume it means the uploaded reference file when one was provided.
If nothing useful can be done with what's given, say so plainly and explain what's missing.`;

export async function runVoiceAssistant({ query, referenceText, useWebSearch }) {
  const context = `Request: ${query}

--- Uploaded file content ---
${referenceText ? referenceText.slice(0, 10000) : '(no file uploaded)'}`;

  const caller = useWebSearch ? askClaudeWithSearch : askClaude;
  return await caller(ASSISTANT_PROMPT, context, 3000);
}

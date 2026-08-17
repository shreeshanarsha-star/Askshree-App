import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Standard call for tools that just need a single structured response
// (scoring, drafting, reformatting). Returns the raw text of Claude's reply.
export async function askClaude(systemPrompt, userMessage, maxTokens = 2000) {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  return res.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

// Agentic call with the web_search tool enabled — used by tools that need
// current market/comparable-role data (Get JD, Run Market Search) and by
// Ask Shree (which also blends in the admin's repository text separately).
export async function askClaudeWithSearch(systemPrompt, userMessage, maxTokens = 2000) {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
  });
  return res.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

export default client;

// Streaming variant for the Ask Shree chat widget -- takes a full multi-turn
// message array (not a single string) so conversation history survives
// across turns, and yields text deltas as they arrive instead of waiting
// for the full response. Callers consume it with `for await`.
export async function* askClaudeStream(systemPrompt, messages, maxTokens = 800) {
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

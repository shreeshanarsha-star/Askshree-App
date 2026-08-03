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

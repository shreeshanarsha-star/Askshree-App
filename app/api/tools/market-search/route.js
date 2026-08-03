import { NextResponse } from 'next/server';
import { enforceGate } from '../../../../lib/enforceGate';
import { askClaudeWithSearch } from '../../../../lib/anthropic';

const SYSTEM_PROMPT = `You are Run Market Search, part of Ask Shree's recruiting
toolkit. Given a role, industry, and location, search the web for current
compensation benchmarks, talent supply/demand signal, and notable employers
hiring for this role right now. Summarize findings in 4 short sections: Pay
range signal, Talent supply, Who's hiring, Sourcing angle (a one-line practical
tip). Cite where a specific figure came from. Keep the whole answer under 350
words. This is broader market context, not a single JD's requirements.`;

export async function POST(req) {
  const { ip, response } = await enforceGate(req, 'market_search');
  if (response) return response;

  const { role, industry, location } = await req.json();
  if (!role) {
    return NextResponse.json({ error: 'Provide at least a role.' }, { status: 400 });
  }

  const userMessage = `Role: ${role}\nIndustry: ${industry || 'unspecified'}\nLocation: ${
    location || 'unspecified'
  }`;

  try {
    const result = await askClaudeWithSearch(SYSTEM_PROMPT, userMessage, 1200);
    return NextResponse.json({ ip, result: { summary: result.trim() } });
  } catch (err) {
    return NextResponse.json({ error: 'Market search failed. Try again.' }, { status: 500 });
  }
}

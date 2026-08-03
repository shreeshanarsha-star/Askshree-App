import { NextResponse } from 'next/server';
import { enforceGate } from '../../../../lib/enforceGate';
import { askClaudeWithSearch } from '../../../../lib/anthropic';

const SYSTEM_PROMPT = `You are Smart Source, part of Ask Shree's recruiting toolkit.
Given a job description, produce a sourcing plan: 5-8 realistic Boolean/X-ray
search strings for LinkedIn and Google (kept under 32 words each, no long
exclusion chains), 5 target companies to source from and why, and 3 adjacent
job titles candidates might currently hold. Use web search only to ground
company/industry facts (comparable companies, market context) — never to
scrape or access any specific person's private profile data.
Respond as JSON: { "search_strings": [str], "target_companies": [{name,why}],
"adjacent_titles": [str] }.`;

export async function POST(req) {
  const { ip, response } = await enforceGate(req, 'smart_source');
  if (response) return response;

  const { jobDescription } = await req.json();
  if (!jobDescription) {
    return NextResponse.json({ error: 'Provide a jobDescription.' }, { status: 400 });
  }

  try {
    const raw = await askClaudeWithSearch(SYSTEM_PROMPT, jobDescription, 3000);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return NextResponse.json({ ip, result: parsed });
  } catch (err) {
    return NextResponse.json({ error: 'Sourcing plan failed. Try again.' }, { status: 500 });
  }
}

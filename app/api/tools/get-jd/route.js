import { NextResponse } from 'next/server';
import { enforceGate } from '../../../../lib/enforceGate';
import { askClaudeWithSearch } from '../../../../lib/anthropic';

const SYSTEM_PROMPT = `You are Get JD, part of Ask Shree's recruiting toolkit.
Given a rough role title, seniority, and industry/location, search the web for
2-3 comparable real job postings to ground your understanding of current market
expectations, then draft a complete, well-structured job description: Role
summary, Responsibilities (5-8 bullets), Requirements (5-8 bullets), Nice-to-haves
(3-4 bullets), and a one-line note on typical compensation range for that market
if you found credible signal. Do not fabricate a specific company's real posting
verbatim — write an original JD informed by the pattern you observed.`;

export async function POST(req) {
  const { ip, response } = await enforceGate(req, 'get_jd');
  if (response) return response;

  const { role, seniority, industry, location } = await req.json();
  if (!role) {
    return NextResponse.json({ error: 'Provide at least a role title.' }, { status: 400 });
  }

  const userMessage = `Role: ${role}\nSeniority: ${seniority || 'unspecified'}\nIndustry: ${
    industry || 'unspecified'
  }\nLocation: ${location || 'unspecified'}`;

  try {
    const jd = await askClaudeWithSearch(SYSTEM_PROMPT, userMessage, 2500);
    return NextResponse.json({ ip, result: { jd: jd.trim() } });
  } catch (err) {
    return NextResponse.json({ error: 'JD drafting failed. Try again.' }, { status: 500 });
  }
}

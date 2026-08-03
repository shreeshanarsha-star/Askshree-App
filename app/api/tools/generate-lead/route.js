import { NextResponse } from 'next/server';
import { enforceGate } from '../../../../lib/enforceGate';
import { askClaudeWithSearch } from '../../../../lib/anthropic';

const SYSTEM_PROMPT = `You are Generate Lead, part of Ask Shree's recruiting
toolkit. Given a target role/industry/region, search the web to identify 5-8
companies (or, for a business-development angle, potential client organizations)
that are a realistic fit for outreach right now — recently funded, publicly
hiring, expanding in the region, or otherwise showing signal. For each, give
the company name, one line on why they're a good lead right now, and a
suggested outreach angle. Never invent a specific named individual's private
contact details — only public company-level signal.
Respond as JSON: { "leads": [{ "company": str, "why_now": str, "angle": str }] }.`;

export async function POST(req) {
  const { ip, response } = await enforceGate(req, 'generate_lead');
  if (response) return response;

  const { role, industry, region } = await req.json();
  if (!role && !industry) {
    return NextResponse.json({ error: 'Provide a role or industry focus.' }, { status: 400 });
  }

  const userMessage = `Role/focus: ${role || 'unspecified'}\nIndustry: ${
    industry || 'unspecified'
  }\nRegion: ${region || 'unspecified'}`;

  try {
    const raw = await askClaudeWithSearch(SYSTEM_PROMPT, userMessage, 2000);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return NextResponse.json({ ip, result: parsed });
  } catch (err) {
    return NextResponse.json({ error: 'Lead generation failed. Try again.' }, { status: 500 });
  }
}

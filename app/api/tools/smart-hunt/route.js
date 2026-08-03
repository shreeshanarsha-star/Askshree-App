import { NextResponse } from 'next/server';
import { enforceGate } from '../../../../lib/enforceGate';
import { askClaude } from '../../../../lib/anthropic';

const SYSTEM_PROMPT = `You are Smart Hunt, part of Ask Shree's recruiting toolkit.
Given free-text search criteria (title, skills, location, seniority), generate
5-8 short, focused X-ray search queries (site:linkedin.com/in style) for public
search engines. Keep each query under 32 words, avoid long boolean/exclusion
chains, and prefer several small focused variants over one giant query.
Respond as JSON: { "queries": [str], "notes": str }.`;

export async function POST(req) {
  const { ip, response } = await enforceGate(req, 'smart_hunt');
  if (response) return response;

  const { criteria } = await req.json();
  if (!criteria) {
    return NextResponse.json({ error: 'Provide search criteria.' }, { status: 400 });
  }

  try {
    const raw = await askClaude(SYSTEM_PROMPT, criteria, 1500);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return NextResponse.json({ ip, result: parsed });
  } catch (err) {
    return NextResponse.json({ error: 'Search generation failed. Try again.' }, { status: 500 });
  }
}

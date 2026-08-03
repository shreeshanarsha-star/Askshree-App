import { NextResponse } from 'next/server';
import { enforceGate } from '../../../../lib/enforceGate';
import { askClaude } from '../../../../lib/anthropic';

const SYSTEM_PROMPT = `You are Fit Check, part of Ask Shree's recruiting toolkit.
Given a job description and one or more candidate resumes, score each candidate
against these 8 factors, each out of 100: Industry fit, Experience match, Tenure
pattern, Location fit, Comp alignment, Skills match, Education fit, Career
trajectory. Weight the factors sensibly for the specific role, compute an overall
score out of 100, and give a 2-3 sentence rationale per candidate.
Respond ONLY as JSON: { "candidates": [ { "name": str, "overall": int,
"factors": { "industry_fit": int, ... }, "rationale": str } ] }. No other text.`;

export async function POST(req) {
  const { ip, response } = await enforceGate(req, 'fit_check');
  if (response) return response;

  const { jobDescription, resumes } = await req.json();
  if (!jobDescription || !resumes?.length) {
    return NextResponse.json(
      { error: 'Provide a jobDescription and at least one resume.' },
      { status: 400 }
    );
  }
  if (resumes.length > 20) {
    return NextResponse.json({ error: 'Up to 20 CVs per run.' }, { status: 400 });
  }

  const userMessage = `Job description:\n${jobDescription}\n\nCandidates:\n${resumes
    .map((r, i) => `--- Candidate ${i + 1}: ${r.name} ---\n${r.text}`)
    .join('\n\n')}`;

  try {
    const raw = await askClaude(SYSTEM_PROMPT, userMessage, 4000);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return NextResponse.json({ ip, result: parsed });
  } catch (err) {
    return NextResponse.json({ error: 'Scoring failed. Try again.' }, { status: 500 });
  }
}

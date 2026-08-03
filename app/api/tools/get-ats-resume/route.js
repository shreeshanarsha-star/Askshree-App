import { NextResponse } from 'next/server';
import { enforceGate } from '../../../../lib/enforceGate';
import { askClaude } from '../../../../lib/anthropic';

const SYSTEM_PROMPT = `You are Get ATS Friendly Resume, part of Ask Shree's
recruiting toolkit. Given raw resume text (possibly messy, from a PDF/DOCX
extraction), rewrite it into a clean, ATS-parseable structure: plain text,
standard section headers (Summary, Experience, Education, Skills), no tables,
no columns, no graphics references, consistent date formats (Mon YYYY - Mon
YYYY), and bullet points starting with strong action verbs. Preserve every
real fact from the original — do not invent employers, dates, or numbers.
If a target job description is provided, lightly emphasize matching keywords
already present in the resume (never fabricate skills the candidate doesn't
have). Output the rewritten resume as plain text only, no commentary.`;

export async function POST(req) {
  const { ip, response } = await enforceGate(req, 'get_ats_resume');
  if (response) return response;

  const { resumeText, targetJd } = await req.json();
  if (!resumeText) {
    return NextResponse.json({ error: 'Provide the resume text.' }, { status: 400 });
  }

  const userMessage = targetJd
    ? `Resume:\n${resumeText}\n\nTarget job description (for keyword alignment only):\n${targetJd}`
    : `Resume:\n${resumeText}`;

  try {
    const result = await askClaude(SYSTEM_PROMPT, userMessage, 3000);
    return NextResponse.json({ ip, result: { resume: result.trim() } });
  } catch (err) {
    return NextResponse.json({ error: 'Reformatting failed. Try again.' }, { status: 500 });
  }
}

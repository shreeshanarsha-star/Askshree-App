import { askClaude } from './anthropic';
import { ROLE_LADDER } from './assessments/roles';

// Extracts the four "Auto" fields on the Assign screen from a CV. Same
// discipline as lib/aiScreen.js: strict JSON, no invention — if something isn't
// in the CV, it comes back null and the recruiter fills it in manually.
const EXTRACT_PROMPT = `You extract contact and seniority details from a candidate's CV for a
recruiting tool. Respond as JSON only (no markdown fences, no prose):
{
  "name": string or null,
  "email": string or null,
  "contact": string or null (phone number, with country code if present in the CV),
  "role_level": string or null,
  "current_designation": string or null,
  "years_experience": number or null,
  "location": string or null
}
"role_level" MUST be exactly one of these strings, chosen by mapping the candidate's actual
seniority and total years of experience onto this ladder:
${ROLE_LADDER.map((r) => `- ${r}`).join('\n')}
Pick the single closest step. Weigh actual title and scope of responsibility above raw years when
the two disagree. Never invent an email, phone number or name that is not present in the CV text —
use null instead. If seniority genuinely cannot be inferred, use null for role_level.`;

export async function extractCandidateFields(cvText) {
  const raw = await askClaude(EXTRACT_PROMPT, cvText.slice(0, 30000), 800);
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  // Guard against a role_level that isn't on the ladder.
  if (parsed.role_level && !ROLE_LADDER.includes(parsed.role_level)) parsed.role_level = null;
  return parsed;
}

// Recruiter-facing narrative. Generated ONCE from the dimension scores and
// cached on assessment_results.ai_narrative — never regenerated on page view.
const NARRATIVE_PROMPT = `You write a short, honest interpretation of a completed psychometric
assessment for the hiring manager who will interview this candidate. You are given the instrument,
the candidate's role level, and their scored dimensions (0-100 each).

Respond as JSON only (no markdown fences, no prose):
{
  "strengths": array of 3 short strings,
  "risks": array of 2-3 short strings,
  "interview_focus": array of 3 short strings (each a concrete thing to probe in interview)
}
Be specific to the actual scores — reference the dimensions by name and say what the pattern
between them implies, rather than restating the numbers. Do not inflate: a low dimension is a real
risk and should be named as one. Every claim must be traceable to the scores you were given; never
infer anything about the person's background, demographics, or competence at their job — this is a
behavioural self-report, not a skills test, so frame everything as "self-reports as" / "likely to".`;

const BIG_FIVE_NARRATIVE_PROMPT = `You write a short, neutral personality-trait summary for a hiring
manager, based on a completed IPIP Big-Five Factor Markers profile (0-100 per domain).

This is a TRAIT PROFILE, not an evaluation. There are no good or bad scores. You must NOT use
hiring language ("strong hire", "risk", "concern", "development area"), must NOT recommend for or
against the candidate, and must NOT imply any trait level is better than another.

Respond as JSON only (no markdown fences, no prose):
{
  "strengths": array of 3 short strings (describe what this profile tends to LOOK LIKE at work — a
    neutral behavioural description, not a compliment),
  "risks": array of 2-3 short strings (describe situations this profile may find less natural —
    phrased neutrally as fit/context, never as a deficiency),
  "interview_focus": array of 3 short strings (neutral things worth exploring in conversation to
    understand how this person prefers to work)
}
Frame everything as tendencies ("tends to", "may prefer"), never as fixed traits or predictions of
performance.`;

export async function generateNarrative(assessmentType, assessmentName, roleLevel, dimensionScores, overallScore, bandLabel) {
  const isBigFive = assessmentType === 'big_five';
  const lines = dimensionScores.map((d) => `- ${d.label}: ${d.score}/100 (${d.band})`).join('\n');
  const context = `Instrument: ${assessmentName}
Candidate role level: ${roleLevel || 'not specified'}
${isBigFive ? '' : `Overall weighted score: ${overallScore}/100 (${bandLabel})\n`}Dimension scores:
${lines}`;

  const raw = await askClaude(isBigFive ? BIG_FIVE_NARRATIVE_PROMPT : NARRATIVE_PROMPT, context, 900);
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

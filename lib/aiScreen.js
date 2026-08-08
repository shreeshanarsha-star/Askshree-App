import { askClaude } from './anthropic';

// Structures a raw JD into a listing. Returns strict JSON, temperature-0 style
// (no web search, no invented facts — only what's in the JD text).
const STRUCTURE_PROMPT = `You structure a raw job description into a listing for a job board.
Read the JD text and extract, as JSON only (no markdown fences, no prose):
{
  "title": string,
  "company": string,
  "company_url": string or null (only if explicitly present in the text, never invented),
  "location": string,
  "must_have_skills": array of exactly 5 short strings,
  "good_to_have_skills": array of exactly 5 short strings,
  "qualification": string (one line)
}
If the JD has fewer than 5 must-have or good-to-have items, infer reasonable adjacent ones from
context rather than leaving the array short — but never fabricate a company name, URL, or location
that isn't in the text. If company_url truly isn't present, use null.`;

export async function structureJD(jdText) {
  const raw = await askClaude(STRUCTURE_PROMPT, jdText, 1200);
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

// Screens one candidate against one job posting. Structured, evidence-based,
// low-temperature by design (askClaude uses no sampling params beyond model default,
// and the prompt forces evidence citation rather than free-form judgment).
const SCREEN_PROMPT = `You are screening a candidate against a job's requirements for a recruiting
platform. You will be given the job's must-have skills, good-to-have skills, qualification
requirement, and any additional non-negotiables the employer stated, followed by the candidate's
resume text. Score honestly — do not inflate scores to be agreeable.

Respond as JSON only:
{
  "match_score": integer 0-100,
  "matched_skills": array of strings (skills from the job's lists that the resume evidences),
  "missing_skills": array of strings (must-have skills NOT evidenced in the resume),
  "evidence": string (1-2 sentences citing specific things in the resume that justify the score),
  "cover_note": string (a short, specific 2-3 sentence note on why this candidate could be a fit,
    written for the employer — no generic filler, must reference something concrete from the resume)
}
If the resume doesn't evidence enough of the must-haves to be a real candidate, still return a low
match_score honestly rather than a generic one — this score gates whether the employer ever sees
this candidate, so accuracy matters more than being encouraging.`;

export async function screenCandidate(jobPosting, poster, resumeText) {
  const jobContext = `Job: ${jobPosting.title} at ${jobPosting.company}
Must-have skills: ${jobPosting.must_have_skills.join(', ')}
Good-to-have skills: ${jobPosting.good_to_have_skills.join(', ')}
Qualification required: ${jobPosting.qualification || 'not specified'}
Additional non-negotiables from employer: ${poster?.non_negotiables || 'none stated'}
Minimum years of experience: ${poster?.min_years_experience ?? 'not specified'}

--- Candidate resume text ---
${resumeText}`;

  const raw = await askClaude(SCREEN_PROMPT, jobContext, 1000);
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

import { askClaude } from './anthropic';

// Structures a raw JD into a listing. Returns strict JSON, temperature-0 style
// (no web search, no invented facts — only what's in the JD text).
// Deliberately exactly 3 must-have + 3 good-to-have (not 5) — these feed the
// candidate questionnaire directly, and a short, forced-priority list is more
// useful there than a padded-out five.
const STRUCTURE_PROMPT = `You structure a raw job description into a listing for a job board.
Read the JD text and extract, as JSON only (no markdown fences, no prose):
{
  "title": string,
  "company": string,
  "company_url": string or null (only if explicitly present in the text, never invented),
  "location": string,
  "must_have_skills": array of exactly 3 short strings — the single most important, truly
    non-negotiable technical skills. If the JD lists more than 3, pick the 3 most critical.
    If it lists fewer, infer the most reasonable adjacent ones from context.
  "good_to_have_skills": array of exactly 3 short strings — same rule, for nice-to-haves.
  "qualification": string (one line — the required degree/qualification),
  "min_years_experience": number or null (minimum years of experience required, if stated
    or clearly implied — e.g. "5+ years" -> 5; leave null if genuinely not indicated),
  "industry": string or null (the industry/domain this role sits in, if the JD indicates one —
    e.g. "FMCG", "SaaS", "Healthcare"; null if not clear),
  "ctc_budget": string or null (compensation/budget for the role, only if explicitly stated in
    the JD text — never invented, null if not mentioned)
}
Never fabricate a company name, URL, or location that isn't in the text. If company_url truly
isn't present, use null.`;

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
Minimum years of experience: ${jobPosting.min_years_experience ?? poster?.min_years_experience ?? 'not specified'}

--- Candidate resume text ---
${resumeText}`;

  const raw = await askClaude(SCREEN_PROMPT, jobContext, 1000);
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

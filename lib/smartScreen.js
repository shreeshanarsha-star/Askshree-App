import { askClaude } from './anthropic';

// Turns a raw JD into the same criteria shape the manual-entry form produces,
// so scoring never has to branch by mode downstream — one shape, one prompt.
const STRUCTURE_CRITERIA_PROMPT = `You structure a raw job description into screening criteria.
Read the JD text and extract, as JSON only (no markdown fences, no prose):
{
  "role_title": string,
  "min_years_experience": number or null,
  "ctc_budget": string or null (only if explicitly stated, e.g. "up to 60L" — never invented),
  "must_have_skills": array of short strings,
  "good_to_have_skills": array of short strings,
  "other_notes": string or null (non-negotiables like location/relocation, if stated)
}
Never fabricate a CTC figure or requirement that isn't in the text — use null if it's not stated.`;

export async function structureCriteria(jdText) {
  const raw = await askClaude(STRUCTURE_CRITERIA_PROMPT, jdText, 800);
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

// Scores one CV against the batch's criteria AND extracts the candidate's
// profile fields in a single call — cheaper than two calls, and appropriate
// here (unlike Job posting.ai's apply flow) because a Smart screen.ai batch
// only ever screens against ONE set of criteria, not many jobs per CV.
const SCREEN_PROMPT = `You are screening one candidate's CV against a role's criteria for a bulk
CV-screening tool. Score honestly — do not inflate scores to be agreeable, and do not deflate them
to seem rigorous. This score gates how a recruiter prioritizes real people, so accuracy matters
more than being encouraging or harsh.

Score fit_score out of 10, built from these weighted dimensions (role-fit only):
- Must-have skills match AND semantic relevance of the candidate's actual experience to what the
  role is asking for (judge by meaning, not shared vocabulary — do not reward keyword-stuffed
  resumes that repeat JD phrases without evidencing the work): up to 3.5
- Experience relevance — years of experience AND whether that experience is in a relevant
  domain/seniority, not just a number: up to 1.5
- Qualification match, exact OR equivalent (e.g. an MBA-equivalent postgrad counts if the role asks
  for an MBA): up to 1
- Career stability, judged RELATIVE TO career stage (short stints in the first few years out of
  college are normal; the same pattern 8+ years in is a real signal) — not a flat "3 years average"
  rule: up to 1
- Good-to-have skills: up to 1
- CTC fit within the stated budget: up to 1
- Notice period / location / other stated non-negotiables: up to 1
If a dimension has no information to judge (e.g. no CTC budget was given, or the CV states no CTC),
exclude that dimension entirely and redistribute its weight proportionally across the remaining
dimensions so the total still scales to 10 — do not penalize missing data as if it were a negative
signal.

Keep fit_score strictly about role fit. Red flags and achievements are separate, visible fields —
never fold them into the number, so a red flag never silently drags down an otherwise strong score
and a recruiter can always see and override it.

red_flags: MAJOR issues only, each a short factual sentence. Examples of what counts: repeated very
short stints (under 6 months, more than once) especially at a senior level, unexplained multi-year
employment gaps, overlapping full-time employment dates, a downward title trajectory with no stated
explanation. Do NOT flag: typos, formatting, short gaps under ~2 months, normal early-career job
changes, or career pivots. Return an empty array if there is nothing major.

achievement: one standout, concretely-evidenced accomplishment (a stated metric, award, notable
project, unusually fast promotion) if the CV genuinely shows one — otherwise null. Do not manufacture
one from generic responsibilities.

interview_questions: exactly 2 questions tailored to this specific candidate — probing the gaps you
found if there are missing must-haves, or probing to validate the strongest claim if there are none.
Never generic questions that could apply to any candidate.

next_action: { "label": short actionable string, "tier": one of "go" | "screen" | "hold" | "pass" }.
Use "go" for a strong fit (roughly 8+) with no major red flags. Use "screen" when there's a real gap
worth a conversation before deciding. Use "hold" when fit is reasonable but a practical blocker
(long notice period, large compensation gap, major red flag) makes it worth waiting on. Use "pass"
for a weak fit (roughly 5 or below).

Critical: never use age, date of birth, or any age-implying detail as a scoring or red-flag factor,
even if it appears in the CV. If a birth date is present, extract it into the profile field only
(for informational display) and otherwise ignore it completely for scoring and flagging.

Respond as JSON only (no markdown fences, no prose):
{
  "fit_score": number (1-10, one decimal place),
  "met_skills": array of strings,
  "missing_skills": array of strings,
  "justification": string (~100 words, evidence-based, specific to this candidate — no generic filler),
  "red_flags": array of strings,
  "achievement": string or null,
  "interview_questions": array of exactly 2 strings,
  "next_action": { "label": string, "tier": "go" | "screen" | "hold" | "pass" },
  "profile": {
    "name": string or null,
    "email": string or null,
    "phone": string or null,
    "current_company": string or null,
    "current_designation": string or null,
    "location": string or null,
    "years_experience": number or null,
    "current_ctc": string or null,
    "expected_ctc": string or null,
    "notice_period": string or null,
    "date_of_birth": string or null
  }
}`;

export async function screenCandidateForBatch(criteria, resumeText) {
  const criteriaContext = `Role: ${criteria.role_title || 'not specified'}
Minimum years of experience: ${criteria.min_years_experience ?? 'not specified'}
CTC budget (max): ${criteria.ctc_budget || 'not specified'}
Must-have skills: ${(criteria.must_have_skills || []).join(', ') || 'none specified'}
Good-to-have skills: ${(criteria.good_to_have_skills || []).join(', ') || 'none specified'}
Other notes / non-negotiables: ${criteria.other_notes || 'none stated'}

--- Candidate resume text ---
${resumeText}`;

  const raw = await askClaude(SCREEN_PROMPT, criteriaContext, 1400);
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

// One extra call per BATCH (not per CV) comparing the top few candidates —
// genuinely AI-generated, not hardcoded copy, since this ships to production.
const BATCH_SUMMARY_PROMPT = `You are comparing the top candidates from a batch CV screening, for a
recruiter deciding who to prioritize. You'll be given each top candidate's name, fit score, key
strengths, gaps, CTC info, and notice period. Write one tight paragraph (100-130 words) comparing
them directly — call out what actually differentiates them, not just repeating scores back. Be
specific and decision-useful, not generic. Plain prose, no markdown, no bullet points.`;

export async function summarizeBatch(topCandidates) {
  const context = topCandidates.map((c, i) =>
    `${i + 1}. ${c.name || 'Candidate'} — fit ${c.fitScore}/10. Met: ${(c.metSkills || []).join(', ') || 'none'}. ` +
    `Missing: ${(c.missingSkills || []).join(', ') || 'none'}. Current CTC: ${c.currentCtc || 'n/a'}, ` +
    `Expected: ${c.expectedCtc || 'n/a'}. Notice: ${c.noticePeriod || 'n/a'}.`
  ).join('\n');
  return askClaude(BATCH_SUMMARY_PROMPT, context, 400);
}

import crypto from 'crypto';
import { askClaude } from './anthropic';
import { supabaseAdmin } from './supabase';

// Stage 2 of the matching pipeline: a candidate who cleared the CV-based
// screen (see screenCandidate in aiScreen.js) gets sent this structured
// questionnaire. Stage 3 (verifyQuestionnaireAnswers below) checks their
// self-reported answers against the JD before the job poster ever sees them.
export async function createQuestionnaire(applicationId) {
  const db = supabaseAdmin();
  const token = crypto.randomBytes(24).toString('hex');
  const { data, error } = await db
    .from('application_questionnaires')
    .insert({ application_id: applicationId, token, status: 'sent' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Deterministic checks (skills, experience, location/relocation) plus one AI
// judgment call for the two fuzzy fields (qualification, industry — phrasing
// varies too much for exact string matching). Mirrors the site's established
// pattern: numbers and hard rules are never left to the model, only the
// genuinely fuzzy comparison is.
const FUZZY_MATCH_PROMPT = `Compare a candidate's self-reported qualification and current industry
against a job's stated requirements. Judge on substance, not exact wording (e.g. "B.Tech CS" should
match a requirement of "Bachelor's in Engineering or related field"; "SaaS" should match "Software").
Respond as JSON only:
{
  "qualification_match": boolean,
  "industry_match": boolean,
  "reasoning": string (1-2 sentences, plain language, for an internal log — not shown to the candidate)
}
If the job doesn't state a requirement for one of these (null/empty), treat that one as a match by
default (nothing to fail against).`;

export async function verifyQuestionnaireAnswers(job, answers) {
  const reasons = [];

  // 1. All 3 mandatory technical skills must be confirmed — that's the point
  // of calling them mandatory.
  const skillsOk = (answers.technical_skill_answers || []).length > 0
    && (answers.technical_skill_answers || []).every((s) => s.has_it === true);
  if (!skillsOk) reasons.push('Did not confirm all mandatory technical skills.');

  // 2. Experience — only checked if the JD stated a minimum.
  let experienceOk = true;
  if (job.min_years_experience != null && answers.total_experience != null) {
    experienceOk = Number(answers.total_experience) >= Number(job.min_years_experience);
    if (!experienceOk) reasons.push(`Experience (${answers.total_experience}y) below the required ${job.min_years_experience}y.`);
  }

  // 3. Location — pass if it matches the job's location, or if it doesn't
  // but the candidate said they're open to relocating.
  let locationOk = true;
  if (job.location && answers.location) {
    const sameLocation = job.location.trim().toLowerCase() === answers.location.trim().toLowerCase();
    locationOk = sameLocation || !!answers.open_to_relocation;
    if (!locationOk) reasons.push('Location does not match and not open to relocation.');
  }

  // 4. Qualification + industry — fuzzy, needs AI judgment.
  let qualificationOk = true;
  let industryOk = true;
  let fuzzyReasoning = '';
  try {
    const context = `Job qualification requirement: ${job.qualification || 'not specified'}
Job industry: ${job.industry || 'not specified'}

Candidate's stated qualification: ${answers.qualification || 'not provided'}
Candidate's stated current industry: ${answers.current_industry || 'not provided'}`;
    const raw = await askClaude(FUZZY_MATCH_PROMPT, context, 400);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    qualificationOk = parsed.qualification_match !== false;
    industryOk = parsed.industry_match !== false;
    fuzzyReasoning = parsed.reasoning || '';
    if (!qualificationOk) reasons.push('Qualification does not match requirement.');
    if (!industryOk) reasons.push('Industry does not match requirement.');
  } catch (e) {
    // If the AI call fails, don't let it silently fail the candidate —
    // treat the fuzzy fields as a pass and rely on the deterministic checks.
    fuzzyReasoning = 'Qualification/industry AI check unavailable — not used to block.';
  }

  const passed = skillsOk && experienceOk && locationOk && qualificationOk && industryOk;
  const reasoning = passed
    ? 'All requirements confirmed.' + (fuzzyReasoning ? ` ${fuzzyReasoning}` : '')
    : reasons.join(' ') + (fuzzyReasoning ? ` ${fuzzyReasoning}` : '');

  return { passed, reasoning };
}

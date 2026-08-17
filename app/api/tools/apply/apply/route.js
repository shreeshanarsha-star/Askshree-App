import { NextResponse } from 'next/server';
import { getClientIp, checkAndRecordUsage, logToolRun } from '../../../../../lib/gating';
import { extractText } from '../../../../../lib/extractText';
import { screenCandidate } from '../../../../../lib/aiScreen';
import { sendEmail } from '../../../../../lib/email';
import { createQuestionnaire } from '../../../../../lib/questionnaire';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { askClaude } from '../../../../../lib/anthropic';
import { requireSiteKey } from '../../../../../lib/siteAuth';
import { getAuthedUser } from '../../../../../lib/authedUser';

// Auto-apply mode screens a candidate's CV against up to 30 recent job
// postings, ONE SEQUENTIAL AI CALL PER POSTING, then sends a questionnaire
// email for each qualifying match -- the heaviest sequential-AI loop in
// the codebase. 30 sequential Claude calls is a near-certain timeout risk
// on the platform default; 60s reduces but may not fully eliminate it for
// a full 30-posting scan -- worth revisiting (e.g. lowering the 30-posting
// cap, or raising this further) if auto-apply keeps failing on busy days.
export const maxDuration = 60;

const SHORTLIST_THRESHOLD = 70;
const SHORTLIST_CAP = 5;
const AUTO_APPLY_CAP = 10;

const PARSE_CANDIDATE_PROMPT = `Extract structured contact/profile info from this resume text.
Respond as JSON only: { "name": string, "email": string or null, "phone": string or null,
"location": string or null, "years_experience": number or null, "skills": array of strings }`;

// Candidate seekers reuse the existing site-wide free-use gate as-is (job posters
// have their own separate 3-free-postings counter in jobPostingGating.js).
export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const user = await getAuthedUser(req);
  const ip = getClientIp(req);
  const gate = await checkAndRecordUsage(ip, user?.id);
  if (!gate.allowed) {
    return NextResponse.json({ locked: true, message: gate.message }, { status: 402 });
  }
  await logToolRun(ip, 'apply_ai');

  const { resumeFile, jobPostingIds, mode, whatsappOptIn, termsAccepted } = await req.json();
  if (!termsAccepted) {
    return NextResponse.json({ error: 'You must accept the Terms & Conditions to apply.' }, { status: 400 });
  }
  if (!resumeFile?.base64) {
    return NextResponse.json({ error: 'Upload your CV.' }, { status: 400 });
  }

  const resumeText = await extractText(resumeFile.base64, resumeFile.mimeType);
  if (!resumeText || resumeText.trim().length < 20) {
    return NextResponse.json({ error: 'Could not read that CV. Try a different file.' }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Parse + dedupe the candidate. v1 dedup: exact match on email or phone
  // (both nearly always present from an uploaded CV). Fuzzy name+company+role
  // matching is a planned refinement once volume makes near-duplicates common.
  let parsed;
  try {
    const raw = await askClaude(PARSE_CANDIDATE_PROMPT, resumeText, 500);
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (e) {
    parsed = { name: 'Unknown', email: null, phone: null, location: null, years_experience: null, skills: [] };
  }

  let candidate = null;
  if (parsed.email || parsed.phone) {
    const orFilters = [];
    if (parsed.email) orFilters.push(`email.eq.${parsed.email}`);
    if (parsed.phone) orFilters.push(`phone.eq.${parsed.phone}`);
    const { data: existing } = await db.from('candidates').select('*').or(orFilters.join(',')).limit(1);
    if (existing?.length) candidate = existing[0];
  }

  if (candidate) {
    await db
      .from('candidates')
      .update({
        resume_text: resumeText,
        skills: parsed.skills || candidate.skills,
        years_experience: parsed.years_experience ?? candidate.years_experience,
        whatsapp_opt_in: !!whatsappOptIn || candidate.whatsapp_opt_in,
        terms_accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidate.id);
  } else {
    const { data: newCandidate, error } = await db
      .from('candidates')
      .insert({
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        location: parsed.location,
        years_experience: parsed.years_experience,
        skills: parsed.skills || [],
        resume_text: resumeText,
        source: mode === 'auto_apply' ? 'auto_apply' : 'job_posting_apply',
        whatsapp_opt_in: !!whatsappOptIn,
        terms_accepted_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    candidate = newCandidate;
  }

  // Decide which postings to screen against.
  let targetPostings = [];
  if (mode === 'auto_apply') {
    const { data } = await db
      .from('job_postings')
      .select('*')
      .eq('approved', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(30); // cost control — screen against the most recent 30 open roles, not the whole table
    targetPostings = data || [];
  } else {
    if (!Array.isArray(jobPostingIds) || jobPostingIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one job to apply to.' }, { status: 400 });
    }
    const { data } = await db.from('job_postings').select('*').in('id', jobPostingIds.slice(0, 10));
    targetPostings = data || [];
  }

  const results = [];
  for (const job of targetPostings) {
    try {
      const screen = await screenCandidate(job, {}, resumeText);
      const { data: application } = await db
        .from('applications')
        .insert({
          job_posting_id: job.id,
          candidate_id: candidate.id,
          match_score: screen.match_score,
          matched_skills: screen.matched_skills,
          missing_skills: screen.missing_skills,
          ai_evidence: screen.evidence,
          ai_cover_note: screen.cover_note,
          applied_via: mode === 'auto_apply' ? 'auto_apply' : 'search',
        })
        .select()
        .single();
      results.push({ jobId: job.id, jobTitle: job.title, company: job.company, matchScore: screen.match_score, application });
    } catch (e) {
      continue;
    }
  }

  // Auto-apply only keeps its top matches, capped.
  const applied = mode === 'auto_apply'
    ? results.sort((a, b) => b.matchScore - a.matchScore).slice(0, AUTO_APPLY_CAP)
    : results;

  // Clearing the CV-based bar doesn't reach the job poster directly anymore —
  // it earns the candidate a questionnaire, confirming the job's actual
  // requirements in their own words. Only a pass on that (see the
  // apply-questionnaire submit route) gets emailed to the poster.
  for (const r of applied) {
    if (r.matchScore >= SHORTLIST_THRESHOLD && candidate.email) {
      try {
        const q = await createQuestionnaire(r.application.id);
        await sendQuestionnaireEmail(candidate, r, q.token);
      } catch (e) {
        continue;
      }
    }
  }

  return NextResponse.json({ candidateId: candidate.id, applied });
}

async function sendQuestionnaireEmail(candidate, r, token) {
  const link = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://askshree.com'}/apply-questionnaire/${token}`;
  const html = `
    <p>Hi ${candidate.name || 'there'},</p>
    <p>Your CV looks like a strong fit for <strong>${r.jobTitle}</strong> at <strong>${r.company}</strong>.
       Before we pass your profile to the employer, a quick 2-minute questionnaire confirms you meet
       their actual requirements — it's what gets your profile in front of them, not lost in a pile.</p>
    <p><a href="${link}">${link}</a></p>
  `;
  return sendEmail({
    to: candidate.email,
    from: 'Ask Shree — Job Postings <Jobpostings@askshree.com>',
    subject: `Quick questionnaire — ${r.jobTitle} at ${r.company}`,
    html,
  });
}

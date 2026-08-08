import { NextResponse } from 'next/server';
import { getClientIp, checkAndRecordUsage, logToolRun } from '../../../../../lib/gating';
import { extractText } from '../../../../../lib/extractText';
import { screenCandidate } from '../../../../../lib/aiScreen';
import { sendEmail } from '../../../../../lib/email';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { askClaude } from '../../../../../lib/anthropic';

const SHORTLIST_THRESHOLD = 70;
const SHORTLIST_CAP = 5;
const AUTO_APPLY_CAP = 10;

const PARSE_CANDIDATE_PROMPT = `Extract structured contact/profile info from this resume text.
Respond as JSON only: { "name": string, "email": string or null, "phone": string or null,
"location": string or null, "years_experience": number or null, "skills": array of strings }`;

// Candidate seekers reuse the existing site-wide free-use gate as-is (job posters
// have their own separate 3-free-postings counter in jobPostingGating.js).
export async function POST(req) {
  const ip = getClientIp(req);
  const gate = await checkAndRecordUsage(ip);
  if (!gate.allowed) {
    return NextResponse.json({ locked: true, message: gate.message }, { status: 402 });
  }
  await logToolRun(ip, 'job_posting_apply');

  const { resumeFile, jobPostingIds, mode } = await req.json();
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

  // For every job just applied to, recompute and (re)send the shortlist if it
  // now has genuinely qualifying candidates — capped at 5, never sent if empty.
  for (const r of applied) {
    await maybeSendShortlist(db, r.jobId);
  }

  return NextResponse.json({ candidateId: candidate.id, applied });
}

async function maybeSendShortlist(db, jobPostingId) {
  const { data: job } = await db.from('job_postings').select('*').eq('id', jobPostingId).maybeSingle();
  if (!job || !job.approved || !job.email_verified || !job.poster_email) return;

  const { data: qualifying } = await db
    .from('applications')
    .select('*, candidates(name, email, phone)')
    .eq('job_posting_id', jobPostingId)
    .gte('match_score', SHORTLIST_THRESHOLD)
    .order('match_score', { ascending: false })
    .limit(SHORTLIST_CAP);

  if (!qualifying || qualifying.length === 0) return; // nobody qualifies yet — send nothing

  const html = `
    <p><strong>&#9733; Vetted by Shree</strong> &middot; AI-screened against your must-haves, qualification, and stated requirements.</p>
    <h2>Your shortlist for ${job.title} at ${job.company} — ${qualifying.length} match${qualifying.length > 1 ? 'es' : ''} ready</h2>
    ${qualifying.map((a) => `
      <div style="margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid #eee;">
        <p><strong>${a.candidates?.name || 'Candidate'}</strong> — ${a.match_score}% match</p>
        <p><em>Why they matched:</em> ${a.ai_evidence || ''}</p>
        <p>"${a.ai_cover_note || ''}"</p>
      </div>
    `).join('')}
    <p style="font-size:12px;color:#888;">Only genuinely qualifying candidates are sent — capped at top 5, or none if nobody clears the bar.</p>
  `;

  const result = await sendEmail({
    to: job.poster_email,
    subject: `Your shortlist for ${job.title} at ${job.company}`,
    html,
  });

  const ids = qualifying.map((a) => a.id);
  await db
    .from('applications')
    .update({ shortlisted: true, shortlist_sent_at: new Date().toISOString() })
    .in('id', ids);

  return result;
}

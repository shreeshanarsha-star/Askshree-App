import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { sendEmail } from '../../../../../lib/email';
import { verifyQuestionnaireAnswers } from '../../../../../lib/questionnaire';

const SHORTLIST_CAP = 5;

// Stage 3: candidate submits their self-reported answers, we verify against
// the JD, and only a pass results in the job poster ever seeing this
// candidate. No site-key gate — same reasoning as the GET route.
export async function POST(req, { params }) {
  const token = params.token;
  const db = supabaseAdmin();
  const body = await req.json();

  const { data: q } = await db
    .from('application_questionnaires')
    .select('*, applications(id, job_posting_id, candidate_id, candidates(name, email, phone))')
    .eq('token', token)
    .maybeSingle();

  if (!q) return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 });
  if (q.status === 'completed') {
    return NextResponse.json({ error: 'You already completed this questionnaire.', completed: true }, { status: 409 });
  }

  const { data: job } = await db.from('job_postings').select('*').eq('id', q.applications.job_posting_id).maybeSingle();
  if (!job) return NextResponse.json({ error: 'That job posting is no longer available.' }, { status: 404 });

  const answers = {
    technical_skill_answers: Array.isArray(body.technicalSkillAnswers) ? body.technicalSkillAnswers : [],
    good_to_have_answers: Array.isArray(body.goodToHaveAnswers) ? body.goodToHaveAnswers : [],
    location: body.location || null,
    ctc: body.ctc || null,
    total_experience: body.totalExperience != null ? Number(body.totalExperience) : null,
    qualification: body.qualification || null,
    current_industry: body.currentIndustry || null,
    open_to_relocation: !!body.openToRelocation,
  };

  const { passed, reasoning } = await verifyQuestionnaireAnswers(job, answers);

  await db
    .from('application_questionnaires')
    .update({
      technical_skill_answers: answers.technical_skill_answers,
      good_to_have_answers: answers.good_to_have_answers,
      location: answers.location,
      ctc: answers.ctc,
      total_experience: answers.total_experience,
      qualification: answers.qualification,
      current_industry: answers.current_industry,
      open_to_relocation: answers.open_to_relocation,
      status: 'completed',
      passed,
      verification_reasoning: reasoning,
      completed_at: new Date().toISOString(),
    })
    .eq('id', q.id);

  if (!passed) {
    return NextResponse.json({ ok: true, passed: false });
  }

  // Passed — check the cap and notify the job poster for this one candidate,
  // same "capped at 5, vetted" promise the tool already makes elsewhere.
  const { count } = await db
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('job_posting_id', job.id)
    .eq('shortlisted', true);

  await db.from('applications').update({ shortlisted: true, shortlist_sent_at: new Date().toISOString() }).eq('id', q.applications.id);

  if (job.approved && job.email_verified && job.poster_email && (count || 0) < SHORTLIST_CAP) {
    const candidate = q.applications.candidates;
    const html = `
      <p><strong>&#9733; Vetted by Shree</strong> &middot; AI-screened against your must-haves, then confirmed directly by the candidate against your full requirements.</p>
      <h2>New match for ${job.title} at ${job.company}</h2>
      <div style="margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid #eee;">
        <p><strong>${candidate?.name || 'Candidate'}</strong>${candidate?.email ? ` — ${candidate.email}` : ''}${candidate?.phone ? ` — ${candidate.phone}` : ''}</p>
        <p><em>Confirmed:</em> all mandatory skills, ${answers.qualification || 'qualification'}, ${answers.current_industry || 'industry'}, ${answers.total_experience ?? '—'}y experience, ${answers.location || 'location'}${answers.open_to_relocation ? ' (open to relocation)' : ''}.</p>
      </div>
      <p style="font-size:12px;color:#888;">Only candidates who confirm they meet your stated requirements reach you — capped at 5 per posting.</p>
    `;
    await sendEmail({
      to: job.poster_email,
      from: 'Ask Shree — Job Postings <Jobpostings@askshree.com>',
      subject: `New match for ${job.title} at ${job.company}`,
      html,
    });
  }

  return NextResponse.json({ ok: true, passed: true });
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

// Loads the candidate-facing questionnaire screen. No site-key gate here —
// this link is emailed directly to a candidate (external, not Shree), same
// reasoning as the assessment take-link and offer approval link: it's
// secured by its own unique token, not the shared site key.
export async function GET(req, { params }) {
  const token = params.token;
  const db = supabaseAdmin();

  const { data: q } = await db
    .from('application_questionnaires')
    .select('*, applications(id, job_posting_id, candidate_id, candidates(name))')
    .eq('token', token)
    .maybeSingle();

  if (!q) {
    return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 });
  }
  if (q.status === 'completed') {
    return NextResponse.json({ error: 'You already completed this questionnaire.', completed: true }, { status: 409 });
  }

  const { data: job } = await db
    .from('job_postings')
    .select('title, company, must_have_skills, good_to_have_skills, qualification, location')
    .eq('id', q.applications.job_posting_id)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: 'That job posting is no longer available.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    candidateName: q.applications.candidates?.name || '',
    job: {
      title: job.title,
      company: job.company,
      mustHaveSkills: job.must_have_skills || [],
      goodToHaveSkills: job.good_to_have_skills || [],
      qualification: job.qualification || '',
      location: job.location || '',
    },
  });
}

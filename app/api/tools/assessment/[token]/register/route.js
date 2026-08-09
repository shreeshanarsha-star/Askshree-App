import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase';
import { getAssessment } from '../../../../../../lib/assessments';
import { questionsForAssignment } from '../../../../../../lib/assessmentScoring';

// Candidate confirms their details + consent, then gets the question set back
// in THIS assignment's stable randomized order (seeded from question_seed, so a
// refresh mid-assessment doesn't reshuffle the questions under them).
export async function POST(req, { params }) {
  const token = params.token;
  const { name, email, contact, consent } = await req.json();

  if (!consent) {
    return NextResponse.json({ error: 'Consent is required to continue.' }, { status: 400 });
  }
  if (!name || !String(email || '').includes('@')) {
    return NextResponse.json({ error: 'Enter your name and a valid email.' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: a } = await db
    .from('assessment_assignments')
    .select('id, candidate_id, assessment_type, question_seed, status, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!a) return NextResponse.json({ error: 'This assessment link is not valid.' }, { status: 404 });
  if (new Date(a.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This assessment link has expired.' }, { status: 410 });
  }
  if (a.status === 'completed') {
    return NextResponse.json({ error: 'This assessment has already been completed.' }, { status: 409 });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  await db
    .from('assessment_assignments')
    .update({
      candidate_name: name,
      email: cleanEmail,
      contact: contact || null,
      status: a.status === 'pending' ? 'registered' : a.status,
      registered_at: new Date().toISOString(),
      consent_accepted_at: new Date().toISOString(),
    })
    .eq('id', a.id);

  // Push the candidate's own corrections back onto their candidate record.
  if (a.candidate_id) {
    await db
      .from('candidates')
      .update({
        name,
        email: cleanEmail,
        phone: contact || null,
        terms_accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', a.candidate_id);
  }

  const spec = getAssessment(a.assessment_type);
  return NextResponse.json({
    ok: true,
    assessment: {
      type: a.assessment_type,
      name: spec.name,
      fullName: spec.fullName,
      stem: spec.stem,
      scale: spec.scale,
    },
    questions: questionsForAssignment(a.assessment_type, Number(a.question_seed)),
  });
}

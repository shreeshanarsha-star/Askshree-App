import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { getAssessment } from '../../../../../lib/assessments';

// Loads the registration screen for a candidate's assessment link.
// Validates the token, checks expiry, and refuses a link that's already been used.
export async function GET(req, { params }) {
  const token = params.token;
  const db = supabaseAdmin();

  const { data: a } = await db
    .from('assessment_assignments')
    .select('id, candidate_name, email, contact, assessment_type, role_level, status, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!a) {
    return NextResponse.json({ error: 'This assessment link is not valid.' }, { status: 404 });
  }
  if (new Date(a.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This assessment link has expired. Ask the recruiter to send a new one.' }, { status: 410 });
  }
  if (a.status === 'completed') {
    return NextResponse.json({ error: 'This assessment has already been completed.', completed: true }, { status: 409 });
  }

  const spec = getAssessment(a.assessment_type);
  return NextResponse.json({
    ok: true,
    status: a.status,
    prefill: { name: a.candidate_name || '', email: a.email || '', contact: a.contact || '' },
    assessment: {
      type: a.assessment_type,
      name: spec.name,
      fullName: spec.fullName,
      questionCount: spec.questions.length,
      stem: spec.stem,
    },
    roleLevel: a.role_level,
  });
}

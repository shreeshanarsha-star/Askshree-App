import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase';
import { getAssessment } from '../../../../../../lib/assessments';
import { scoreAssessment } from '../../../../../../lib/assessmentScoring';

// Scores and stores a completed assessment.
//
// ONE ATTEMPT PER ASSIGNMENT, enforced here server-side: if the assignment is
// already 'completed' (or a result row already exists), this rejects. There is
// deliberately no self-service retake and no admin reset UI in this pass — to
// let someone retake, an admin manually deletes that assignment's rows from
// assessment_results and assessment_responses and sets status back to
// 'registered' in the Supabase SQL editor.
export async function POST(req, { params }) {
  const token = params.token;
  const { responses } = await req.json();

  const db = supabaseAdmin();
  const { data: a } = await db
    .from('assessment_assignments')
    .select('id, assessment_type, role_level, status, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!a) return NextResponse.json({ error: 'This assessment link is not valid.' }, { status: 404 });
  if (a.status === 'completed') {
    return NextResponse.json(
      { error: 'This assessment has already been submitted. Each link can only be used once.' },
      { status: 409 }
    );
  }
  if (new Date(a.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This assessment link has expired.' }, { status: 410 });
  }

  const { data: alreadyScored } = await db
    .from('assessment_results')
    .select('id')
    .eq('assignment_id', a.id)
    .maybeSingle();
  if (alreadyScored) {
    return NextResponse.json(
      { error: 'This assessment has already been submitted. Each link can only be used once.' },
      { status: 409 }
    );
  }

  const spec = getAssessment(a.assessment_type);
  if (!spec) return NextResponse.json({ error: 'Unknown assessment type.' }, { status: 500 });

  const valid = spec.questions.filter((q) => {
    const v = Number(responses?.[q.id]);
    return Number.isFinite(v) && v >= 1 && v <= 5;
  });
  if (valid.length < spec.questions.length) {
    return NextResponse.json(
      { error: `Please answer all ${spec.questions.length} questions before submitting (${spec.questions.length - valid.length} left).` },
      { status: 400 }
    );
  }

  await db.from('assessment_responses').insert(
    valid.map((q) => ({
      assignment_id: a.id,
      question_id: q.id,
      response: Math.round(Number(responses[q.id])),
    }))
  );

  const scored = scoreAssessment(a.assessment_type, responses);

  const { error: resErr } = await db.from('assessment_results').insert({
    assignment_id: a.id,
    assessment_type: a.assessment_type,
    dimension_scores: scored.dimensionScores,
    overall_score: scored.overallScore,
    band_label: scored.bandLabel,
  });
  if (resErr) return NextResponse.json({ error: resErr.message }, { status: 500 });

  await db
    .from('assessment_assignments')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', a.id);

  // Candidate-safe summary only. The per-dimension breakdown and the AI
  // narrative stay recruiter-side by design.
  return NextResponse.json({
    ok: true,
    assessmentName: spec.name,
    evaluative: spec.evaluative,
    overallScore: scored.overallScore,
    bandLabel: scored.bandLabel,
    questionCount: spec.questions.length,
  });
}

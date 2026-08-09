import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase';
import { getAssessment } from '../../../../../../lib/assessments';
import { generateNarrative } from '../../../../../../lib/assessmentAI';

// Full recruiter-facing result: dimension breakdown + AI narrative.
// The narrative is generated ONCE on first view and cached on the result row —
// it is never regenerated on subsequent views (both to keep the read cheap and
// so the interpretation a recruiter shared with a hiring manager doesn't quietly
// change underneath them).
export async function GET(req, { params }) {
  const db = supabaseAdmin();
  const assignmentId = params.assignmentId;

  const { data: a } = await db
    .from('assessment_assignments')
    .select('id, candidate_name, email, contact, role_level, assessment_type, job_role, status, created_at, completed_at')
    .eq('id', assignmentId)
    .maybeSingle();

  if (!a) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });

  const { data: result } = await db
    .from('assessment_results')
    .select('*')
    .eq('assignment_id', assignmentId)
    .maybeSingle();

  const spec = getAssessment(a.assessment_type);

  if (!result) {
    return NextResponse.json({
      ok: true,
      pending: true,
      candidate: { name: a.candidate_name, email: a.email, contact: a.contact, roleLevel: a.role_level },
      assessment: { type: a.assessment_type, name: spec?.name, fullName: spec?.fullName, evaluative: spec?.evaluative },
      status: a.status,
    });
  }

  let narrative = result.ai_narrative;
  if (!narrative) {
    try {
      narrative = await generateNarrative(
        a.assessment_type,
        spec.fullName,
        a.role_level,
        result.dimension_scores || [],
        result.overall_score,
        result.band_label
      );
      await db
        .from('assessment_results')
        .update({ ai_narrative: narrative, narrative_generated_at: new Date().toISOString() })
        .eq('id', result.id);
    } catch (e) {
      narrative = null; // never block the breakdown on the narrative failing
    }
  }

  return NextResponse.json({
    ok: true,
    pending: false,
    candidate: { name: a.candidate_name, email: a.email, contact: a.contact, roleLevel: a.role_level, jobRole: a.job_role },
    assessment: { type: a.assessment_type, name: spec?.name, fullName: spec?.fullName, evaluative: spec?.evaluative },
    status: a.status,
    completedAt: a.completed_at,
    dimensionScores: result.dimension_scores || [],
    overallScore: result.overall_score,
    bandLabel: result.band_label,
    narrative,
  });
}

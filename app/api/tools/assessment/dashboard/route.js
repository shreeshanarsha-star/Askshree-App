import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { getAssessment } from '../../../../../lib/assessments';

// Recruiter dashboard, scoped the same way the rest of the recruiter-side tools
// scope "mine": by the recruiter's own email (the one they assigned under),
// optionally narrowed further to a single job/role.
export async function GET(req) {
  const url = new URL(req.url);
  const recruiterEmail = (url.searchParams.get('email') || '').trim().toLowerCase();
  const jobRole = url.searchParams.get('jobRole');

  if (!recruiterEmail.includes('@')) {
    return NextResponse.json({ error: 'Enter your email to see your assessments.' }, { status: 400 });
  }

  const db = supabaseAdmin();
  let q = db
    .from('assessment_assignments')
    .select('id, candidate_name, email, contact, role_level, assessment_type, job_role, status, created_at, completed_at')
    .eq('recruiter_email', recruiterEmail)
    .order('created_at', { ascending: false })
    .limit(200);
  if (jobRole) q = q.eq('job_role', jobRole);

  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (rows || []).map((r) => r.id);
  let resultsById = {};
  if (ids.length) {
    const { data: results } = await db
      .from('assessment_results')
      .select('assignment_id, overall_score, band_label')
      .in('assignment_id', ids);
    for (const r of results || []) resultsById[r.assignment_id] = r;
  }

  const jobRoles = Array.from(new Set((rows || []).map((r) => r.job_role).filter(Boolean)));

  return NextResponse.json({
    ok: true,
    jobRoles,
    rows: (rows || []).map((r) => {
      const res = resultsById[r.id];
      const spec = getAssessment(r.assessment_type);
      return {
        id: r.id,
        name: r.candidate_name || '—',
        email: r.email,
        contact: r.contact || '—',
        roleLevel: r.role_level || '—',
        jobRole: r.job_role || null,
        assessmentType: r.assessment_type,
        assessmentName: spec ? spec.name : r.assessment_type,
        evaluative: spec ? spec.evaluative : true,
        status: r.status,
        // Big Five has no overall score by design — a trait profile isn't a number.
        score: res ? res.overall_score : null,
        band: res ? res.band_label : null,
        hasResult: !!res,
        createdAt: r.created_at,
        completedAt: r.completed_at,
      };
    }),
  });
}

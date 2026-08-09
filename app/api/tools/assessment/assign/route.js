import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getClientIp, logToolRun } from '../../../../../lib/gating';
import { checkAndRecordAssessmentUsage } from '../../../../../lib/assessmentGating';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { sendEmail } from '../../../../../lib/email';
import { getAssessment, ASSESSMENT_TYPES } from '../../../../../lib/assessments';
import { ROLE_LADDER, autoAssessmentForRole } from '../../../../../lib/assessments/roles';

// Creates the assignment, mints a token, and emails the candidate their link —
// same token pattern as job-postings/send-verification, adapted for a
// candidate-facing assessment rather than a poster confirming their own email.
export async function POST(req) {
  const ip = getClientIp(req);
  const gate = await checkAndRecordAssessmentUsage(ip);
  if (!gate.allowed) {
    return NextResponse.json({ locked: true, message: gate.message }, { status: 402 });
  }

  const body = await req.json();
  const {
    candidateId, candidateName, email, contact, roleLevel, assessmentType,
    assessmentSource, roleSource, recruiterEmail, jobRole,
  } = body;

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail.includes('@')) {
    return NextResponse.json({ error: 'A valid candidate email is required.' }, { status: 400 });
  }
  if (roleLevel && !ROLE_LADDER.includes(roleLevel)) {
    return NextResponse.json({ error: 'That role level is not on the ladder.' }, { status: 400 });
  }

  // Resolve the test: an explicit manual pick wins, otherwise derive from role.
  const type = assessmentType && ASSESSMENT_TYPES.includes(assessmentType)
    ? assessmentType
    : autoAssessmentForRole(roleLevel);
  const spec = getAssessment(type);
  if (!spec) return NextResponse.json({ error: 'Unknown assessment type.' }, { status: 400 });

  const db = supabaseAdmin();

  // De-dup against the existing candidates table if parse-cv didn't already
  // resolve a record (e.g. the recruiter typed the email in manually).
  let resolvedCandidateId = candidateId || null;
  if (!resolvedCandidateId) {
    const { data: match } = await db
      .from('candidates')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();
    if (match) {
      resolvedCandidateId = match.id;
      const update = { updated_at: new Date().toISOString() };
      if (candidateName) update.name = candidateName;
      if (contact) update.phone = contact;
      await db.from('candidates').update(update).eq('id', resolvedCandidateId);
    } else {
      const { data: created } = await db
        .from('candidates')
        .insert({
          name: candidateName || null,
          email: cleanEmail,
          phone: contact || null,
          source: 'assessment',
          passive_pool: true,
        })
        .select('id')
        .single();
      resolvedCandidateId = created?.id || null;
    }
  }

  const token = crypto.randomBytes(24).toString('hex');
  const questionSeed = crypto.randomBytes(4).readUInt32BE(0);

  const { data: assignment, error } = await db
    .from('assessment_assignments')
    .insert({
      candidate_id: resolvedCandidateId,
      recruiter_email: (recruiterEmail || '').trim().toLowerCase() || null,
      job_role: jobRole || null,
      assessment_type: type,
      assessment_source: assessmentSource === 'manual' ? 'manual' : 'auto',
      role_level: roleLevel || null,
      role_source: roleSource === 'manual' ? 'manual' : 'auto',
      candidate_name: candidateName || null,
      email: cleanEmail,
      contact: contact || null,
      token,
      question_seed: questionSeed,
      status: 'pending',
      created_ip: ip,
    })
    .select('id, token')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logToolRun(ip, 'assessment-ai');

  const origin = req.headers.get('origin') || 'https://askshree.com';
  const link = `${origin}/assessment/${token}`;

  const result = await sendEmail({
    to: cleanEmail,
    subject: `Your ${spec.name} assessment — Ask Shree`,
    html: `<p>Hello${candidateName ? ' ' + candidateName : ''},</p>
           <p>You've been invited to complete the <strong>${spec.fullName}</strong> as part of a hiring process.</p>
           <p>It's ${spec.questions.length} questions, untimed and self-paced — there's no countdown and nothing submits automatically. Answer honestly rather than how you think you're expected to answer.</p>
           <p><a href="${link}">${link}</a></p>
           <p>This link is unique to you and can be used once.</p>`,
  });

  // If Resend isn't configured yet, hand the link straight back so the flow
  // still works end to end (same fallback as the job-posting verification email).
  return NextResponse.json({
    ok: true,
    assignmentId: assignment.id,
    assessmentType: type,
    assessmentName: spec.name,
    questionCount: spec.questions.length,
    emailSent: result.sent,
    assessmentLink: result.sent ? undefined : link,
  });
}

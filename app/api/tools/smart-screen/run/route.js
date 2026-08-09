import { NextResponse } from 'next/server';
import { getClientIp, logToolRun } from '../../../../../lib/gating';
import { checkAndRecordSmartScreenUsage } from '../../../../../lib/smartScreenGating';
import { extractText } from '../../../../../lib/extractText';
import { structureCriteria, screenCandidateForBatch, summarizeBatch } from '../../../../../lib/smartScreen';
import { supabaseAdmin } from '../../../../../lib/supabase';

const MAX_CVS = 20;

// Screens up to 20 CVs at once against either an uploaded JD or manually
// entered criteria. Runs freely (no login, no email gate) — the dedicated
// free-batch counter is the only gate, same non-gating UX rule as the rest
// of the site. Email verification is a separate, non-blocking follow-up
// (see send-verification/verify-email) that only upgrades the batch's status
// for admin traceability, since these CVs are recruiter-sourced rather than
// self-submitted by the candidate.
export async function POST(req) {
  const ip = getClientIp(req);
  const gate = await checkAndRecordSmartScreenUsage(ip);
  if (!gate.allowed) {
    return NextResponse.json({ locked: true, message: gate.message }, { status: 402 });
  }

  const { mode, jdFile, manual, cvFiles } = await req.json();
  if (!Array.isArray(cvFiles) || cvFiles.length === 0) {
    return NextResponse.json({ error: 'Upload at least one CV.' }, { status: 400 });
  }
  const batch = cvFiles.slice(0, MAX_CVS);

  const db = supabaseAdmin();

  // Build the criteria object — same shape regardless of mode.
  let criteria;
  let rawJdText = null;
  if (mode === 'jd') {
    if (!jdFile?.base64) {
      return NextResponse.json({ error: 'Upload a job description.' }, { status: 400 });
    }
    rawJdText = await extractText(jdFile.base64, jdFile.mimeType);
    if (!rawJdText || rawJdText.trim().length < 20) {
      return NextResponse.json({ error: 'Could not read that JD. Try a different file.' }, { status: 400 });
    }
    try {
      criteria = await structureCriteria(rawJdText);
    } catch (e) {
      return NextResponse.json({ error: 'Could not structure that JD. Try again.' }, { status: 500 });
    }
  } else {
    criteria = {
      role_title: manual?.roleTitle || null,
      min_years_experience: manual?.minYears ? Number(manual.minYears) : null,
      ctc_budget: manual?.ctcBudget || null,
      must_have_skills: (manual?.mustHave || '').split(',').map((s) => s.trim()).filter(Boolean),
      good_to_have_skills: (manual?.goodToHave || '').split(',').map((s) => s.trim()).filter(Boolean),
      other_notes: manual?.notes || null,
    };
    if (!criteria.role_title && criteria.must_have_skills.length === 0) {
      return NextResponse.json({ error: 'Enter at least a role title or some must-have skills.' }, { status: 400 });
    }
  }

  const { data: screeningBatch, error: batchError } = await db
    .from('screening_batches')
    .insert({
      mode: mode === 'jd' ? 'jd' : 'manual',
      role_title: criteria.role_title,
      min_years_experience: criteria.min_years_experience,
      ctc_budget: criteria.ctc_budget,
      must_have_skills: criteria.must_have_skills,
      good_to_have_skills: criteria.good_to_have_skills,
      other_notes: criteria.other_notes,
      raw_jd_text: rawJdText,
      created_ip: ip,
    })
    .select()
    .single();
  if (batchError) return NextResponse.json({ error: batchError.message }, { status: 500 });

  const results = [];
  for (const f of batch) {
    try {
      const resumeText = await extractText(f.base64, f.mimeType);
      if (!resumeText || resumeText.trim().length < 20) continue;

      const screen = await screenCandidateForBatch(criteria, resumeText);
      const p = screen.profile || {};

      // Dedupe by exact email/phone match, same v1 approach used by the
      // Apply.ai apply flow. Fuzzy matching is a planned refinement.
      let candidate = null;
      if (p.email || p.phone) {
        const orFilters = [];
        if (p.email) orFilters.push(`email.eq.${p.email}`);
        if (p.phone) orFilters.push(`phone.eq.${p.phone}`);
        const { data: existing } = await db.from('candidates').select('*').or(orFilters.join(',')).limit(1);
        if (existing?.length) candidate = existing[0];
      }

      const profileFields = {
        name: p.name,
        location: p.location,
        years_experience: p.years_experience,
        current_company: p.current_company,
        current_designation: p.current_designation,
        current_ctc: p.current_ctc,
        expected_ctc: p.expected_ctc,
        notice_period: p.notice_period,
        resume_text: resumeText,
        updated_at: new Date().toISOString(),
      };

      if (candidate) {
        await db.from('candidates').update(profileFields).eq('id', candidate.id);
      } else {
        const { data: newCandidate, error } = await db
          .from('candidates')
          .insert({
            ...profileFields,
            email: p.email,
            phone: p.phone,
            skills: [...(screen.met_skills || []), ...(screen.missing_skills || [])],
            source: 'smart_screen',
            // No candidate is present to opt in here — WhatsApp stays off by
            // default, exactly like any other candidate record, so nobody
            // gets contacted without having agreed to it themselves.
            whatsapp_opt_in: false,
          })
          .select()
          .single();
        if (error) continue; // one bad CV shouldn't fail the whole batch
        candidate = newCandidate;
      }

      // Store the original file so "View CV" can open it later.
      try {
        const path = `${candidate.id}/${Date.now()}-${(f.name || 'cv').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const buffer = Buffer.from(f.base64, 'base64');
        const { error: uploadError } = await db.storage.from('cv-files').upload(path, buffer, {
          contentType: f.mimeType,
          upsert: true,
        });
        if (!uploadError) {
          await db.from('candidates').update({ resume_url: path }).eq('id', candidate.id);
        }
      } catch (e) {
        // File storage failing shouldn't fail the whole screening result.
      }

      const { data: resultRow } = await db
        .from('screening_results')
        .insert({
          batch_id: screeningBatch.id,
          candidate_id: candidate.id,
          fit_score: screen.fit_score,
          met_skills: screen.met_skills || [],
          missing_skills: screen.missing_skills || [],
          red_flags: screen.red_flags || [],
          achievement: screen.achievement,
          interview_questions: screen.interview_questions || [],
          next_action_label: screen.next_action?.label,
          next_action_tier: screen.next_action?.tier,
          justification: screen.justification,
        })
        .select()
        .single();

      results.push({
        candidateId: candidate.id,
        resultId: resultRow?.id,
        name: p.name,
        currentCompany: p.current_company,
        currentDesignation: p.current_designation,
        yearsExperience: p.years_experience,
        location: p.location,
        currentCtc: p.current_ctc,
        expectedCtc: p.expected_ctc,
        noticePeriod: p.notice_period,
        fitScore: screen.fit_score,
        metSkills: screen.met_skills || [],
        missingSkills: screen.missing_skills || [],
        redFlags: screen.red_flags || [],
        achievement: screen.achievement,
        interviewQuestions: screen.interview_questions || [],
        nextAction: screen.next_action,
        justification: screen.justification,
        hasFile: !!candidate.resume_url,
      });
    } catch (e) {
      continue; // one bad CV shouldn't fail the whole batch
    }
  }

  if (results.length === 0) {
    return NextResponse.json({ error: 'Could not screen any of the CVs provided. Try again.' }, { status: 500 });
  }

  // One extra AI call for the whole batch (not per CV) comparing the top few
  // candidates — skipped below 2 results since there's nothing to compare.
  let compareSummary = null;
  if (results.length >= 2) {
    try {
      const top = results.slice().sort((a, b) => b.fitScore - a.fitScore).slice(0, 3);
      compareSummary = await summarizeBatch(top);
    } catch (e) {
      compareSummary = null; // non-critical — results still return without it
    }
  }

  await logToolRun(ip, 'smart_screen');

  return NextResponse.json({
    batchId: screeningBatch.id,
    mustHaveSkills: criteria.must_have_skills,
    results,
    compareSummary,
    status: gate.status,
  });
}

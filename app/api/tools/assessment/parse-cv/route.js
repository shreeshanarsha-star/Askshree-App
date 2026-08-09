import { NextResponse } from 'next/server';
import { extractText } from '../../../../../lib/extractText';
import { extractCandidateFields } from '../../../../../lib/assessmentAI';
import { autoAssessmentForRole } from '../../../../../lib/assessments/roles';
import { supabaseAdmin } from '../../../../../lib/supabase';

// Step 1 of the Assign flow: read the CV, AI-extract the four "Auto" fields,
// and de-dup against the EXISTING candidates table (same table Apply.ai and
// Smart screen.ai write to) so an assessment attaches to the person's existing
// record instead of creating a parallel one.
//
// Not gated — the gate sits on the actual "Assign assessment" action, so a
// recruiter can look at what was extracted before spending a free use.
export async function POST(req) {
  const { file } = await req.json();
  if (!file?.base64) {
    return NextResponse.json({ error: 'Upload a CV first.' }, { status: 400 });
  }

  let cvText;
  try {
    cvText = await extractText(file.base64, file.mimeType);
  } catch (e) {
    return NextResponse.json({ error: 'Could not read that file. Try a PDF or Word doc.' }, { status: 400 });
  }
  if (!cvText || cvText.trim().length < 40) {
    return NextResponse.json({ error: 'That CV looks empty. Try a different file.' }, { status: 400 });
  }

  let fields;
  try {
    fields = await extractCandidateFields(cvText);
  } catch (e) {
    return NextResponse.json({ error: 'Could not read that CV. Try again.' }, { status: 500 });
  }

  const db = supabaseAdmin();
  let candidateId = null;
  let existing = false;

  if (fields.email) {
    const email = String(fields.email).trim().toLowerCase();
    const { data: match } = await db
      .from('candidates')
      .select('id, name, email, phone')
      .eq('email', email)
      .maybeSingle();

    if (match) {
      existing = true;
      candidateId = match.id;
      // Refresh the record with anything newer from this CV, without wiping
      // fields the CV didn't mention.
      const update = { resume_text: cvText, updated_at: new Date().toISOString() };
      if (fields.name) update.name = fields.name;
      if (fields.contact) update.phone = fields.contact;
      if (fields.location) update.location = fields.location;
      if (fields.current_designation) update.current_designation = fields.current_designation;
      if (fields.years_experience != null) update.years_experience = fields.years_experience;
      await db.from('candidates').update(update).eq('id', candidateId);
    } else {
      const { data: created } = await db
        .from('candidates')
        .insert({
          name: fields.name || null,
          email,
          phone: fields.contact || null,
          location: fields.location || null,
          current_designation: fields.current_designation || null,
          years_experience: fields.years_experience ?? null,
          resume_text: cvText,
          source: 'assessment',
          passive_pool: true,
        })
        .select('id')
        .single();
      candidateId = created?.id || null;
    }
  }

  return NextResponse.json({
    ok: true,
    candidateId,
    existingCandidate: existing,
    extracted: {
      name: fields.name || '',
      email: fields.email || '',
      contact: fields.contact || '',
      roleLevel: fields.role_level || '',
      // Big Five is never auto-assigned — only PULSE/IMPACT come out of the ladder.
      assessmentType: fields.role_level ? autoAssessmentForRole(fields.role_level) : '',
    },
  });
}

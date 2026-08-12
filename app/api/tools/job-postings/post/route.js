import { NextResponse } from 'next/server';
import { getClientIp } from '../../../../../lib/gating';
import { checkAndRecordPostingUsage } from '../../../../../lib/jobPostingGating';
import { structureJD } from '../../../../../lib/aiScreen';
import { extractText } from '../../../../../lib/extractText';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { requireSiteKey } from '../../../../../lib/siteAuth';
import { getAuthedUser } from '../../../../../lib/authedUser';

// Posts up to 10 JDs at once (PDF/Word, base64-encoded from the browser). AI
// structures each into a listing. No email is required at this step —
// postings go in as "pending", and the UI asks for email confirmation as a
// separate step right after, per the agreed flow.
export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const user = await getAuthedUser(req);
  const ip = getClientIp(req);
  const gate = await checkAndRecordPostingUsage(ip, user?.id);
  if (!gate.allowed) {
    return NextResponse.json({ locked: true, message: gate.message }, { status: 402 });
  }

  const { files, termsAccepted } = await req.json(); // [{ base64, mimeType, name }]
  if (!termsAccepted) {
    return NextResponse.json({ error: 'You must accept the Terms & Conditions to post a job.' }, { status: 400 });
  }
  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: 'Provide at least one job description file.' }, { status: 400 });
  }
  const batch = files.slice(0, 10);

  const db = supabaseAdmin();
  const created = [];
  for (const f of batch) {
    try {
      const jdText = await extractText(f.base64, f.mimeType);
      if (!jdText || jdText.trim().length < 20) continue;

      const structured = await structureJD(jdText);
      const { data, error } = await db
        .from('job_postings')
        .insert({
          company: structured.company,
          company_url: structured.company_url,
          location: structured.location,
          title: structured.title,
          must_have_skills: structured.must_have_skills,
          good_to_have_skills: structured.good_to_have_skills,
          qualification: structured.qualification,
          raw_jd_text: jdText,
          poster_email: '',
          posted_ip: ip,
          terms_accepted_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (!error) created.push(data);
    } catch (e) {
      // One bad JD shouldn't fail the whole batch — skip and continue.
      continue;
    }
  }

  if (created.length === 0) {
    return NextResponse.json({ error: 'Could not read any of the JDs provided. Try again.' }, { status: 500 });
  }

  return NextResponse.json({ postings: created, postingStatus: gate.status });
}

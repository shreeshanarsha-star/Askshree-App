import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { requireSiteKey } from '../../../../../lib/siteAuth';

// Saves a recruiter's manual correction to an AI-extracted field back to the
// candidate's record, so future searches benefit from the corrected data
// rather than the AI's original (possibly imperfect) extraction.
const ALLOWED_FIELDS = [
  'name', 'current_company', 'current_designation', 'years_experience',
  'location', 'current_ctc', 'expected_ctc', 'notice_period',
];

export async function PATCH(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const { candidateId, fields } = await req.json();
  if (!candidateId || !fields || typeof fields !== 'object') {
    return NextResponse.json({ error: 'candidateId and fields are required.' }, { status: 400 });
  }

  const update = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in fields) update[key] = fields[key];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided.' }, { status: 400 });
  }
  update.updated_at = new Date().toISOString();

  const db = supabaseAdmin();
  const { error } = await db.from('candidates').update(update).eq('id', candidateId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

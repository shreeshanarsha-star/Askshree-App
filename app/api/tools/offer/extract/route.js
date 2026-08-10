import { NextResponse } from 'next/server';
import { getClientIp, logToolRun } from '../../../../../lib/gating';
import { checkAndRecordOfferUsage } from '../../../../../lib/offerGating';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { extractText } from '../../../../../lib/extractText';
import { extractOfferDocuments, classifyOfferDocuments } from '../../../../../lib/offerAI';

const SUPPORTED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
]);

// Recruiter drags in everything they have on one candidate — appointment
// letter, payslip(s), education certs, CV, JD, budget approval, any order.
// We extract whatever text we can read, ask AI to sort each file into a doc
// type (no manual tagging from the recruiter), then hand the combined text
// to AI for the actual candidate/comp extraction and create a draft proposal.
export async function POST(req) {
  const ip = getClientIp(req);
  const gate = await checkAndRecordOfferUsage(ip);
  if (!gate.allowed) {
    return NextResponse.json({ locked: true, message: gate.message }, { status: 402 });
  }

  const body = await req.json();
  const files = Array.isArray(body.files) ? body.files : [];
  if (!files.length) {
    return NextResponse.json({ error: 'Upload at least one document.' }, { status: 400 });
  }

  // Pass 1 — read whatever text we can from each file.
  const readFiles = [];
  for (const f of files) {
    const supported = SUPPORTED_MIME.has(f.mimeType);
    let text = '';
    let needsReview = !supported;
    if (supported) {
      try {
        text = await extractText(f.base64, f.mimeType);
      } catch {
        needsReview = true;
      }
    }
    readFiles.push({ fileName: f.fileName || 'file', text, needsReview });
  }

  // Pass 2 — AI sorts every file into a doc type, so the recruiter never has
  // to tag anything themselves.
  let classified;
  try {
    classified = await classifyOfferDocuments(readFiles.map((f) => ({ fileName: f.fileName, text: f.text })));
  } catch {
    classified = readFiles.map((f) => ({ fileName: f.fileName, docType: 'other' }));
  }

  const db = supabaseAdmin();
  const docTexts = { cv: '', appointmentLetter: '', payslip: '', jd: '', budget: '' };
  const docRecords = [];

  readFiles.forEach((f, i) => {
    const docType = classified[i]?.docType || 'other';
    const key = { cv: 'cv', appointment_letter: 'appointmentLetter', payslip: 'payslip', jd: 'jd', budget: 'budget' }[docType];
    if (key && f.text) docTexts[key] += (docTexts[key] ? '\n\n---\n\n' : '') + f.text;
    docRecords.push({ doc_type: docType, file_name: f.fileName, extracted_text: f.text || null, needs_review: f.needsReview });
  });

  let extracted;
  try {
    extracted = await extractOfferDocuments(docTexts);
  } catch (e) {
    return NextResponse.json({ error: 'AI could not read those documents. Try again, or fill in the candidate manually.' }, { status: 500 });
  }

  // De-dup against the existing candidates table, same as Assessment.ai / Smart screen.ai.
  let candidateId = null;
  let existingCandidate = false;
  if (extracted.email) {
    const email = String(extracted.email).trim().toLowerCase();
    const { data: match } = await db.from('candidates').select('id').eq('email', email).maybeSingle();
    if (match) {
      existingCandidate = true;
      candidateId = match.id;
      await db.from('candidates').update({
        name: extracted.candidate_name || undefined,
        current_designation: extracted.current_designation || undefined,
        updated_at: new Date().toISOString(),
      }).eq('id', candidateId);
    } else {
      const { data: created } = await db.from('candidates').insert({
        name: extracted.candidate_name || null,
        email,
        current_designation: extracted.current_designation || null,
        source: 'offer',
        passive_pool: true,
      }).select('id').single();
      candidateId = created?.id || null;
    }
  }

  const { data: proposal, error } = await db.from('offer_proposals').insert({
    candidate_id: candidateId,
    candidate_name: extracted.candidate_name || null,
    current_designation: extracted.current_designation || null,
    proposed_designation: extracted.proposed_designation || null,
    grade: extracted.grade || null,
    division: extracted.division || null,
    department: extracted.department || null,
    notice_period: extracted.notice_period || null,
    role_title: extracted.role_title || null,
    budget_band: extracted.budget_band || null,
    currency: extracted.currency || 'INR',
    components: extracted.components || [],
    ip_address: ip,
    status: 'draft',
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (docRecords.length) {
    await db.from('offer_documents').insert(docRecords.map((d) => ({ ...d, proposal_id: proposal.id })));
  }

  await logToolRun(ip, 'offer-ai');

  const typeCounts = {};
  docRecords.forEach((d) => { typeCounts[d.doc_type] = (typeCounts[d.doc_type] || 0) + 1; });

  return NextResponse.json({
    ok: true,
    proposalId: proposal.id,
    candidateId,
    existingCandidate,
    extracted,
    documents: docRecords.map((d) => ({ docType: d.doc_type, fileName: d.file_name, needsReview: d.needs_review })),
    typeCounts,
  });
}

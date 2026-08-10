import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { sendEmail } from '../../../../../lib/email';

const APPROVAL_WINDOW_DAYS = 14;

function approverEmailHtml({ recruiterEmail, candidateName, roleTitle, ctc, currency, link, position, total }) {
  return `<p>Hello,</p>
    <p><strong>${recruiterEmail || 'A recruiter'}</strong> has requested your approval on a compensation proposal
    for <strong>${candidateName || 'a candidate'}</strong>${roleTitle ? ` — ${roleTitle}` : ''}.</p>
    <p>Proposed Total CTC: <strong>${currency} ${Number(total).toLocaleString('en-IN')}</strong></p>
    ${position > 1 ? `<p>This is approval ${position}, following sign-off from the earlier approver(s) in the chain.</p>` : ''}
    <p><a href="${link}">${link}</a></p>
    <p>This link is unique to you, works without logging in, and can be used once.</p>`;
}

// Creates (or re-creates, after "request changes") a sequential approval
// chain: one offer_approvals row per approver, in order. Only the first
// approver is emailed now — each later step gets emailed when the chain
// reaches them (see approve/[token]/route.js).
export async function POST(req) {
  const { proposalId, approverEmails, recruiterEmail } = await req.json();
  if (!proposalId) return NextResponse.json({ error: 'Missing proposalId.' }, { status: 400 });
  const emails = (approverEmails || []).map((e) => (e || '').trim()).filter((e) => e.includes('@'));
  if (!emails.length) return NextResponse.json({ error: 'Add at least one approver email.' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: p } = await db.from('offer_proposals').select('*').eq('id', proposalId).maybeSingle();
  if (!p) return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 });

  // Resending after "request changes" — retire any still-pending rows from
  // the previous round so old links stop working, then start a fresh chain.
  await db.from('offer_approvals')
    .update({ status: 'superseded' })
    .eq('proposal_id', proposalId)
    .eq('status', 'pending');

  const now = new Date();
  const expires = new Date(now.getTime() + APPROVAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = emails.map((email, i) => ({
    proposal_id: proposalId,
    sequence_order: i + 1,
    approver_email: email.toLowerCase(),
    token: crypto.randomBytes(24).toString('hex'),
    status: 'pending',
    expires_at: i === 0 ? expires.toISOString() : null, // later steps get a fresh window when the chain reaches them
  }));

  const { data: inserted, error } = await db.from('offer_approvals').insert(rows).select('*').order('sequence_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cleanRecruiterEmail = (recruiterEmail || p.recruiter_email || '').trim().toLowerCase() || null;
  await db.from('offer_proposals').update({
    status: 'pending_approval',
    current_approval_step: 1,
    recruiter_email: cleanRecruiterEmail,
    updated_at: now.toISOString(),
  }).eq('id', proposalId);

  const origin = req.headers.get('origin') || 'https://askshree.com';
  const first = inserted[0];
  const link = `${origin}/offer-ai/approve/${first.token}`;

  const result = await sendEmail({
    to: first.approver_email,
    subject: `Approval requested — ${p.candidate_name || 'candidate'} offer proposal`,
    html: approverEmailHtml({
      recruiterEmail: cleanRecruiterEmail, candidateName: p.candidate_name, roleTitle: p.proposed_designation || p.role_title,
      ctc: p.total_ctc_proposed, currency: p.currency, link, position: 1, total: p.total_ctc_proposed,
    }),
  });

  return NextResponse.json({
    ok: true,
    approverCount: inserted.length,
    firstApproverEmailSent: result.sent,
    firstApproverLink: result.sent ? undefined : link,
  });
}

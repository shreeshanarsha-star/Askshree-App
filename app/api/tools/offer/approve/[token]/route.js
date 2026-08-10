import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase';
import { sendEmail } from '../../../../../../lib/email';

const APPROVAL_WINDOW_DAYS = 14;

async function loadRow(db, token) {
  const { data: row } = await db.from('offer_approvals').select('*').eq('token', token).maybeSingle();
  if (!row) return { row: null, proposal: null };
  const { data: proposal } = await db.from('offer_proposals').select('*').eq('id', row.proposal_id).maybeSingle();
  return { row, proposal };
}

// GET — the approver's link. No login: the token itself is the credential,
// single-use and time-limited.
export async function GET(req, { params }) {
  const db = supabaseAdmin();
  const { row, proposal } = await loadRow(db, params.token);
  if (!row || !proposal) return NextResponse.json({ error: 'This approval link is invalid.' }, { status: 404 });

  if (row.status !== 'pending') {
    return NextResponse.json({ decided: true, status: row.status, candidateName: proposal.candidate_name });
  }
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    await db.from('offer_approvals').update({ status: 'expired' }).eq('id', row.id);
    return NextResponse.json({ decided: true, status: 'expired', candidateName: proposal.candidate_name });
  }

  const { count: totalSteps } = await db
    .from('offer_approvals')
    .select('id', { count: 'exact', head: true })
    .eq('proposal_id', proposal.id)
    .neq('status', 'superseded');

  return NextResponse.json({
    ok: true,
    position: row.sequence_order,
    totalSteps: totalSteps || row.sequence_order,
    proposal: {
      candidateName: proposal.candidate_name,
      currentDesignation: proposal.current_designation,
      proposedDesignation: proposal.proposed_designation,
      grade: proposal.grade,
      division: proposal.division,
      department: proposal.department,
      noticePeriod: proposal.notice_period,
      joiningDate: proposal.tentative_joining_date,
      currency: proposal.currency,
      hikePercent: proposal.hike_percent,
      components: proposal.components,
      grossCurrent: proposal.gross_current,
      grossProposed: proposal.gross_proposed,
      totalCtcCurrent: proposal.total_ctc_current,
      totalCtcProposed: proposal.total_ctc_proposed,
      otherBenefits: proposal.other_benefits,
      justification: proposal.justification,
      recruiterEmail: proposal.recruiter_email,
    },
  });
}

// POST — the approver's decision: approve (advances the chain or finalises
// it), reject, or request changes (both of the latter halt the chain and
// hand it back to the recruiter).
export async function POST(req, { params }) {
  const { decision, comment } = await req.json();
  if (!['approve', 'reject', 'request_changes'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid decision.' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { row, proposal } = await loadRow(db, params.token);
  if (!row || !proposal) return NextResponse.json({ error: 'This approval link is invalid.' }, { status: 404 });
  if (row.status !== 'pending') return NextResponse.json({ error: 'This has already been decided.' }, { status: 409 });
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    await db.from('offer_approvals').update({ status: 'expired' }).eq('id', row.id);
    return NextResponse.json({ error: 'This approval link has expired.' }, { status: 410 });
  }

  const now = new Date().toISOString();
  const origin = req.headers.get('origin') || 'https://askshree.com';
  const statusMap = { approve: 'approved', reject: 'rejected', request_changes: 'changes_requested' };
  await db.from('offer_approvals').update({ status: statusMap[decision], comment: comment || null, decided_at: now }).eq('id', row.id);

  if (decision === 'reject' || decision === 'request_changes') {
    await db.from('offer_proposals').update({ status: statusMap[decision], updated_at: now }).eq('id', proposal.id);
    if (proposal.recruiter_email) {
      await sendEmail({
        to: proposal.recruiter_email,
        subject: `${decision === 'reject' ? 'Rejected' : 'Changes requested'} — ${proposal.candidate_name || 'candidate'} offer proposal`,
        html: `<p>${row.approver_email} ${decision === 'reject' ? 'rejected' : 'requested changes to'} the proposal for <strong>${proposal.candidate_name || 'the candidate'}</strong>.</p>
               ${comment ? `<p>Comment: "${comment}"</p>` : ''}
               <p>Open Offer.ai to review and ${decision === 'reject' ? 'start a new proposal' : 'edit and resend'}.</p>`,
      });
    }
    return NextResponse.json({ ok: true, status: statusMap[decision] });
  }

  // decision === 'approve'
  const { data: next } = await db
    .from('offer_approvals')
    .select('*')
    .eq('proposal_id', proposal.id)
    .eq('sequence_order', row.sequence_order + 1)
    .neq('status', 'superseded')
    .maybeSingle();

  if (next) {
    const expires = new Date(Date.now() + APPROVAL_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await db.from('offer_approvals').update({ expires_at: expires }).eq('id', next.id);
    await db.from('offer_proposals').update({ current_approval_step: next.sequence_order, updated_at: now }).eq('id', proposal.id);

    const link = `${origin}/offer-ai/approve/${next.token}`;
    await sendEmail({
      to: next.approver_email,
      subject: `Approval requested — ${proposal.candidate_name || 'candidate'} offer proposal`,
      html: `<p>Hello,</p><p>The proposal for <strong>${proposal.candidate_name || 'a candidate'}</strong> has been approved by
        ${row.approver_email} and now needs your sign-off (step ${next.sequence_order}).</p>
        <p>Proposed Total CTC: <strong>${proposal.currency} ${Number(proposal.total_ctc_proposed).toLocaleString('en-IN')}</strong></p>
        <p><a href="${link}">${link}</a></p><p>This link is unique to you and can be used once.</p>`,
    });
    return NextResponse.json({ ok: true, status: 'approved', chainAdvanced: true, nextApprover: next.approver_email });
  }

  // Final approver — proposal is fully approved.
  await db.from('offer_proposals').update({ status: 'approved', updated_at: now }).eq('id', proposal.id);
  if (proposal.recruiter_email) {
    const link = `${origin}/tools/offer-ai/proposal/${proposal.id}`;
    await sendEmail({
      to: proposal.recruiter_email,
      subject: `Approved — ${proposal.candidate_name || 'candidate'} offer proposal`,
      html: `<p>Good news — <strong>${proposal.candidate_name || 'the candidate'}</strong>'s proposal has been fully approved.</p>
             <p><a href="${link}">${link}</a> — download it from here.</p>`,
    });
  }
  return NextResponse.json({ ok: true, status: 'approved', chainComplete: true });
}

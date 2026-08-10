import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { offerChatReply } from '../../../../../lib/offerAI';

function buildContext(p) {
  const compLines = (p.components || [])
    .map((c) => `- ${c.label}: current ₹${c.current_monthly ?? '?'}/mo, proposed ₹${c.proposed_monthly ?? '?'}/mo`)
    .join('\n');
  return `Candidate: ${p.candidate_name || 'unknown'}
Current designation: ${p.current_designation || 'unknown'} -> Proposed: ${p.proposed_designation || 'unknown'}
Currency: ${p.currency}
Total CTC — current: ${p.total_ctc_current ?? '?'}, proposed: ${p.total_ctc_proposed ?? '?'} (hike: ${p.hike_percent ?? '?'}%)
Approved budget band: ${p.budget_band || 'not specified'}
Components:
${compLines || '(none)'}`;
}

// Chat-style Q&A that runs before the justification is finalised: AI researches
// current market comp (web search) and either asks the recruiter one
// clarifying question or drafts the justification once it has enough.
export async function POST(req) {
  const { proposalId, message } = await req.json();
  if (!proposalId) return NextResponse.json({ error: 'Missing proposalId.' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: p } = await db.from('offer_proposals').select('*').eq('id', proposalId).maybeSingle();
  if (!p) return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 });

  const history = Array.isArray(p.justification_chat) ? [...p.justification_chat] : [];
  if (message && message.trim()) {
    history.push({ role: 'recruiter', text: message.trim(), created_at: new Date().toISOString() });
  }

  let reply;
  try {
    reply = await offerChatReply({ context: buildContext(p), history });
  } catch (e) {
    return NextResponse.json({ error: 'AI ran into an issue researching this — try again in a moment.' }, { status: 500 });
  }

  history.push({ role: 'ai', text: reply.text, created_at: new Date().toISOString() });

  const update = { justification_chat: history, updated_at: new Date().toISOString() };
  if (reply.type === 'justification') update.justification = reply.text;

  await db.from('offer_proposals').update(update).eq('id', proposalId);

  return NextResponse.json({
    ok: true,
    chat: history,
    justificationDrafted: reply.type === 'justification',
    justification: reply.type === 'justification' ? reply.text : undefined,
  });
}

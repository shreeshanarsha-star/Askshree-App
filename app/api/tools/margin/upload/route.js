import { NextResponse } from 'next/server';
import { requireMarginKey } from '../../../../../lib/marginAuth';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { sendEmail } from '../../../../../lib/email';
import { parseSalesCsv, parseCostCsv, computeMargins, generateRecommendation } from '../../../../../lib/marginAI';

// Recomputes margin for every product from a fresh sales + cost export.
// Deterministic math (see lib/marginAI.js) — AI is only used to draft the
// recommendation text for whatever's newly flagged. Nothing here executes a
// price change; it only records and, for new leaks, alerts.
export async function POST(req) {
  const denied = requireMarginKey(req);
  if (denied) return denied;

  const { salesCsv, costCsv, sourceLabel } = await req.json();
  if (!salesCsv || !costCsv) {
    return NextResponse.json({ error: 'Upload both a sales export and a cost export.' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const salesRows = parseSalesCsv(salesCsv);
  const costRows = parseCostCsv(costCsv);
  if (!salesRows.length || !costRows.length) {
    return NextResponse.json({ error: 'Could not find recognisable product/revenue or product/cost columns in those files.' }, { status: 400 });
  }

  const { data: previousProducts } = await db.from('margin_products').select('*');
  const computed = computeMargins(salesRows, costRows, previousProducts || []);

  const { data: upload, error: uploadErr } = await db.from('margin_uploads').insert({
    source_label: sourceLabel || null,
    sales_row_count: salesRows.length,
    cost_row_count: costRows.length,
    status: 'processing',
  }).select('id').single();
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const newlyFlagged = [];
  for (const p of computed) {
    const { data: saved } = await db.from('margin_products').upsert({
      product_name: p.product_name,
      customer_name: p.customer_name,
      category: p.category,
      revenue_monthly: p.revenue_monthly,
      cost_monthly: p.cost_monthly,
      margin_pct: p.margin_pct,
      prev_margin_pct: p.prev_margin_pct,
      cost_breakdown: p.cost_breakdown,
      root_cause: p.root_cause,
      status: p.status,
      first_flagged_at: p.newly_flagged ? new Date().toISOString() : undefined,
      last_upload_id: upload.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'product_name,customer_name' }).select('id').single();

    if (p.newly_flagged && saved) newlyFlagged.push({ id: saved.id, ...p });
  }

  // Draft a recommendation for each newly-flagged product and, for actual
  // leaks (not just "watch"), send an alert — this is the "before the P&L
  // close" part of the pitch, so it can't be something you have to remember
  // to go check.
  const alerted = [];
  for (const p of newlyFlagged) {
    try {
      const rec = await generateRecommendation(p);
      await db.from('margin_recommendations').insert({
        product_id: p.id,
        recommendation_text: rec.recommendation_text,
        action_type: rec.action_type,
        expected_impact_monthly: rec.expected_impact_monthly,
      });
    } catch {
      // Recommendation drafting failing shouldn't block the flag itself.
    }
    if (p.status === 'leak') alerted.push(p);
  }

  if (alerted.length) {
    const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'shreesha.narsha@gmail.com';
    await sendEmail({
      to: adminEmail,
      subject: `Margin.ai: ${alerted.length} product${alerted.length > 1 ? 's' : ''} newly selling below cost`,
      html: `<p>${alerted.length} product${alerted.length > 1 ? 's are' : ' is'} now selling below cost:</p>
        <ul>${alerted.map((p) => `<li><b>${p.product_name}</b>${p.customer_name ? ` (${p.customer_name})` : ''} — margin ${p.margin_pct}%, root cause: ${p.root_cause || 'mixed'}</li>`).join('')}</ul>
        <p>Open Margin.ai to review the recommendation for each.</p>`,
    });
  }

  await db.from('margin_uploads').update({ status: 'done' }).eq('id', upload.id);

  return NextResponse.json({
    ok: true,
    uploadId: upload.id,
    productsAnalysed: computed.length,
    newlyFlagged: newlyFlagged.length,
    alertsSent: alerted.length,
  });
}

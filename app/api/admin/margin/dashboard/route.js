import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/requireAdmin';
import { supabaseAdmin } from '../../../../../lib/supabase';

export async function GET(req) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const db = supabaseAdmin();
  const { data: products, error } = await db.from('margin_products').select('*').order('margin_pct', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const totalRevenue = products.reduce((s, p) => s + (p.revenue_monthly || 0), 0);
  const totalCost = products.reduce((s, p) => s + (p.cost_monthly || 0), 0);
  const overallMarginPct = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : null;
  const leaking = products.filter((p) => p.status === 'leak');
  const watching = products.filter((p) => p.status === 'watch');
  const revenueBelowCost = leaking.reduce((s, p) => s + (p.revenue_monthly || 0), 0);

  // Root cause driver summary — which cost components show up most often
  // across everything currently flagged.
  const driverCounts = {};
  [...leaking, ...watching].forEach((p) => {
    if (p.root_cause) {
      const key = p.root_cause.replace(/\s*\+\d+%$/, '');
      driverCounts[key] = driverCounts[key] || { count: 0, products: [] };
      driverCounts[key].count += 1;
      driverCounts[key].products.push(p.product_name);
    }
  });
  const drivers = Object.entries(driverCounts)
    .map(([name, d]) => ({ name, count: d.count, products: d.products.slice(0, 4) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const { data: lastUpload } = await db.from('margin_uploads').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();

  return NextResponse.json({
    overallMarginPct,
    totalRevenue,
    revenueBelowCost,
    leakCount: leaking.length,
    watchCount: watching.length,
    leaks: [...leaking, ...watching].slice(0, 25),
    drivers,
    lastUpload,
    hasData: products.length > 0,
  });
}

import { askClaudeWithSearch } from './anthropic';

// --- CSV parsing -----------------------------------------------------------
// Small, dependency-free CSV parser (handles quoted fields with commas).
// Deliberately lenient about column names — recruiters/finance teams export
// from many different systems and we don't want a header mismatch to be a
// dead end.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else if (c === '"') { inQuotes = true; }
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else { field += c; }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
    return obj;
  });
}

function findCol(obj, candidates) {
  for (const c of candidates) if (obj[c] !== undefined) return c;
  return null;
}

function num(v) {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

// Sales CSV: expects columns like product/product name, customer (optional),
// category (optional), revenue/monthly revenue/sales.
export function parseSalesCsv(text) {
  const rows = parseCsv(text);
  return rows.map((r) => {
    const productCol = findCol(r, ['product', 'product name', 'sku', 'item']);
    const customerCol = findCol(r, ['customer', 'customer name', 'account']);
    const categoryCol = findCol(r, ['category', 'segment']);
    const revenueCol = findCol(r, ['revenue', 'monthly revenue', 'sales', 'amount']);
    return {
      product: (r[productCol] || '').trim(),
      customer: customerCol ? (r[customerCol] || '').trim() : '',
      category: categoryCol ? (r[categoryCol] || '').trim() : '',
      revenue: num(r[revenueCol]),
    };
  }).filter((r) => r.product && r.revenue);
}

// Cost CSV: expects product, cost component (raw material/freight/processing/
// packaging — free text, we don't enforce a fixed list), and a cost amount.
export function parseCostCsv(text) {
  const rows = parseCsv(text);
  return rows.map((r) => {
    const productCol = findCol(r, ['product', 'product name', 'sku', 'item']);
    const componentCol = findCol(r, ['component', 'cost component', 'cost head', 'category']);
    const costCol = findCol(r, ['cost', 'monthly cost', 'amount']);
    return {
      product: (r[productCol] || '').trim(),
      component: componentCol ? (r[componentCol] || '').trim() || 'Cost' : 'Cost',
      cost: num(r[costCol]),
    };
  }).filter((r) => r.product && r.cost);
}

// --- Margin computation (deterministic — no AI in the math) ----------------
// Cost is read per PRODUCT (not per customer), because cost registers are
// almost never broken out by customer. We derive a cost-as-%-of-revenue rate
// per product from the total cost vs total revenue across all customers, then
// apply that rate to each customer's revenue. This is a documented
// simplification — it assumes cost per unit doesn't vary by customer, which
// is usually true unless customers are on materially different fulfillment
// terms. Flagged clearly so it isn't a silent assumption.
export function computeMargins(salesRows, costRows, previousProducts) {
  const prevByKey = {};
  (previousProducts || []).forEach((p) => { prevByKey[`${p.product_name}||${p.customer_name || ''}`] = p; });

  // Aggregate cost by product.
  const costByProduct = {};
  costRows.forEach((r) => {
    if (!costByProduct[r.product]) costByProduct[r.product] = {};
    costByProduct[r.product][r.component] = (costByProduct[r.product][r.component] || 0) + r.cost;
  });

  // Aggregate revenue by product (for the cost-rate) and by product+customer.
  const revenueByProduct = {};
  const groups = {}; // key: product||customer
  salesRows.forEach((r) => {
    revenueByProduct[r.product] = (revenueByProduct[r.product] || 0) + r.revenue;
    const key = `${r.product}||${r.customer || ''}`;
    if (!groups[key]) groups[key] = { product: r.product, customer: r.customer || '', category: r.category, revenue: 0 };
    groups[key].revenue += r.revenue;
  });

  const results = Object.values(groups).map((g) => {
    const components = costByProduct[g.product] || {};
    const totalProductCost = Object.values(components).reduce((s, v) => s + v, 0);
    const totalProductRevenue = revenueByProduct[g.product] || 0;
    const costRate = totalProductRevenue > 0 ? totalProductCost / totalProductRevenue : 0;
    const impliedCost = g.revenue * costRate;
    const marginPct = g.revenue > 0 ? ((g.revenue - impliedCost) / g.revenue) * 100 : 0;

    const prev = prevByKey[`${g.product}||${g.customer}`];
    const prevComponents = prev?.cost_breakdown || [];
    const costBreakdown = Object.entries(components).map(([component, amount]) => {
      const prevAmount = prevComponents.find((c) => c.component === component)?.amount;
      return { component, amount: Math.round(amount * (g.revenue / (totalProductRevenue || 1))), prevAmount: prevAmount ?? null };
    });

    // Root cause = whichever component moved up the most (% terms), deterministic.
    let rootCause = null;
    let maxIncrease = 0;
    costBreakdown.forEach((c) => {
      if (c.prevAmount && c.prevAmount > 0) {
        const pct = ((c.amount - c.prevAmount) / c.prevAmount) * 100;
        if (pct > maxIncrease) { maxIncrease = pct; rootCause = `${c.component} +${pct.toFixed(0)}%`; }
      }
    });

    const status = marginPct < 0 ? 'leak' : marginPct < 8 ? 'watch' : 'healthy';

    return {
      product_name: g.product,
      customer_name: g.customer || null,
      category: g.category || null,
      revenue_monthly: Math.round(g.revenue),
      cost_monthly: Math.round(impliedCost),
      margin_pct: Math.round(marginPct * 10) / 10,
      prev_margin_pct: prev?.margin_pct ?? null,
      cost_breakdown: costBreakdown,
      root_cause: rootCause,
      status,
      newly_flagged: status !== 'healthy' && (!prev || prev.status === 'healthy'),
    };
  });

  return results;
}

// --- AI recommendation ------------------------------------------------------
const RECOMMEND_PROMPT = `You are a pricing/procurement analyst helping a CEO decide what to do about a
product whose margin has gone negative or is dangerously thin. You have web search — use it to check
whether competitors in this product category have moved price recently, and whether the named cost
driver (e.g. a raw material) has known supply/price issues right now. You are given the product,
category, current margin, revenue, cost breakdown, and the root cause (whichever cost component moved
most).

Decide the single best recommended action: "price_increase" (with a specific % — usually 5-15%, tied
to what you found on competitor pricing so it's defensible), "supplier_switch" (if the cost driver is a
single raw material with known alternate sources), "discontinue" (only if neither pricing nor sourcing
can realistically restore positive margin), or "monitor" (if the situation looks temporary/seasonal).

Respond as JSON only (no markdown fences, no prose):
{
  "action_type": "price_increase" | "supplier_switch" | "discontinue" | "monitor",
  "price_change_pct": number or null (only for price_increase),
  "recommendation_text": string (3-4 sentences, cite what you found, reference the actual numbers given, written for a CEO to act on directly)
}`;

export async function generateRecommendation(product) {
  const compLines = (product.cost_breakdown || [])
    .map((c) => `- ${c.component}: ₹${c.amount}/mo${c.prevAmount ? ` (was ₹${c.prevAmount})` : ''}`)
    .join('\n');
  const context = `Product: ${product.product_name}${product.customer_name ? ` (customer: ${product.customer_name})` : ' (all customers)'}
Category: ${product.category || 'not specified'}
Current margin: ${product.margin_pct}%${product.prev_margin_pct != null ? ` (was ${product.prev_margin_pct}%)` : ''}
Monthly revenue: ₹${product.revenue_monthly}
Monthly cost: ₹${product.cost_monthly}
Root cause: ${product.root_cause || 'not clearly isolated — multiple components moved'}
Cost breakdown:
${compLines || '(no component detail)'}`;

  const raw = await askClaudeWithSearch(RECOMMEND_PROMPT, context, 900);
  const match = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse((match ? match[0] : raw).replace(/```json|```/g, '').trim());

  const expectedImpact = parsed.action_type === 'price_increase' && parsed.price_change_pct
    ? Math.round(product.revenue_monthly * (parsed.price_change_pct / 100))
    : parsed.action_type === 'discontinue'
      ? Math.round(product.revenue_monthly - product.cost_monthly) * -1 // cost saved by stopping the bleed
      : null;

  return { ...parsed, expected_impact_monthly: expectedImpact };
}

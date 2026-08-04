import { createClient } from '@supabase/supabase-js';

// Server-only client using the service role key — never expose this key to the browser.
// Assumes SUPABASE_SERVICE_ROLE_KEY is already set in your Vercel env vars.
function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET(request) {
  const supabase = supabaseAdmin();
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get('days') || '14', 10), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [ipUsage, toolRuns, subscribers] = await Promise.all([
    supabase.from('ip_usage').select('ip_address, status, first_used_at, last_used_at'),
    supabase.from('tool_runs').select('tool, ip_address, created_at').gte('created_at', since),
    supabase.from('subscribers').select('id, created_at, status').gte('created_at', since),
  ]);

  if (ipUsage.error) return Response.json({ error: ipUsage.error.message }, { status: 500 });
  if (toolRuns.error) return Response.json({ error: toolRuns.error.message }, { status: 500 });
  if (subscribers.error) return Response.json({ error: subscribers.error.message }, { status: 500 });

  const ipRows = ipUsage.data || [];
  const runs = toolRuns.data || [];
  const subs = subscribers.data || [];

  // Counts by status: expects values like 'free', 'grace', 'blocked', 'whitelisted'
  // stored in ip_usage.status. Adjust the keys below if your app uses different labels.
  const statusCounts = ipRows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const toolCounts = runs.reduce((acc, r) => {
    acc[r.tool] = (acc[r.tool] || 0) + 1;
    return acc;
  }, {});

  // Daily trend for the visitor/usage line chart
  const trendMap = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    trendMap[d.toISOString().slice(0, 10)] = 0;
  }
  runs.forEach((r) => {
    const key = r.created_at.slice(0, 10);
    if (key in trendMap) trendMap[key]++;
  });

  // 7 (Mon-Sun) x 24 hour grid for the activity heatmap, UTC-based
  const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
  runs.forEach((r) => {
    const d = new Date(r.created_at);
    const day = (d.getUTCDay() + 6) % 7; // shift so 0 = Monday
    const hour = d.getUTCHours();
    heatmap[day][hour]+

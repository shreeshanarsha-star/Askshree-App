import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = supabaseAdmin();
  const results = {};
  for (const table of ['job_postings', 'candidates', 'applications', 'email_verifications', 'job_posting_usage', 'ip_usage', 'chatbot_sources', 'chat_logs', 'smart_source_searches', 'smart_source_candidates', 'subscribers', 'tool_runs', 'repository_sources', 'homepage_likes']) {
    const { data, error } = await db.from(table).select('*').limit(1);
    results[table] = error ? { error: error.message } : { ok: true, rows: data.length };
  }
  return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
}

import { supabaseAdmin } from '../lib/supabase';

export const dynamic = 'force-dynamic';

// Native Next.js sitemap -- served at /sitemap.xml. Includes every open job
// posting so Google (and any other crawler) can discover /jobs/[id] pages
// without needing the Indexing API. Static marketing pages are listed too
// since we had no sitemap at all before this.
export default async function sitemap() {
  const db = supabaseAdmin();
  const { data: postings } = await db
    .from('job_postings')
    .select('id, created_at, expires_at')
    .eq('approved', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1000);

  const jobEntries = (postings || []).map((p) => ({
    url: `https://askshree.com/jobs/${p.id}`,
    lastModified: p.created_at,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const staticEntries = [
    { url: 'https://askshree.com', changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://askshree.com/jobs', changeFrequency: 'daily', priority: 0.9 },
    { url: 'https://askshree.com/terms', changeFrequency: 'monthly', priority: 0.3 },
  ];

  return [...staticEntries, ...jobEntries];
}

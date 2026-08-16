import { supabaseAdmin } from '../../lib/supabase';
import ThemeShell from '../../components/ThemeShell';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Open roles — Ask Shree',
  description: 'Browse open job postings on Ask Shree — AI-native recruiting toolkit.',
};

async function getOpenPostings() {
  const db = supabaseAdmin();
  const { data } = await db
    .from('job_postings')
    .select('id, title, company, location, created_at, expires_at')
    .eq('approved', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(200);
  return data || [];
}

export default async function JobsIndexPage() {
  const postings = await getOpenPostings();

  return (
    <ThemeShell>
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '44px 56px 80px', maxWidth: 720, margin: '0 auto', color: 'var(--cream)' }}>
        <div className="eyebrow">Open roles</div>
        <h1 className="serif" style={{ fontSize: 24, margin: '8px 0 20px' }}>{postings.length} open role{postings.length === 1 ? '' : 's'}</h1>

        {postings.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--slate)' }}>No open roles right now — check back soon.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {postings.map((p) => (
            <a
              key={p.id}
              href={`/jobs/${p.id}`}
              style={{
                display: 'block', padding: '16px 0', borderBottom: '1px solid var(--line)',
                textDecoration: 'none', color: 'inherit',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cream)' }}>{p.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--slate)', marginTop: 3 }}>
                {[p.company, p.location].filter(Boolean).join(' · ')}
              </div>
            </a>
          ))}
        </div>
      </div>
    </ThemeShell>
  );
}

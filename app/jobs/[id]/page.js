import { notFound } from 'next/navigation';
import { supabaseAdmin } from '../../../lib/supabase';
import { buildJobPostingSchema } from '../../../lib/jobPostingSchema';
import ThemeShell from '../../../components/ThemeShell';

// Public, unauthenticated job detail page -- no site key, no login. This is
// the actual page Google for Jobs indexes: it needs to be crawlable and
// readable with nothing gating it, per Google's structured-data requirements.
// Only approved + not-yet-expired postings resolve; everything else 404s.
async function getPosting(id) {
  const db = supabaseAdmin();
  const { data } = await db
    .from('job_postings')
    .select('id, title, company, company_url, location, must_have_skills, good_to_have_skills, qualification, min_years_experience, industry, ctc_budget, created_at, expires_at, approved')
    .eq('id', id)
    .eq('approved', true)
    .maybeSingle();
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  return data;
}

export async function generateMetadata({ params }) {
  const posting = await getPosting(params.id);
  if (!posting) return { title: 'Job not found — Ask Shree' };
  return {
    title: `${posting.title} at ${posting.company} — Ask Shree`,
    description: `${posting.title} in ${posting.location || 'India'}. ${(posting.must_have_skills || []).slice(0, 5).join(', ')}.`,
  };
}

export default async function JobDetailPage({ params }) {
  const posting = await getPosting(params.id);
  if (!posting) notFound();

  const pageUrl = `https://askshree.com/jobs/${posting.id}`;
  const schema = buildJobPostingSchema(posting, pageUrl);
  const mustHave = posting.must_have_skills || [];
  const goodToHave = posting.good_to_have_skills || [];

  return (
    <ThemeShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '44px 56px 80px', maxWidth: 720, margin: '0 auto', color: 'var(--cream)' }}>
        <div className="eyebrow">{posting.company || 'Open role'}</div>
        <h1 className="serif" style={{ fontSize: 26, margin: '8px 0 6px' }}>{posting.title}</h1>
        <div style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 24 }}>
          {[posting.location, posting.industry].filter(Boolean).join(' · ')}
        </div>

        <div style={{ fontSize: 13.5, color: 'var(--cream)', lineHeight: 1.8 }}>
          {posting.qualification && (
            <p><b style={{ color: 'var(--amber)' }}>Qualification: </b>{posting.qualification}</p>
          )}
          {posting.min_years_experience != null && (
            <p><b style={{ color: 'var(--amber)' }}>Experience: </b>{posting.min_years_experience}+ years</p>
          )}
          {mustHave.length > 0 && (
            <p><b style={{ color: 'var(--amber)' }}>Must-have skills: </b>{mustHave.join(', ')}</p>
          )}
          {goodToHave.length > 0 && (
            <p><b style={{ color: 'var(--amber)' }}>Good to have: </b>{goodToHave.join(', ')}</p>
          )}
          {posting.ctc_budget && (
            <p><b style={{ color: 'var(--amber)' }}>Compensation: </b>{posting.ctc_budget}</p>
          )}
          {posting.company_url && (
            <p><b style={{ color: 'var(--amber)' }}>Company: </b><a href={posting.company_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--amber-dim)' }}>{posting.company_url}</a></p>
          )}
        </div>

        <a
          href={`/tools/apply-ai?job=${posting.id}`}
          style={{
            display: 'inline-block', marginTop: 28, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600,
            fontSize: 13, color: 'var(--navy)', background: 'var(--amber)', borderRadius: 20, padding: '11px 24px',
            textDecoration: 'none',
          }}
        >
          Apply now
        </a>

        <div style={{ marginTop: 40, fontSize: 11, color: 'var(--slate)' }}>
          Posted {new Date(posting.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
          {posting.expires_at && ` · Open through ${new Date(posting.expires_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}`}
        </div>
      </div>
    </ThemeShell>
  );
}

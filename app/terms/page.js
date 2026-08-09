export const metadata = { title: 'Terms & Conditions — Ask Shree' };

export default function TermsPage() {
  return (
    <div style={{ position: 'relative' }}>
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '44px 56px 80px', maxWidth: 720, margin: '0 auto', color: 'var(--cream)' }}>
        <div className="eyebrow">Legal</div>
        <h1 className="serif" style={{ fontSize: 24, margin: '8px 0 20px' }}>Terms & Conditions</h1>
        <div style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.75 }}>
          <p>These terms cover your use of Job Postings.ai, Apply.ai, Smart Source.ai, Smart screen.ai and Assessment.ai on askshree.com. By posting a job, applying to one, or taking an assessment, you agree to the following.</p>

          <h3 style={{ color: 'var(--cream)', fontFamily: 'Fraunces, serif', fontSize: 15, marginTop: 24 }}>If you're applying to a job</h3>
          <p>You confirm that the CV/resume you upload is your own, or that you have the person's explicit permission to submit it on their behalf. You are responsible for the accuracy of the information you submit. WhatsApp application updates are sent only if you explicitly opt in — we never message a number found on a CV without that consent, regardless of whose CV it is.</p>

          <h3 style={{ color: 'var(--cream)', fontFamily: 'Fraunces, serif', fontSize: 15, marginTop: 24 }}>If you're posting a job</h3>
          <p>You confirm you are posting on behalf of a real company you're authorized to represent. We verify this on a best-effort basis (email confirmation and a domain-match check against your company URL) and flag unverified postings for manual review — but this is not a guarantee, and Ask Shree is not liable for a poster misrepresenting themselves.</p>

          <h3 style={{ color: 'var(--cream)', fontFamily: 'Fraunces, serif', fontSize: 15, marginTop: 24 }}>If you're taking an assessment</h3>
          <p>Assessment.ai uses the public-domain IPIP Big-Five Factor Markers (50-item) as a neutral trait profile, and the PULSE&trade; and IMPACT&trade; instruments as evaluative, hiring-oriented assessments. All three are untimed behavioural self-reports, not skills tests or IQ tests. You take them on a link that's unique to you and can be used once. Before you start you're asked for explicit consent to your CV and responses being stored and shared with the recruiter who invited you &mdash; nothing is processed until you give it. You see your own overall score and band; the full dimension breakdown goes to that recruiter. Scores are decision support for a human, never an automated hire/reject decision.</p>

          <h3 style={{ color: 'var(--cream)', fontFamily: 'Fraunces, serif', fontSize: 15, marginTop: 24 }}>Your data</h3>
          <p>Candidate CVs and extracted profile data are stored so you can be matched to future roles, not just the one you applied to. You can request your data be deleted at any time by emailing shreesha.narsha@gmail.com — we have no inherent right to keep it if you'd rather we didn't.</p>

          <h3 style={{ color: 'var(--cream)', fontFamily: 'Fraunces, serif', fontSize: 15, marginTop: 24 }}>No guarantees</h3>
          <p>AI-generated match scores, shortlists, and structured listings are decision support, not a guarantee of a match, hire, or successful placement. Ask Shree is a personal project run by Shreesha Narsha and is provided as-is.</p>

          <h3 style={{ color: 'var(--cream)', fontFamily: 'Fraunces, serif', fontSize: 15, marginTop: 24 }}>Prohibited use</h3>
          <p>Don't upload someone else's data without their permission, don't submit fraudulent job postings, and don't use these tools to spam or harass anyone.</p>

          <p style={{ marginTop: 28, fontSize: 11.5, color: 'var(--slate)' }}>This is a plain-language summary, not a substitute for formal legal advice. Questions: shreesha.narsha@gmail.com.</p>
        </div>
      </div>
    </div>
  );
}

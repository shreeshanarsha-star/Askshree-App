'use client';
import { useState, useEffect } from 'react';
import AskShreeChat from '../../../components/AskShreeChat';
import { useSiteKey } from '../../../lib/useSiteKey';
import { KeyGate } from '../../../components/KeyGate';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function TermsCheckbox({ checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11.5, color: 'var(--slate)', marginTop: 14, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 2 }} />
      <span>I accept the <a href="/terms" target="_blank" style={{ color: 'var(--amber-dim)' }}>Terms &amp; Conditions</a>.</span>
    </label>
  );
}

function JobCard({ job, showStatus }) {
  const pending = !job.approved;
  return (
    <div className="job-card">
      {showStatus && (
        <div>
          <span className={`status-badge ${pending ? 'pending' : 'approved'}`}>
            {pending ? '● Pending approval' : '● Approved · live'}
          </span>
          {job.email_verified && (
            <span className={`status-badge ${job.domain_match ? 'verified' : 'unverified'}`}>
              {job.domain_match ? '✓ Verified match' : '⚠ Unverified — review carefully'}
            </span>
          )}
          {!pending && <span className="status-badge vetted">★ Vetted by Shree</span>}
        </div>
      )}
      <h3>{job.title}</h3>
      <div className="job-company-row">
        {job.company_url ? <a href={job.company_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--amber-dim)' }}>{job.company}</a> : job.company} · {job.location}
      </div>
      <div className="skill-tags">
        {(job.must_have_skills || []).map((s, i) => <span key={i} className="skill-tag must">{s}</span>)}
      </div>
      <div className="skill-tags">
        {(job.good_to_have_skills || []).map((s, i) => <span key={i} className="skill-tag good">{s}</span>)}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--cream)' }}>{job.qualification}</div>
    </div>
  );
}

// Job Postings.ai — recruiter-only, one job: post a role, get a shortlist of
// genuinely qualifying candidates emailed to you. Nothing else. The job-seeker
// side (search/auto-apply) now lives on its own as Apply.ai, on purpose —
// bundling both into one tool was confusing people about what it actually did.
export default function JobPostingsAI() {
  const { unlocked, checking, error, key: siteKeyVal, setKey, submit, siteFetch } = useSiteKey('/api/tools/site-key-check');
  const [postFiles, setPostFiles] = useState([]);
  const [postStatus, setPostStatus] = useState('');
  const [postedJobs, setPostedJobs] = useState([]);
  const [posterEmail, setPosterEmail] = useState('');
  const [verifyNote, setVerifyNote] = useState('');
  const [postTermsAccepted, setPostTermsAccepted] = useState(false);

  useEffect(() => {
    if (!unlocked) return;
    const params = new URLSearchParams(window.location.search);
    const v = params.get('verify');
    if (v === 'success') setVerifyNote('Email confirmed — your posting(s) are now verified.');
    else if (v === 'invalid') setVerifyNote('That verification link is invalid or expired.');
  }, [unlocked]);

  async function runPost() {
    if (postFiles.length === 0 || !postTermsAccepted) return;
    setPostStatus('Reading JDs and structuring listings…');
    const files = await Promise.all(postFiles.map(async (f) => ({ name: f.name, mimeType: f.type, base64: await fileToBase64(f) })));
    const res = await siteFetch('/api/tools/job-postings/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, termsAccepted: postTermsAccepted }),
    });
    const data = await res.json();
    if (data.locked) { setPostStatus(data.message); return; }
    if (data.error) { setPostStatus(data.error); return; }
    setPostedJobs(data.postings);
    setPostStatus('Submitted for admin approval.');
  }

  async function sendVerification() {
    if (!posterEmail.includes('@') || postedJobs.length === 0) return;
    setVerifyNote('Sending confirmation link…');
    const res = await siteFetch('/api/tools/job-postings/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: posterEmail, jobPostingIds: postedJobs.map((j) => j.id) }),
    });
    const data = await res.json();
    if (data.error) { setVerifyNote(data.error); return; }
    if (data.emailSent) setVerifyNote('Confirmation link sent to ' + posterEmail + '.');
    else setVerifyNote('Email sending isn\'t configured yet — here\'s your confirmation link: ' + data.verifyLink);
  }

  if (checking) return null;
  if (!unlocked) {
    return (
      <KeyGate error={error} keyVal={siteKeyVal} setKey={setKey} submit={submit} checking={checking} label="Job Postings.ai — enter key" />
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '44px 56px 80px', maxWidth: 920, margin: '0 auto' }}>
        <div className="eyebrow">Recruit.ai</div>
        <h1 className="serif" style={{ fontSize: 26, color: 'var(--cream)', margin: '8px 0 12px' }}>Job Postings.ai</h1>
        <p style={{ fontSize: 13.5, color: 'var(--slate)', maxWidth: 560, marginBottom: 28, textAlign: 'justify' }}>
          Post a role for free. AI structures the listing, screens everyone who applies, and emails you a shortlist of only the genuinely qualifying candidates — nothing else to manage. Every posting is reviewed by admin before it goes live.
        </p>

        <div className="jp-panel active">
          <div className="dropzone" onClick={() => document.getElementById('jd-file-input').click()}>
            {postFiles.length ? `${postFiles.length} file(s) selected` : 'Drop JDs here, or click to upload — multiple files supported (PDF / Word)'}
          </div>
          <input id="jd-file-input" type="file" multiple accept=".pdf,.doc,.docx" style={{ display: 'none' }}
            onChange={(e) => setPostFiles(Array.from(e.target.files).slice(0, 10))} />
          <div className="file-hint">Up to 10 job descriptions per batch.</div>
          <TermsCheckbox checked={postTermsAccepted} onChange={setPostTermsAccepted} />
          <button className="primary-btn" onClick={runPost} disabled={postFiles.length === 0 || !postTermsAccepted}>Post jobs</button>
          {postStatus && <div className="file-hint" style={{ marginTop: 14 }}>{postStatus}</div>}

          {postedJobs.length > 0 && (
            <div className="email-line">
              <span>Pending approval from admin — confirm your work email to verify {postedJobs.length > 1 ? 'these postings' : 'this posting'}, and we'll send your shortlist here as candidates qualify:</span>
              <input type="email" placeholder="you@company.com" value={posterEmail} onChange={(e) => setPosterEmail(e.target.value)} />
              <button className="primary-btn" style={{ marginTop: 0 }} onClick={sendVerification}>Send link</button>
              {verifyNote && <span>{verifyNote}</span>}
            </div>
          )}

          {postedJobs.map((j) => <JobCard key={j.id} job={j} showStatus />)}
        </div>
      </div>
      <AskShreeChat />
    </div>
  );
}

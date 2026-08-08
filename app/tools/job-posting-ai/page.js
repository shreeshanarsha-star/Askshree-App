'use client';
import { useState, useEffect } from 'react';
import AskShreeChat from '../../../components/AskShreeChat';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function TermsCheckbox({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11.5, color: 'var(--slate)', marginTop: 14, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 2 }} />
      <span>{label} <a href="/terms" target="_blank" style={{ color: 'var(--amber-dim)' }}>Terms &amp; Conditions</a>.</span>
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

export default function JobPostingAI() {
  const [mode, setMode] = useState('post');
  const [subMode, setSubMode] = useState('auto');

  // --- Post a job ---
  const [postFiles, setPostFiles] = useState([]);
  const [postStatus, setPostStatus] = useState('');
  const [postedJobs, setPostedJobs] = useState([]);
  const [posterEmail, setPosterEmail] = useState('');
  const [verifyNote, setVerifyNote] = useState('');
  const [postTermsAccepted, setPostTermsAccepted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('verify');
    if (v === 'success') setVerifyNote('Email confirmed — your posting(s) are now verified.');
    else if (v === 'invalid') setVerifyNote('That verification link is invalid or expired.');
  }, []);

  async function runPost() {
    if (postFiles.length === 0 || !postTermsAccepted) return;
    setPostStatus('Reading JDs and structuring listings…');
    const files = await Promise.all(postFiles.map(async (f) => ({ name: f.name, mimeType: f.type, base64: await fileToBase64(f) })));
    const res = await fetch('/api/tools/job-posting/post', {
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
    const res = await fetch('/api/tools/job-posting/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: posterEmail, jobPostingIds: postedJobs.map((j) => j.id) }),
    });
    const data = await res.json();
    if (data.error) { setVerifyNote(data.error); return; }
    if (data.emailSent) setVerifyNote('Confirmation link sent to ' + posterEmail + '.');
    else setVerifyNote('Email sending isn\'t configured yet — here\'s your confirmation link: ' + data.verifyLink);
  }

  // --- Find & apply ---
  const [listings, setListings] = useState([]);
  const [selected, setSelected] = useState([]);
  const [resumeFile, setResumeFile] = useState(null);
  const [applyStatus, setApplyStatus] = useState('');
  const [applyResults, setApplyResults] = useState([]);
  const [search, setSearch] = useState('');
  const [applyTermsAccepted, setApplyTermsAccepted] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);

  useEffect(() => {
    fetch('/api/tools/job-posting/list').then((r) => r.json()).then((d) => setListings(d.postings || []));
  }, []);

  const filtered = listings.filter((j) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return j.title.toLowerCase().includes(q) || j.location.toLowerCase().includes(q) || (j.must_have_skills || []).some((s) => s.toLowerCase().includes(q));
  });

  async function runApply(applyMode, jobIds) {
    if (!resumeFile) { setApplyStatus('Upload your CV first.'); return; }
    if (!applyTermsAccepted) { setApplyStatus('Please accept the Terms & Conditions first.'); return; }
    setApplyStatus('Reading your CV and matching against roles…');
    const base64 = await fileToBase64(resumeFile);
    const res = await fetch('/api/tools/job-posting/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumeFile: { base64, mimeType: resumeFile.type },
        jobPostingIds: jobIds,
        mode: applyMode,
        whatsappOptIn,
        termsAccepted: applyTermsAccepted,
      }),
    });
    const data = await res.json();
    if (data.locked) { setApplyStatus(data.message); return; }
    if (data.error) { setApplyStatus(data.error); return; }
    setApplyResults(data.applied || []);
    setApplyStatus('');
  }

  const canApply = !!resumeFile && applyTermsAccepted;

  return (
    <div style={{ position: 'relative' }}>
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '44px 56px 80px', maxWidth: 920, margin: '0 auto' }}>
        <div className="eyebrow">Recruit.ai</div>
        <h1 className="serif" style={{ fontSize: 26, color: 'var(--cream)', margin: '8px 0 12px' }}>Job posting.ai</h1>
        <p style={{ fontSize: 13.5, color: 'var(--slate)', maxWidth: 560, marginBottom: 28 }}>
          Post a role for free, or find and apply to one — AI structures the listing, matches candidates, and applies on their behalf. Every posting is reviewed by admin before it goes live.
        </p>

        <div className="jp-tabs">
          <button className={`jp-tab ${mode === 'post' ? 'active' : ''}`} onClick={() => setMode('post')}>Post a job — free</button>
          <button className={`jp-tab ${mode === 'find' ? 'active' : ''}`} onClick={() => setMode('find')}>Find & apply — free</button>
        </div>

        <div className={`jp-panel ${mode === 'post' ? 'active' : ''}`}>
          <div className="dropzone" onClick={() => document.getElementById('jd-file-input').click()}>
            {postFiles.length ? `${postFiles.length} file(s) selected` : 'Drop JDs here, or click to upload — multiple files supported (PDF / Word)'}
          </div>
          <input id="jd-file-input" type="file" multiple accept=".pdf,.doc,.docx" style={{ display: 'none' }}
            onChange={(e) => setPostFiles(Array.from(e.target.files).slice(0, 10))} />
          <div className="file-hint">Up to 10 job descriptions per batch.</div>
          <TermsCheckbox checked={postTermsAccepted} onChange={setPostTermsAccepted} label="I confirm I'm authorized to post this on behalf of the company, and I agree to the" />
          <button className="primary-btn" onClick={runPost} disabled={postFiles.length === 0 || !postTermsAccepted}>Post jobs</button>
          {postStatus && <div className="file-hint" style={{ marginTop: 14 }}>{postStatus}</div>}

          {postedJobs.length > 0 && (
            <div className="email-line">
              <span>Pending approval from admin — confirm your work email to verify {postedJobs.length > 1 ? 'these postings' : 'this posting'}:</span>
              <input type="email" placeholder="you@company.com" value={posterEmail} onChange={(e) => setPosterEmail(e.target.value)} />
              <button className="primary-btn" style={{ marginTop: 0 }} onClick={sendVerification}>Send link</button>
              {verifyNote && <span>{verifyNote}</span>}
            </div>
          )}

          {postedJobs.map((j) => <JobCard key={j.id} job={j} showStatus />)}
        </div>

        <div className={`jp-panel ${mode === 'find' ? 'active' : ''}`}>
          <div className="jp-subtabs">
            <button className={`jp-subtab ${subMode === 'auto' ? 'active' : ''}`} onClick={() => setSubMode('auto')}>Auto-apply</button>
            <button className={`jp-subtab ${subMode === 'search' ? 'active' : ''}`} onClick={() => setSubMode('search')}>Search manually</button>
          </div>

          <div className="dropzone" onClick={() => document.getElementById('resume-file-input').click()}>
            {resumeFile ? resumeFile.name : 'Drop your CV here, or click to upload (PDF / Word)'}
          </div>
          <input id="resume-file-input" type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
            onChange={(e) => setResumeFile(e.target.files[0])} />
          <div className="file-hint">Your CV also joins our passive matching pool for future roles.</div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11.5, color: 'var(--slate)', marginTop: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={whatsappOptIn} onChange={(e) => setWhatsappOptIn(e.target.checked)} style={{ marginTop: 2 }} />
            <span>Send me application updates via WhatsApp, if a number is found on this CV (optional — off by default).</span>
          </label>
          <TermsCheckbox checked={applyTermsAccepted} onChange={setApplyTermsAccepted} label="This CV is mine, or I have permission to submit it on this person's behalf. I agree to the" />

          {subMode === 'auto' && (
            <>
              <button className="primary-btn" onClick={() => runApply('auto_apply', [])} disabled={!canApply}>Find & apply for me</button>
              {applyStatus && <div className="file-hint" style={{ marginTop: 14 }}>{applyStatus}</div>}
              {applyResults.map((r) => (
                <div key={r.jobId} className="jp-row">
                  <div className="info">
                    <h4>{r.jobTitle} — {r.company}</h4>
                    <div className="meta">Matched {r.matchScore}%</div>
                  </div>
                  <button className="apply-btn applied" disabled>Applied ✓</button>
                </div>
              ))}
            </>
          )}

          {subMode === 'search' && (
            <>
              <input className="free-text-input" style={{ marginTop: 16 }} type="text" placeholder="Search by title, skill, or location"
                value={search} onChange={(e) => setSearch(e.target.value)} />
              {applyStatus && <div className="file-hint" style={{ marginTop: 14 }}>{applyStatus}</div>}
              {selected.length > 0 && (
                <button className="primary-btn" onClick={() => runApply('search', selected)} disabled={!canApply}>Apply to selected ({selected.length})</button>
              )}
              {filtered.map((j) => (
                <div key={j.id} className="jp-row">
                  <input type="checkbox" checked={selected.includes(j.id)}
                    onChange={(e) => setSelected((s) => e.target.checked ? [...s, j.id] : s.filter((x) => x !== j.id))} />
                  <div className="info">
                    <h4>{j.title} — {j.company}</h4>
                    <div className="meta">{j.location}</div>
                  </div>
                  <button className="apply-btn" onClick={() => runApply('search', [j.id])} disabled={!canApply}>Apply</button>
                </div>
              ))}
              {filtered.length === 0 && <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 20 }}>No open listings match yet.</p>}
            </>
          )}
        </div>
      </div>
      <AskShreeChat />
    </div>
  );
}

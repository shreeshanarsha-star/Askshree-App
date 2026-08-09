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

function TermsCheckbox({ checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11.5, color: 'var(--slate)', marginTop: 14, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 2 }} />
      <span>I accept the <a href="/terms" target="_blank" style={{ color: 'var(--amber-dim)' }}>Terms &amp; Conditions</a>.</span>
    </label>
  );
}

// Apply.ai — job-seeker-only: upload your CV, then either auto-apply to the
// best-matching open roles or search and pick specific ones. Split out from
// what used to be Job posting.ai's "find & apply" tab, on purpose — one tool
// trying to serve both recruiters and candidates was confusing everyone about
// what it actually did.
export default function ApplyAI() {
  const [subMode, setSubMode] = useState('auto');

  const [listings, setListings] = useState([]);
  const [selected, setSelected] = useState([]);
  const [resumeFile, setResumeFile] = useState(null);
  const [applyStatus, setApplyStatus] = useState('');
  const [applyResults, setApplyResults] = useState([]);
  const [search, setSearch] = useState('');
  const [applyTermsAccepted, setApplyTermsAccepted] = useState(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);

  useEffect(() => {
    fetch('/api/tools/apply/list').then((r) => r.json()).then((d) => setListings(d.postings || []));
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
    const res = await fetch('/api/tools/apply/apply', {
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
        <h1 className="serif" style={{ fontSize: 26, color: 'var(--cream)', margin: '8px 0 12px' }}>Apply.ai</h1>
        <p style={{ fontSize: 13.5, color: 'var(--slate)', maxWidth: 560, marginBottom: 28 }}>
          Find and apply to a role, free — AI matches your CV against open listings and applies on your behalf, or you pick the ones you want.
          Looking to post a job instead? That's <a href="/tools/job-postings-ai" style={{ color: 'var(--amber-dim)' }}>Job Postings.ai</a>.
        </p>

        <div className="jp-panel active">
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
          <TermsCheckbox checked={applyTermsAccepted} onChange={setApplyTermsAccepted} />

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

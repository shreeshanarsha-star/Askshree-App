'use client';
import { useState } from 'react';
import AskShreeChat from '../../../components/AskShreeChat';
import { useSiteKey } from '../../../lib/useSiteKey';
import { KeyGate } from '../../../components/KeyGate';
import { useOptionalSession } from '../../../lib/useOptionalSession';
import { AccountBadge } from '../../../components/AccountBadge';
import CandidateResults from '../../../components/CandidateResults';
import SavedSearches from '../../../components/SavedSearches';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


// Smart Source.ai — finds candidates via public Google-indexed LinkedIn
// profile snippets (never scrapes LinkedIn directly), scores them against
// the role, and lets the recruiter open the profile. Contact reveal, share
// via email, and Excel export were always part of the finalized plan (see
// lib/contactEnrich.js) — contact reveal degrades gracefully until an
// Apollo/Hunter/SignalHire key is added; share + export are fully live.
export default function SmartSourceAI() {
  const { unlocked, checking, error, key: siteKeyVal, setKey, submit, siteFetch } = useSiteKey('/api/tools/site-key-check');
  const { token: authToken } = useOptionalSession();

  const [mode, setMode] = useState('auto');
  const [jobDescription, setJobDescription] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [skillsInput, setSkillsInput] = useState('');
  const [booleanQuery, setBooleanQuery] = useState('');
  const [location, setLocation] = useState('');
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState('');
  const [candidates, setCandidates] = useState(null);
  const [cached, setCached] = useState(false);

  const [selected, setSelected] = useState(new Set());
  const [contactState, setContactState] = useState({}); // id -> { loading, revealed, message, email, phone }
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTo, setShareTo] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [sharing, setSharing] = useState(false);

  function candidateKey(c) {
    return c.id || c.profile_url;
  }

  function updateCandidateField(key, field, value) {
    setCandidates((prev) => prev.map((c) => (candidateKey(c) === key ? { ...c, [field]: value } : c)));
  }

  function toggleSelect(c) {
    const key = candidateKey(c);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function revealContactFor(c) {
    const key = candidateKey(c);
    setContactState((prev) => ({ ...prev, [key]: { loading: true } }));
    try {
      const res = await siteFetch('/api/tools/smart-source/reveal-contact', {
        method: 'POST',
        body: JSON.stringify({ name: c.name, company: c.company, profileUrl: c.profile_url }),
      });
      const data = await res.json();
      if (data.ok) {
        setContactState((prev) => ({ ...prev, [key]: { loading: false, revealed: true, email: data.email, phone: data.phone } }));
      } else {
        setContactState((prev) => ({ ...prev, [key]: { loading: false, revealed: false, message: data.message } }));
      }
    } catch (e) {
      setContactState((prev) => ({ ...prev, [key]: { loading: false, revealed: false, message: 'Could not look up contact details.' } }));
    }
  }

  async function bulkRevealContactsFor(list) {
    const keys = list.map((c) => candidateKey(c));
    setContactState((prev) => {
      const next = { ...prev };
      for (const k of keys) next[k] = { loading: true };
      return next;
    });
    try {
      const res = await siteFetch('/api/tools/smart-source/reveal-contact-batch', {
        method: 'POST',
        body: JSON.stringify({ candidates: list.map((c) => ({ name: c.name, company: c.company, profileUrl: c.profile_url })) }),
      });
      const data = await res.json();
      setContactState((prev) => {
        const next = { ...prev };
        for (const c of list) {
          const key = candidateKey(c);
          const r = data?.results?.[c.profile_url];
          next[key] = r?.ok
            ? { loading: false, revealed: true, email: r.email, phone: r.phone }
            : { loading: false, revealed: false, message: r?.message || 'Could not look up contact details.' };
        }
        return next;
      });
    } catch (e) {
      setContactState((prev) => {
        const next = { ...prev };
        for (const c of list) next[candidateKey(c)] = { loading: false, revealed: false, message: 'Could not look up contact details.' };
        return next;
      });
    }
  }

  async function exportToExcel() {
    const XLSX = await import('xlsx');
    const rows = candidates
      .filter((c) => selected.size === 0 || selected.has(candidateKey(c)))
      .map((c) => ({
        Candidate: c.name || '',
        Designation: c.designation || '',
        Company: c.company || '',
        Location: c.location || '',
        'Match %': c.match_score != null ? c.match_score : '',
        Qualification: c.qualification || '',
        'Current CTC': c.current_ctc || '',
        'Expected CTC': c.expected_ctc || '',
        'Notice Period': c.notice_period || '',
        'Outreach Status': c.outreach_status || 'new',
        'Why This Match': c.match_reason || '',
        'Profile URL': c.profile_url || '',
      }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Candidates');
    XLSX.writeFile(book, 'smart-source-candidates.xlsx');
  }

  async function sendShareEmail() {
    setSharing(true);
    setShareNote('');
    const toShare = candidates.filter((c) => selected.has(candidateKey(c)));
    const res = await siteFetch('/api/tools/smart-source/share-email', {
      method: 'POST',
      body: JSON.stringify({ to: shareTo, candidates: toShare }),
    });
    const data = await res.json();
    setSharing(false);
    if (data.ok) {
      setShareNote('Sent.');
      setTimeout(() => { setShareOpen(false); setShareNote(''); }, 1500);
    } else {
      setShareNote(data.error || 'Could not send that email.');
    }
  }

  async function runSearch() {
    setRunning(true);
    setNote('Searching…');
    setCandidates(null);
    setSelected(new Set());
    setContactState({});
    let body;
    if (mode === 'manual') {
      body = { mode: 'manual', skills: skillsInput.split(',').map((s) => s.trim()).filter(Boolean), booleanQuery, location };
    } else if (jdFile) {
      const base64 = await fileToBase64(jdFile);
      body = { mode: 'auto', jdFile: { name: jdFile.name, mimeType: jdFile.type, base64 }, location };
    } else {
      body = { mode: 'auto', jobDescription, location };
    }

    const res = await siteFetch('/api/tools/smart-source/search', {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setRunning(false);
    if (data.locked) { setNote(data.message); return; }
    if (data.error) { setNote(data.error); return; }
    setCandidates(data.candidates || []);
    setCached(!!data.cached);
    setNote(data.candidates?.length ? '' : 'No matching profiles found — try broadening the skills or dropping the location filter.');
  }

  const canSearch = !running && (mode === 'manual' ? skillsInput.trim().length > 0 : (!!jdFile || jobDescription.trim().length > 20));

  if (checking) return null;
  if (!unlocked) {
    return (
      <KeyGate error={error} keyVal={siteKeyVal} setKey={setKey} submit={submit} checking={checking} label="Smart Source.ai — enter key" />
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <AccountBadge />
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '44px 56px 80px', maxWidth: 980, margin: '0 auto' }}>
        <div className="eyebrow">Recruit.ai</div>
        <h1 className="serif" style={{ fontSize: 26, color: 'var(--cream)', margin: '8px 0 12px' }}>Smart Source.ai</h1>
        <p style={{ fontSize: 13.5, color: 'var(--slate)', maxWidth: 620, marginBottom: 28, textAlign: 'justify' }}>
          Drop a JD — AI builds the search, sources candidates, and scores every result against the role
          for you. Reveal contact details, select candidates to share by email, or export the full list to
          Excel. Or type the exact skills yourself for a manual search.
        </p>

        <div className="jp-panel active">
          <div className="jp-subtabs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 0 }}>
              <button className={`jp-subtab ${mode === 'auto' ? 'active' : ''}`} onClick={() => setMode('auto')}>Paste a JD</button>
              <button className={`jp-subtab ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>Type skills manually</button>
            </div>
            <SavedSearches
              tool="smart_source"
              siteFetch={siteFetch}
              getParams={() => ({ mode, jobDescription, skillsInput, booleanQuery, location })}
              onLoad={(p) => {
                setMode(p.mode || 'auto');
                setJobDescription(p.jobDescription || '');
                setJdFile(null);
                setSkillsInput(p.skillsInput || '');
                setBooleanQuery(p.booleanQuery || '');
                setLocation(p.location || '');
              }}
            />
          </div>

          {mode === 'auto' && (
            <>
              <div
                className={`dropzone${dragActive ? ' drag-active' : ''}`}
                onClick={() => document.getElementById('jd-file-input').click()}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) { setJdFile(f); setJobDescription(''); }
                }}
              >
                {jdFile ? jdFile.name : 'Drag & drop a JD here, or click to browse (PDF / Word)'}
              </div>
              <input id="jd-file-input" type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files[0]; if (f) { setJdFile(f); setJobDescription(''); } }} />
              {jdFile && (
                <div className="file-hint" style={{ marginTop: 6 }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setJdFile(null); }} style={{ color: 'var(--amber)' }}>Remove file</a> — or paste text instead below.
                </div>
              )}

              <div className="dropzone-divider">or</div>

              <textarea className="free-text-input" style={{ minHeight: 140, resize: 'vertical' }}
                placeholder="Paste the job description, a short role summary, or specific keywords…"
                value={jobDescription}
                onChange={(e) => { setJobDescription(e.target.value); if (e.target.value) setJdFile(null); }} />
            </>
          )}

          {mode === 'manual' && (
            <>
              <input className="free-text-input" type="text" placeholder="Skills, comma-separated — e.g. React, Node.js, AWS"
                value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} />
              <input className="free-text-input" style={{ marginTop: 10 }} type="text"
                placeholder="Optional: exact boolean search terms (e.g. &quot;Django&quot; OR &quot;Flask&quot;)"
                value={booleanQuery} onChange={(e) => setBooleanQuery(e.target.value)} />
            </>
          )}

          <input className="free-text-input" style={{ marginTop: 10 }} type="text" placeholder="Location filter — e.g. Bengaluru"
            value={location} onChange={(e) => setLocation(e.target.value)} />

          <button className="primary-btn" onClick={runSearch} disabled={!canSearch}>
            {running ? 'Searching…' : 'Find candidates'}
          </button>
          {note && <div className="file-hint" style={{ marginTop: 14 }}>{note}</div>}

          {candidates && candidates.length > 0 && (
            <CandidateResults
              candidates={candidates}
              candidateKey={candidateKey}
              selected={selected}
              toggleSelect={toggleSelect}
              setSelected={setSelected}
              contactState={contactState}
              revealContactFor={revealContactFor}
              bulkRevealContactsFor={bulkRevealContactsFor}
              updateCandidateField={updateCandidateField}
              siteFetch={siteFetch}
              cached={cached}
              shareOpen={shareOpen}
              setShareOpen={setShareOpen}
              shareTo={shareTo}
              setShareTo={setShareTo}
              shareNote={shareNote}
              sharing={sharing}
              sendShareEmail={sendShareEmail}
              exportToExcel={exportToExcel}
            />
          )}
        </div>
      </div>
      <AskShreeChat />
    </div>
  );
}

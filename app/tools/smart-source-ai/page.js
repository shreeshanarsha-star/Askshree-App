'use client';
import { useState } from 'react';
import AskShreeChat from '../../../components/AskShreeChat';
import { useSiteKey } from '../../../lib/useSiteKey';
import { KeyGate } from '../../../components/KeyGate';
import { useOptionalSession } from '../../../lib/useOptionalSession';
import { AccountBadge } from '../../../components/AccountBadge';
import AddToProjectButton from '../../../components/AddToProjectButton';
import EditableCell from '../../../components/EditableCell';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function scoreColor(score) {
  if (score == null) return 'var(--slate)';
  return score >= 70 ? 'var(--amber)' : score >= 40 ? 'var(--amber-dim)' : 'var(--slate)';
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
          <div className="jp-subtabs">
            <button className={`jp-subtab ${mode === 'auto' ? 'active' : ''}`} onClick={() => setMode('auto')}>Paste a JD</button>
            <button className={`jp-subtab ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>Type skills manually</button>
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

          <input className="free-text-input" style={{ marginTop: 10 }} type="text" placeholder="Location filter (optional) — e.g. Bengaluru"
            value={location} onChange={(e) => setLocation(e.target.value)} />

          <button className="primary-btn" onClick={runSearch} disabled={!canSearch}>
            {running ? 'Searching…' : 'Find candidates'}
          </button>
          {note && <div className="file-hint" style={{ marginTop: 14 }}>{note}</div>}

          {candidates && candidates.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 12px', flexWrap: 'wrap', gap: 10 }}>
                <div className="file-hint" style={{ margin: 0 }}>
                  {candidates.length} candidate{candidates.length > 1 ? 's' : ''} found{selected.size > 0 ? ` — ${selected.size} selected` : ''}
                  {cached && ' — showing results from a recent matching search'}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <a href="/tools/projects" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--slate)' }}>View projects</a>
                  <AddToProjectButton
                    siteFetch={siteFetch}
                    selectedCount={selected.size}
                    getSelectedCandidates={() => candidates.filter((c) => selected.has(candidateKey(c)))}
                  />
                  <button
                    type="button"
                    onClick={() => setShareOpen((v) => !v)}
                    disabled={selected.size === 0}
                    style={{
                      fontFamily: 'IBM Plex Mono, monospace', fontSize: 11.5, color: selected.size ? 'var(--amber)' : 'var(--slate)',
                      border: '1px solid ' + (selected.size ? 'var(--amber-dim)' : 'var(--line)'), borderRadius: 20, padding: '8px 14px',
                      background: 'transparent', cursor: selected.size ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Share via email
                  </button>
                  <button
                    type="button"
                    onClick={exportToExcel}
                    style={{
                      fontFamily: 'IBM Plex Mono, monospace', fontSize: 11.5, color: 'var(--amber)',
                      border: '1px solid var(--amber-dim)', borderRadius: 20, padding: '8px 14px',
                      background: 'transparent', cursor: 'pointer',
                    }}
                  >
                    Export to Excel
                  </button>
                </div>
              </div>

              {shareOpen && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                  <input className="free-text-input" style={{ maxWidth: 320 }} type="email" placeholder="Recipient email"
                    value={shareTo} onChange={(e) => setShareTo(e.target.value)} />
                  <button className="primary-btn" style={{ marginTop: 0 }} onClick={sendShareEmail} disabled={sharing || !shareTo}>
                    {sharing ? 'Sending…' : 'Send'}
                  </button>
                  {shareNote && <span className="file-hint" style={{ marginTop: 0 }}>{shareNote}</span>}
                </div>
              )}

              <div className="table-wrap">
                <table className="assess-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Candidate</th><th>Designation</th><th>Company</th><th>Location</th><th>Match</th><th>Qualification</th><th>Current CTC</th><th>Expected CTC</th><th>Notice</th><th>Contact</th><th>Profile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c) => {
                      const key = candidateKey(c);
                      const cs = contactState[key] || {};
                      return (
                        <tr key={key}>
                          <td>
                            <input type="checkbox" checked={selected.has(key)} onChange={() => toggleSelect(c)} />
                          </td>
                          <td className="name-cell">{c.name || '—'}</td>
                          <td>{c.designation || '—'}</td>
                          <td>{c.company || '—'}</td>
                          <td>{c.location || '—'}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: scoreColor(c.match_score) }}>{c.match_score != null ? `${c.match_score}%` : '—'}</span>
                              {c.match_score != null && (
                                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                  <div style={{ width: `${c.match_score}%`, height: '100%', background: 'var(--amber)' }} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td><EditableCell value={c.qualification} onChange={(v) => updateCandidateField(key, 'qualification', v)} /></td>
                          <td><EditableCell value={c.current_ctc} onChange={(v) => updateCandidateField(key, 'current_ctc', v)} /></td>
                          <td><EditableCell value={c.expected_ctc} onChange={(v) => updateCandidateField(key, 'expected_ctc', v)} /></td>
                          <td><EditableCell value={c.notice_period} onChange={(v) => updateCandidateField(key, 'notice_period', v)} /></td>
                          <td>
                            {cs.revealed ? (
                              <span style={{ fontSize: 11 }}>{cs.email || cs.phone || '—'}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => revealContactFor(c)}
                                disabled={cs.loading}
                                title={cs.message || ''}
                                style={{
                                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: 'var(--slate)',
                                  border: '1px solid var(--line)', borderRadius: 14, padding: '5px 11px', background: 'transparent',
                                  cursor: cs.loading ? 'default' : 'pointer', whiteSpace: 'nowrap',
                                }}
                              >
                                {cs.loading ? '…' : cs.message ? 'Not available' : 'Reveal contact'}
                              </button>
                            )}
                          </td>
                          <td><a href={c.profile_url} target="_blank" rel="noreferrer">View</a></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
      <AskShreeChat />
    </div>
  );
}

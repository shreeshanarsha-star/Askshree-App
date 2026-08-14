'use client';
import { useState } from 'react';
import AskShreeChat from '../../../components/AskShreeChat';
import { useSiteKey } from '../../../lib/useSiteKey';
import { KeyGate } from '../../../components/KeyGate';
import { useOptionalSession } from '../../../lib/useOptionalSession';
import { AccountBadge } from '../../../components/AccountBadge';

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

function sourceLabel(source) {
  if (source === 'linkedin') return 'LinkedIn';
  if (source === 'database') return 'Our database';
  if (source === 'local') return 'Local file';
  return '—';
}

const MAX_LOCAL_FILES = 25;

// Smart Hunt.ai — the consolidated hunt: one JD drop or keyword search fans
// out across three sources at once (public LinkedIn profiles, candidates
// already in our own database, and — only if the recruiter explicitly picks
// a folder — local resume files on their own machine) and scores every
// result against the role. Local files are read only for that one search:
// nothing is uploaded to storage or written to a table, and picking the
// folder via the browser's own dialog *is* the permission grant — nothing
// happens silently.
export default function SmartHuntAI() {
  const { unlocked, checking, error, key: siteKeyVal, setKey, submit, siteFetch } = useSiteKey('/api/tools/site-key-check');
  const { token: authToken } = useOptionalSession();

  const [mode, setMode] = useState('auto');
  const [jobDescription, setJobDescription] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [skillsInput, setSkillsInput] = useState('');
  const [booleanQuery, setBooleanQuery] = useState('');
  const [location, setLocation] = useState('');
  const [localFiles, setLocalFiles] = useState([]); // File[] picked via folder permission
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState('');
  const [candidates, setCandidates] = useState(null);

  function pickLocalFolder(e) {
    const picked = Array.from(e.target.files || []).filter((f) =>
      /\.(pdf|doc|docx)$/i.test(f.name)
    ).slice(0, MAX_LOCAL_FILES);
    setLocalFiles(picked);
  }

  async function runSearch() {
    setRunning(true);
    setNote(localFiles.length ? 'Searching LinkedIn, our database, and your local files…' : 'Searching…');
    setCandidates(null);

    let body;
    if (mode === 'manual') {
      body = { mode: 'manual', skills: skillsInput.split(',').map((s) => s.trim()).filter(Boolean), booleanQuery, location };
    } else if (jdFile) {
      const base64 = await fileToBase64(jdFile);
      body = { mode: 'auto', jdFile: { name: jdFile.name, mimeType: jdFile.type, base64 }, location };
    } else {
      body = { mode: 'auto', jobDescription, location };
    }

    if (localFiles.length) {
      body.localFiles = await Promise.all(localFiles.map(async (f) => ({
        name: f.name, mimeType: f.type, base64: await fileToBase64(f),
      })));
    }

    const res = await siteFetch('/api/tools/smart-hunt/search', {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setRunning(false);
    if (data.locked) { setNote(data.message); return; }
    if (data.error) { setNote(data.error); return; }
    setCandidates(data.candidates || []);
    setNote(data.candidates?.length ? '' : 'No matching candidates found — try broadening the skills or dropping the location filter.');
  }

  const canSearch = !running && (mode === 'manual' ? skillsInput.trim().length > 0 : (!!jdFile || jobDescription.trim().length > 20));

  if (checking) return null;
  if (!unlocked) {
    return (
      <KeyGate error={error} keyVal={siteKeyVal} setKey={setKey} submit={submit} checking={checking} label="Smart Hunt.ai — enter key" />
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
        <h1 className="serif" style={{ fontSize: 26, color: 'var(--cream)', margin: '8px 0 12px' }}>Smart Hunt.ai</h1>
        <p style={{ fontSize: 13.5, color: 'var(--slate)', maxWidth: 620, marginBottom: 28, textAlign: 'justify' }}>
          Drop a JD — AI builds the search, hunts candidates across LinkedIn, our own candidate database,
          and (if you grant folder access) your local resume files, then scores every result against the
          role for you. Or type the exact skills yourself for a manual search.
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
                placeholder="Paste the job description or a short role summary…"
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

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <button
              type="button"
              onClick={() => document.getElementById('local-folder-input').click()}
              style={{
                border: '1px solid ' + (localFiles.length ? 'var(--amber-dim)' : 'var(--line)'),
                color: localFiles.length ? 'var(--amber)' : 'var(--slate)',
                background: 'transparent', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11.5,
                padding: '9px 16px', borderRadius: 20, cursor: 'pointer',
              }}
            >
              {localFiles.length ? `${localFiles.length} local file(s) selected — click to change` : 'Also search local files… (asks folder permission)'}
            </button>
            <input id="local-folder-input" type="file" webkitdirectory="" directory="" multiple
              style={{ display: 'none' }} onChange={pickLocalFolder} />
            <div className="file-hint" style={{ marginTop: 8 }}>
              Picking a folder is the permission — nothing is read until you choose one. Files are used
              only for this search and are never uploaded to storage or saved.
              {localFiles.length > 0 && (
                <> <a href="#" onClick={(e) => { e.preventDefault(); setLocalFiles([]); }} style={{ color: 'var(--amber)' }}>Clear selection</a></>
              )}
            </div>
          </div>

          <button className="primary-btn" onClick={runSearch} disabled={!canSearch}>
            {running ? 'Hunting…' : 'Hunt candidates'}
          </button>
          {note && <div className="file-hint" style={{ marginTop: 14 }}>{note}</div>}

          {candidates && candidates.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 20 }}>
              <table className="assess-table">
                <thead>
                  <tr><th>Candidate</th><th>Designation</th><th>Company</th><th>Location</th><th>Source</th><th>Match</th><th>Profile</th></tr>
                </thead>
                <tbody>
                  {candidates.map((c, i) => (
                    <tr key={c.candidate_id || c.profile_url || c.file_name || i}>
                      <td className="name-cell">{c.name || '—'}</td>
                      <td>{c.designation || '—'}</td>
                      <td>{c.company || '—'}</td>
                      <td>{c.location || '—'}</td>
                      <td>{sourceLabel(c.source)}</td>
                      <td style={{ color: scoreColor(c.match_score) }}>{c.match_score != null ? `${c.match_score}%` : '—'}</td>
                      <td>{c.profile_url ? <a href={c.profile_url} target="_blank" rel="noreferrer">View</a> : (c.file_name || '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <AskShreeChat />
    </div>
  );
}

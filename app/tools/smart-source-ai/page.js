'use client';
import { useState } from 'react';
import AskShreeChat from '../../../components/AskShreeChat';
import { useSiteKey } from '../../../lib/useSiteKey';
import { KeyGate } from '../../../components/KeyGate';
import { useOptionalSession } from '../../../lib/useOptionalSession';
import { AccountBadge } from '../../../components/AccountBadge';

function scoreColor(score) {
  if (score == null) return 'var(--slate)';
  return score >= 70 ? 'var(--amber)' : score >= 40 ? 'var(--amber-dim)' : 'var(--slate)';
}

// Smart Source.ai — finds candidates via public Google-indexed LinkedIn
// profile snippets (never scrapes LinkedIn directly), scores them against
// the role, and lets the recruiter open the profile. No contact-reveal yet —
// that needs a separate enrichment API (Apollo/Hunter/SignalHire) which
// isn't connected; this ships search + match scoring only.
export default function SmartSourceAI() {
  const { unlocked, checking, error, key: siteKeyVal, setKey, submit, siteFetch } = useSiteKey('/api/tools/site-key-check');
  const { token: authToken } = useOptionalSession();

  const [mode, setMode] = useState('auto');
  const [jobDescription, setJobDescription] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [booleanQuery, setBooleanQuery] = useState('');
  const [location, setLocation] = useState('');
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState('');
  const [candidates, setCandidates] = useState(null);
  const [cached, setCached] = useState(false);

  async function runSearch() {
    setRunning(true);
    setNote('Searching…');
    setCandidates(null);
    const body = mode === 'manual'
      ? { mode: 'manual', skills: skillsInput.split(',').map((s) => s.trim()).filter(Boolean), booleanQuery, location }
      : { mode: 'auto', jobDescription, location };

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

  const canSearch = !running && (mode === 'manual' ? skillsInput.trim().length > 0 : jobDescription.trim().length > 20);

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
          Find candidates from public LinkedIn profiles — paste a JD and AI builds the search, or type
          the exact skills yourself. Every result is scored against the role so you see the strongest
          matches first.
        </p>

        <div className="jp-panel active">
          <div className="jp-subtabs">
            <button className={`jp-subtab ${mode === 'auto' ? 'active' : ''}`} onClick={() => setMode('auto')}>Paste a JD</button>
            <button className={`jp-subtab ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>Type skills manually</button>
          </div>

          {mode === 'auto' && (
            <textarea className="free-text-input" style={{ minHeight: 140, resize: 'vertical' }}
              placeholder="Paste the job description or a short role summary…"
              value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
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
            <div className="table-wrap" style={{ marginTop: 20 }}>
              {cached && <div className="file-hint" style={{ marginBottom: 10 }}>Showing results from a recent matching search.</div>}
              <table className="assess-table">
                <thead>
                  <tr><th>Candidate</th><th>Designation</th><th>Company</th><th>Location</th><th>Match</th><th>Profile</th></tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id || c.profile_url}>
                      <td className="name-cell">{c.name || '—'}</td>
                      <td>{c.designation || '—'}</td>
                      <td>{c.company || '—'}</td>
                      <td>{c.location || '—'}</td>
                      <td style={{ color: scoreColor(c.match_score) }}>{c.match_score != null ? `${c.match_score}%` : '—'}</td>
                      <td><a href={c.profile_url} target="_blank" rel="noreferrer">View</a></td>
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

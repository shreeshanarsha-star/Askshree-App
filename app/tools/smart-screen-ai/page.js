'use client';
import { useState, useEffect, useMemo } from 'react';
import AskShreeChat from '../../../components/AskShreeChat';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function csvEscape(val) {
  const s = String(val == null ? '' : val);
  if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function parseCtc(v) {
  if (!v) return 0;
  const m = String(v).match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

function tierColor(score) {
  return score >= 8 ? 'var(--amber)' : score >= 6 ? 'var(--amber-dim)' : 'var(--slate)';
}

function FitBadge({ score }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame = 0;
    const frames = 18;
    const timer = setInterval(() => {
      frame++;
      setDisplay(Math.min(score, (score * frame) / frames));
      if (frame >= frames) { setDisplay(score); clearInterval(timer); }
    }, 22);
    return () => clearInterval(timer);
  }, [score]);
  return (
    <div className="fit-cell">
      <div className="fit-cell-top">
        <div className="fit-bar"><div className="fit-fill" style={{ width: display * 10 + '%', background: tierColor(score) }} /></div>
        <span className="fit-score">{display.toFixed(1)}/10</span>
      </div>
    </div>
  );
}

function FitRing({ score }) {
  return (
    <div className="fit-ring" style={{ background: `conic-gradient(${tierColor(score)} ${score * 10}%, rgba(255,255,255,0.08) 0)` }}>
      <div className="fit-ring-inner">{score}/10</div>
    </div>
  );
}

function ActionChip({ action }) {
  if (!action?.label) return null;
  return <span className={`action-chip ${action.tier || ''}`}>{action.label}</span>;
}

const NOTICE_OPTIONS = ['Immediate', '15 days', '30 days', '45 days', '60 days', '90 days', 'Custom'];

export default function SmartScreenAI() {
  const [mode, setMode] = useState('jd');
  const [jdFile, setJdFile] = useState(null);
  const [manual, setManual] = useState({ roleTitle: '', minYears: '', ctcBudget: '', mustHave: '', goodToHave: '', notes: '' });
  const [cvFiles, setCvFiles] = useState([]);
  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [statusMsg, setStatusMsg] = useState('');
  const [results, setResults] = useState([]);
  const [batchId, setBatchId] = useState(null);
  const [mustHaveSkills, setMustHaveSkills] = useState([]);
  const [compareSummary, setCompareSummary] = useState(null);
  const [sortKey, setSortKey] = useState('fit');
  const [selectedIds, setSelectedIds] = useState([]);
  const [openIds, setOpenIds] = useState([]);
  const [posterEmail, setPosterEmail] = useState('');
  const [verifyNote, setVerifyNote] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('verify');
    if (v === 'success') setVerifyNote('Email confirmed for this batch.');
    else if (v === 'invalid') setVerifyNote('That verification link is invalid or expired.');
  }, []);

  const steps = [
    'Reading CVs...',
    'Extracting profile data — company, designation, experience, location...',
    'Scoring each candidate against your criteria...',
    'Ranking results...',
  ];

  async function runScreen() {
    if (cvFiles.length === 0) { setStatusMsg('Upload at least one CV.'); return; }
    if (mode === 'jd' && !jdFile) { setStatusMsg('Upload a job description.'); return; }
    if (mode === 'manual' && !manual.roleTitle && !manual.mustHave) { setStatusMsg('Enter at least a role title or must-have skills.'); return; }

    setRunning(true);
    setResults([]);
    setCompareSummary(null);
    setStatusMsg('');
    setStepIndex(0);

    const stepTimer = setInterval(() => {
      setStepIndex((i) => (i < steps.length - 1 ? i + 1 : i));
    }, 900);

    try {
      const cvPayload = await Promise.all(cvFiles.map(async (f) => ({ name: f.name, mimeType: f.type, base64: await fileToBase64(f) })));
      const body = { mode, cvFiles: cvPayload };
      if (mode === 'jd') body.jdFile = { name: jdFile.name, mimeType: jdFile.type, base64: await fileToBase64(jdFile) };
      else body.manual = manual;

      const res = await fetch('/api/tools/smart-screen/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      clearInterval(stepTimer);
      setStepIndex(steps.length);

      if (data.locked) { setStatusMsg(data.message); return; }
      if (data.error) { setStatusMsg(data.error); return; }

      setResults(data.results || []);
      setBatchId(data.batchId);
      setMustHaveSkills(data.mustHaveSkills || []);
      setCompareSummary(data.compareSummary);
    } catch (e) {
      clearInterval(stepTimer);
      setStatusMsg('Something went wrong screening this batch. Try again.');
    } finally {
      setRunning(false);
    }
  }

  const sorted = useMemo(() => {
    const list = results.slice();
    if (sortKey === 'fit') list.sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0));
    if (sortKey === 'exp') list.sort((a, b) => (b.yearsExperience || 0) - (a.yearsExperience || 0));
    if (sortKey === 'ctc') list.sort((a, b) => parseCtc(a.expectedCtc) - parseCtc(b.expectedCtc));
    if (sortKey === 'location') list.sort((a, b) => (a.location || '').localeCompare(b.location || ''));
    return list;
  }, [results, sortKey]);

  const maxFit = results.length ? Math.max(...results.map((r) => r.fitScore || 0)) : null;
  const strongCount = results.filter((r) => r.fitScore >= 8).length;
  const flagCount = results.filter((r) => (r.redFlags || []).length > 0).length;
  const zeroCoverage = mustHaveSkills.filter((skill) => !results.some((r) => (r.metSkills || []).includes(skill)));

  function updateField(candidateId, field, value) {
    setResults((rs) => rs.map((r) => (r.candidateId === candidateId ? { ...r, [field]: value } : r)));
  }

  const FIELD_MAP = {
    name: 'name', currentCompany: 'current_company', currentDesignation: 'current_designation',
    yearsExperience: 'years_experience', location: 'location', currentCtc: 'current_ctc',
    expectedCtc: 'expected_ctc', noticePeriod: 'notice_period',
  };

  async function saveField(candidateId, field, value) {
    const dbField = FIELD_MAP[field];
    if (!dbField) return;
    try {
      await fetch('/api/tools/smart-screen/candidate', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, fields: { [dbField]: value } }),
      });
    } catch (e) { /* non-critical — local state already reflects the edit */ }
  }

  async function viewCV(candidateId) {
    const res = await fetch('/api/tools/smart-screen/cv-url?candidateId=' + candidateId);
    const data = await res.json();
    if (data.url) window.open(data.url, '_blank');
    else alert(data.error || 'CV not available for this candidate.');
  }

  function emailCandidate(r) {
    const subject = encodeURIComponent(`Candidate: ${r.name || 'Candidate'} — ${r.currentDesignation || ''}`);
    const body = encodeURIComponent(
      `${r.name || 'Candidate'}\n${r.currentDesignation || ''} at ${r.currentCompany || ''}\n` +
      `Experience: ${r.yearsExperience || 'n/a'} yrs · Location: ${r.location || 'n/a'}\nFit score: ${r.fitScore}/10\n\n${r.justification || ''}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function whatsappCandidate(r) {
    const text = encodeURIComponent(`${r.name || 'Candidate'} — ${r.currentDesignation || ''} at ${r.currentCompany || ''}. Fit: ${r.fitScore}/10. ${r.justification || ''}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  function emailSelected() {
    const chosen = results.filter((r) => selectedIds.includes(r.candidateId));
    const body = encodeURIComponent(chosen.map((r) => `${r.name || 'Candidate'} — ${r.currentDesignation || ''} at ${r.currentCompany || ''} — fit ${r.fitScore}/10`).join('\n\n'));
    window.location.href = `mailto:?subject=${encodeURIComponent('Shortlisted candidates — Smart screen.ai')}&body=${body}`;
  }

  function whatsappSelected() {
    const chosen = results.filter((r) => selectedIds.includes(r.candidateId));
    const text = encodeURIComponent(chosen.map((r) => `${r.name || 'Candidate'} — fit ${r.fitScore}/10`).join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  function toggleSelect(id) {
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  function toggleAll(checked) {
    setSelectedIds(checked ? sorted.map((r) => r.candidateId) : []);
  }
  function toggleJustify(id) {
    setOpenIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function exportData() {
    const headers = ['Sl.', 'Name', 'Current Company', 'Current Designation', 'Total Experience', 'Location', 'Current CTC', 'Expected CTC', 'Notice Period', 'Fit Score', 'Red Flags', 'Achievement', 'Next Action', 'Justification'];
    const rows = sorted.map((r, i) => [
      i + 1, r.name, r.currentCompany, r.currentDesignation, r.yearsExperience, r.location, r.currentCtc, r.expectedCtc,
      r.noticePeriod, r.fitScore + '/10', (r.redFlags || []).join(' | '), r.achievement || '', r.nextAction?.label || '', r.justification,
    ]);
    const csv = [headers].concat(rows).map((row) => row.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smart-screen-results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function sendVerification() {
    if (!posterEmail.includes('@') || !batchId) return;
    setVerifyNote('Sending confirmation link…');
    const res = await fetch('/api/tools/smart-screen/send-verification', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: posterEmail, batchIds: [batchId] }),
    });
    const data = await res.json();
    if (data.error) { setVerifyNote(data.error); return; }
    if (data.emailSent) setVerifyNote('Confirmation link sent to ' + posterEmail + '.');
    else setVerifyNote("Email sending isn't configured yet — here's your confirmation link: " + data.verifyLink);
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '44px 56px 80px', maxWidth: 1180, margin: '0 auto' }}>
        <div className="eyebrow">Recruit.ai</div>
        <h1 className="serif" style={{ fontSize: 26, color: 'var(--cream)', margin: '8px 0 12px' }}>Smart screen.ai</h1>
        <p style={{ fontSize: 13.5, color: 'var(--slate)', maxWidth: 600, marginBottom: 28 }}>
          Upload up to 20 CVs and screen them all at once against a role — AI reads each one, scores it out of 10 against your criteria, and gives you a ranked, exportable shortlist with the reasoning behind every score.
        </p>

        <div className="jp-tabs">
          <button className={`jp-tab ${mode === 'jd' ? 'active' : ''}`} onClick={() => setMode('jd')}>Upload JD</button>
          <button className={`jp-tab ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>Enter criteria manually</button>
        </div>

        <div className={`jp-panel ${mode === 'jd' ? 'active' : ''}`}>
          <div className="dropzone" onClick={() => document.getElementById('jd-input').click()}>
            {jdFile ? jdFile.name : 'Drop a JD here, or click to upload (PDF / Word)'}
          </div>
          <input id="jd-input" type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={(e) => setJdFile(e.target.files[0])} />
        </div>

        <div className={`jp-panel ${mode === 'manual' ? 'active' : ''}`}>
          <div className="criteria-grid">
            <div className="field"><label>Role title</label><input type="text" placeholder="e.g. Senior Product Manager" value={manual.roleTitle} onChange={(e) => setManual((m) => ({ ...m, roleTitle: e.target.value }))} /></div>
            <div className="field"><label>Minimum years of experience</label><input type="number" placeholder="5" value={manual.minYears} onChange={(e) => setManual((m) => ({ ...m, minYears: e.target.value }))} /></div>
            <div className="field"><label>CTC budget (max)</label><input type="text" placeholder="e.g. ₹60L" value={manual.ctcBudget} onChange={(e) => setManual((m) => ({ ...m, ctcBudget: e.target.value }))} /></div>
            <div className="field full"><label>Must-have skills (comma separated)</label><input type="text" placeholder="Product Strategy, Fintech Domain, Roadmapping" value={manual.mustHave} onChange={(e) => setManual((m) => ({ ...m, mustHave: e.target.value }))} /></div>
            <div className="field full"><label>Good-to-have skills (comma separated)</label><input type="text" placeholder="SQL, B2B SaaS, Public Speaking" value={manual.goodToHave} onChange={(e) => setManual((m) => ({ ...m, goodToHave: e.target.value }))} /></div>
            <div className="field full"><label>Other notes / non-negotiables</label><input type="text" placeholder="e.g. must be willing to relocate to Bengaluru" value={manual.notes} onChange={(e) => setManual((m) => ({ ...m, notes: e.target.value }))} /></div>
          </div>
        </div>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <div className="dropzone" onClick={() => document.getElementById('cv-input').click()}>
            {cvFiles.length ? `${cvFiles.length} CV(s) selected` : 'Drop CVs here, or click to upload — multiple files supported (PDF / Word)'}
          </div>
          <input id="cv-input" type="file" multiple accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={(e) => setCvFiles(Array.from(e.target.files).slice(0, 20))} />
          <div className="file-hint">Up to 20 CVs per batch. Candidates already in our database are updated, not duplicated.</div>
          <button className="primary-btn" onClick={runScreen} disabled={running}>{running ? 'Screening…' : 'Screen candidates'}</button>
          {statusMsg && <div className="file-hint" style={{ marginTop: 14 }}>{statusMsg}</div>}
        </div>

        {stepIndex >= 0 && (
          <div className="status">
            {steps.map((label, i) => (
              <div key={i} className={`status-row ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}`}>
                <span className="mark">{i < stepIndex ? '✓' : ''}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div className="results-toolbar">
              <div className="results-label">{results.length} CVs screened</div>
              <div className="results-actions">
                <select className="sort-select" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                  <option value="fit">Sort: Fit score (high → low)</option>
                  <option value="exp">Sort: Experience (high → low)</option>
                  <option value="ctc">Sort: Expected CTC (low → high)</option>
                  <option value="location">Sort: Location (A → Z)</option>
                </select>
                <button className="action-btn" disabled={selectedIds.length === 0} onClick={emailSelected}>Email selected</button>
                <button className="action-btn" disabled={selectedIds.length === 0} onClick={whatsappSelected}>WhatsApp selected</button>
                <button className="action-btn" onClick={exportData}>Export CSV</button>
                <button className="action-btn" onClick={exportData}>Export Excel</button>
                <button className="action-btn" onClick={() => alert('PDF export is coming in a later update.')}>Export PDF</button>
              </div>
            </div>

            <div className="stat-strip">
              <div className="stat-item"><div className="stat-value">{results.length}</div><div className="stat-label">Screened</div></div>
              <div className="stat-item"><div className="stat-value amber">{strongCount}</div><div className="stat-label">Strong fits (8+)</div></div>
              <div className="stat-item"><div className={`stat-value ${flagCount > 0 ? 'flag' : ''}`}>{flagCount}</div><div className="stat-label">Red flags</div></div>
            </div>

            {zeroCoverage.length > 0 && (
              <div className="skill-gap-banner">
                <span className="icon">⚠</span>
                <span>None of the {results.length} candidates in this batch show <strong>{zeroCoverage.join(', ')}</strong> — you may want to broaden sourcing, or treat this as a trainable gap rather than a hard filter.</span>
              </div>
            )}

            {compareSummary && (
              <div className="compare-card">
                <div className="compare-label">AI batch summary — top candidates compared</div>
                <p>{compareSummary}</p>
              </div>
            )}

            {!batchId ? null : (
              <div className="email-line" style={{ marginBottom: 18 }}>
                <span>Confirm your email to verify this batch (optional — for your records, not required to use the tool):</span>
                <input type="email" placeholder="you@company.com" value={posterEmail} onChange={(e) => setPosterEmail(e.target.value)} />
                <button className="primary-btn" style={{ marginTop: 0 }} onClick={sendVerification}>Send link</button>
                {verifyNote && <span>{verifyNote}</span>}
              </div>
            )}

            <div className="table-wrap">
              <table className="screen-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" checked={selectedIds.length === sorted.length && sorted.length > 0} onChange={(e) => toggleAll(e.target.checked)} /></th>
                    <th>Sl.</th>
                    <th>Name</th>
                    <th>Fit score</th>
                    <th>Role &amp; company</th>
                    <th>Total exp.</th>
                    <th>Location</th>
                    <th>Current CTC</th>
                    <th>Expected CTC</th>
                    <th>Notice period</th>
                    <th className="wrap">Justification</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => {
                    const rowClass = r.fitScore >= 8 ? 'row-strong' : r.fitScore <= 5 ? 'row-weak' : '';
                    const isTop = r.fitScore === maxFit;
                    const open = openIds.includes(r.candidateId);
                    return (
                      <tr key={r.candidateId} className={rowClass}>
                        <td><input type="checkbox" checked={selectedIds.includes(r.candidateId)} onChange={() => toggleSelect(r.candidateId)} /></td>
                        <td>{i + 1}</td>
                        <td className="editable-cell">
                          <input type="text" style={{ width: 130, fontFamily: 'Fraunces,serif', fontSize: '12.5px' }} value={r.name || ''}
                            onChange={(e) => updateField(r.candidateId, 'name', e.target.value)} onBlur={(e) => saveField(r.candidateId, 'name', e.target.value)} />
                          {isTop && <span className="top-pick-badge">★ TOP PICK</span>}
                        </td>
                        <td>
                          <FitBadge score={r.fitScore} />
                          <ActionChip action={r.nextAction} />
                        </td>
                        <td className="editable-cell">
                          <div className="role-company">
                            <input type="text" style={{ width: 150, fontSize: '11.5px' }} value={r.currentDesignation || ''}
                              onChange={(e) => updateField(r.candidateId, 'currentDesignation', e.target.value)} onBlur={(e) => saveField(r.candidateId, 'currentDesignation', e.target.value)} />
                            <input type="text" style={{ width: 150, fontSize: '10.5px', color: 'var(--slate)' }} value={r.currentCompany || ''}
                              onChange={(e) => updateField(r.candidateId, 'currentCompany', e.target.value)} onBlur={(e) => saveField(r.candidateId, 'currentCompany', e.target.value)} />
                          </div>
                        </td>
                        <td className="editable-cell"><input type="text" style={{ width: 60 }} value={r.yearsExperience ?? ''}
                          onChange={(e) => updateField(r.candidateId, 'yearsExperience', e.target.value)} onBlur={(e) => saveField(r.candidateId, 'yearsExperience', e.target.value)} /></td>
                        <td className="editable-cell"><input type="text" value={r.location || ''}
                          onChange={(e) => updateField(r.candidateId, 'location', e.target.value)} onBlur={(e) => saveField(r.candidateId, 'location', e.target.value)} /></td>
                        <td className="editable-cell"><input type="text" value={r.currentCtc || ''}
                          onChange={(e) => updateField(r.candidateId, 'currentCtc', e.target.value)} onBlur={(e) => saveField(r.candidateId, 'currentCtc', e.target.value)} /></td>
                        <td className="editable-cell"><input type="text" value={r.expectedCtc || ''}
                          onChange={(e) => updateField(r.candidateId, 'expectedCtc', e.target.value)} onBlur={(e) => saveField(r.candidateId, 'expectedCtc', e.target.value)} /></td>
                        <td className="editable-cell">
                          <select value={r.noticePeriod || ''} onChange={(e) => { updateField(r.candidateId, 'noticePeriod', e.target.value); saveField(r.candidateId, 'noticePeriod', e.target.value); }}>
                            <option value="">—</option>
                            {NOTICE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className="wrap">
                          <span className="justify-toggle" onClick={() => toggleJustify(r.candidateId)}>{open ? 'Hide reasoning' : 'View reasoning'}</span>
                          {open && (
                            <div className="justify-detail">
                              <FitRing score={r.fitScore} />
                              <div className="crit-label">Met</div>
                              <div className="crit-tags">{(r.metSkills || []).length ? r.metSkills.map((m, mi) => <span key={mi} className="crit-tag met">{m}</span>) : <span style={{ color: 'var(--slate)' }}>none</span>}</div>
                              <div className="crit-label">Missing</div>
                              <div className="crit-tags">{(r.missingSkills || []).length ? r.missingSkills.map((m, mi) => <span key={mi} className="crit-tag missing">{m}</span>) : <span style={{ color: 'var(--slate)' }}>none</span>}</div>
                              <div className="crit-label">Why (AI, ~100 words)</div>
                              <p style={{ margin: '6px 0 0', color: 'var(--cream)', fontSize: 11, lineHeight: 1.6 }}>{r.justification}</p>
                              <div className="crit-label" style={{ color: '#e28080' }}>Red flags (major only)</div>
                              {(r.redFlags || []).length
                                ? r.redFlags.map((f, fi) => <p key={fi} style={{ margin: '4px 0 0', color: '#e28080', fontSize: 11, lineHeight: 1.6 }}>⚠ {f}</p>)
                                : <p style={{ margin: '4px 0 0', color: 'var(--slate)', fontSize: 11 }}>No major red flags found.</p>}
                              <div className="crit-label">Notable achievement</div>
                              <p style={{ margin: '4px 0 0', color: 'var(--cream)', fontSize: 11, lineHeight: 1.6 }}>{r.achievement || 'None called out.'}</p>
                              <div className="crit-label">Suggested interview questions</div>
                              <ul style={{ margin: '4px 0 0', paddingLeft: 16, color: 'var(--cream)', fontSize: 11, lineHeight: 1.6 }}>
                                {(r.interviewQuestions || []).map((q, qi) => <li key={qi} style={{ marginBottom: 4 }}>{q}</li>)}
                              </ul>
                              <div className="crit-label">Suggested next step</div>
                              <p style={{ margin: '4px 0 0' }}><ActionChip action={r.nextAction} /></p>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-btn" disabled={!r.hasFile} onClick={() => viewCV(r.candidateId)}>View CV</button>
                            <button className="icon-btn" onClick={() => emailCandidate(r)}>Email</button>
                            <button className="icon-btn" onClick={() => whatsappCandidate(r)}>WhatsApp</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <AskShreeChat />
    </div>
  );
}

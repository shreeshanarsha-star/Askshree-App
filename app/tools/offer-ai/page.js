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

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];
const STATUS_LABEL = {
  draft: 'Draft', pending_approval: 'Pending approval', approved: 'Approved',
  changes_requested: 'Changes requested', rejected: 'Rejected',
};

function money(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// The Auto/Manual field pattern from Assessment.ai — Auto shows what AI read
// from the documents, Manual opens the editable form underneath it.
function AutoManualField({ label, mode, setMode, autoDisplay, children, note }) {
  return (
    <div className="as-field">
      <div className="as-field-head">
        <label>{label}</label>
        <div className="as-toggle">
          <button type="button" className={mode === 'auto' ? 'active' : ''} onClick={() => setMode('auto')}>Auto</button>
          <button type="button" className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>Manual</button>
        </div>
      </div>
      {mode === 'auto' ? (
        <div className={`as-auto-value ${autoDisplay ? '' : 'empty'}`} style={{ lineHeight: 1.9 }}>
          {autoDisplay || 'Upload documents — this fills in from them.'}
        </div>
      ) : children}
      {note && <div className="as-note">{note}</div>}
    </div>
  );
}

export default function OfferAI() {
  const { unlocked, checking, error, key: siteKeyVal, setKey, submit, siteFetch } = useSiteKey('/api/tools/site-key-check');
  const { token: authToken } = useOptionalSession();
  const [tab, setTab] = useState('new');

  // --- Upload ---
  const [files, setFiles] = useState([]); // File[] — one dropzone, AI sorts them
  const [extracting, setExtracting] = useState(false);
  const [extractNote, setExtractNote] = useState('');
  const [proposalId, setProposalId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [docListOpen, setDocListOpen] = useState(false);
  const STATUS_STEPS = [
    'Documents detected',
    'Analysing the CV',
    'Analysing the payslips',
    'Analysing the appointment letter',
    'Analysing the educational documents',
    'Analysing the job description & budget approval',
    'Candidate identified',
  ];
  const [statusStep, setStatusStep] = useState(-1); // -1 = not started, STATUS_STEPS.length = all done
  const [identified, setIdentified] = useState(null); // { name, role } once known

  // --- Candidate details ---
  const [candMode, setCandMode] = useState('auto');
  const [cand, setCand] = useState({
    candidate_name: '', current_designation: '', proposed_designation: '', grade: '',
    division: '', department: '', notice_period: '', tentative_joining_date: '',
  });
  const [currency, setCurrency] = useState('INR');
  const [budgetBand, setBudgetBand] = useState('');

  // --- Compensation ---
  const [hikePercent, setHikePercent] = useState('');
  const [components, setComponents] = useState([]);
  const [totals, setTotals] = useState({ grossCurrent: null, grossProposed: null, totalCtcCurrent: null, totalCtcProposed: null });
  const [recalculating, setRecalculating] = useState(false);

  // --- Other benefits + justification ---
  const [otherBenefits, setOtherBenefits] = useState('');
  const [justification, setJustification] = useState('');
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);

  // --- Approval ---
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [approverEmails, setApproverEmails] = useState(['']);
  const [sending, setSending] = useState(false);
  const [sendNote, setSendNote] = useState('');

  // --- Dashboard ---
  const [dashEmail, setDashEmail] = useState('');
  const [dashRows, setDashRows] = useState(null);
  const [dashJobRoles, setDashJobRoles] = useState([]);
  const [dashFilter, setDashFilter] = useState('');
  const [dashNote, setDashNote] = useState('');

  const hikeCtc = totals.totalCtcCurrent && totals.totalCtcProposed
    ? (((totals.totalCtcProposed - totals.totalCtcCurrent) / totals.totalCtcCurrent) * 100).toFixed(1) : null;

  function addFiles(newFiles) {
    setFiles((f) => [...f, ...newFiles]);
  }
  function removeFile(idx) {
    setFiles((f) => f.filter((_, i) => i !== idx));
  }

  async function runExtract() {
    if (!files.length) { setExtractNote('Upload at least one document.'); return; }
    setExtracting(true);
    setExtractNote('');
    setStatusStep(0);

    // Staggered status reveal — same beat as the approved mockup. Runs
    // alongside the real request rather than gating on it, so it always
    // finishes at a natural pace regardless of how fast AI responds.
    let cancelled = false;
    const stepTimer = (async () => {
      for (let i = 1; i < STATUS_STEPS.length - 1; i++) {
        await new Promise((r) => setTimeout(r, 550));
        if (!cancelled) setStatusStep(i);
      }
    })();

    try {
      const payload = await Promise.all(files.map(async (file) => {
        const base64 = await fileToBase64(file);
        return { base64, mimeType: file.type, fileName: file.name };
      }));
      const res = await siteFetch('/api/tools/offer/extract', {
        method: 'POST', headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}, body: JSON.stringify({ files: payload }),
      });
      const data = await res.json();
      cancelled = true;
      await stepTimer;

      if (data.locked) { setExtractNote(data.message); setExtracting(false); setStatusStep(-1); return; }
      if (data.error) { setExtractNote(data.error); setExtracting(false); setStatusStep(-1); return; }

      setStatusStep(STATUS_STEPS.length); // all done

      setProposalId(data.proposalId);
      setDocuments(data.documents || []);
      const e = data.extracted || {};
      setIdentified({ name: e.candidate_name || 'Candidate', role: e.proposed_designation || e.role_title || 'the role' });
      setCand({
        candidate_name: e.candidate_name || '', current_designation: e.current_designation || '',
        proposed_designation: e.proposed_designation || '', grade: e.grade || '', division: e.division || '',
        department: e.department || '', notice_period: e.notice_period || '', tentative_joining_date: '',
      });
      setCurrency(e.currency || 'INR');
      setBudgetBand(e.budget_band || '');
      setComponents((e.components || []).map((c) => ({ ...c, mode: 'auto' })));
      setExtractNote(
        data.existingCandidate
          ? 'This candidate is already in your database — attaching to their existing record.'
          : 'New candidate added to your database.'
      );
    } catch {
      cancelled = true;
      setExtractNote('Something went wrong reading those documents.');
      setStatusStep(-1);
    }
    setExtracting(false);
  }

  async function saveField(patch) {
    if (!proposalId) return;
    await siteFetch('/api/tools/offer/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposalId, patch }),
    });
  }

  async function recalc(nextComponents, nextHike) {
    if (!proposalId) return;
    setRecalculating(true);
    const res = await siteFetch('/api/tools/offer/recalculate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId, hikePercent: nextHike ?? hikePercent, components: nextComponents ?? components }),
    });
    const data = await res.json();
    if (data.ok) {
      setComponents(data.components);
      setTotals({ grossCurrent: data.gross_current, grossProposed: data.gross_proposed, totalCtcCurrent: data.total_ctc_current, totalCtcProposed: data.total_ctc_proposed });
    }
    setRecalculating(false);
  }

  function updateComponent(idx, patch) {
    const next = components.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    setComponents(next);
    return next;
  }

  function addComponentRow() {
    const next = [...components, { label: '', current_monthly: null, current_annual: null, category: 'earning', mode: 'manual', proposed_monthly: 0, proposed_annual: 0 }];
    setComponents(next);
  }

  function removeComponentRow(idx) {
    const next = components.filter((_, i) => i !== idx);
    setComponents(next);
    recalc(next);
  }

  async function sendChat(message) {
    if (!proposalId) return;
    setChatBusy(true);
    const res = await siteFetch('/api/tools/offer/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposalId, message }),
    });
    const data = await res.json();
    if (data.ok) {
      setChat(data.chat);
      if (data.justificationDrafted) setJustification(data.justification);
    }
    setChatBusy(false);
    setChatInput('');
  }

  function updateApprover(i, val) {
    setApproverEmails(approverEmails.map((e, idx) => (idx === i ? val : e)));
  }

  async function sendForApproval() {
    const emails = approverEmails.map((e) => e.trim()).filter((e) => e.includes('@'));
    if (!emails.length) { setSendNote('Add at least one approver email.'); return; }
    setSending(true);
    setSendNote('Sending…');
    await saveField({ recruiter_email: recruiterEmail, job_role: jobRole });
    const res = await siteFetch('/api/tools/offer/send-for-approval', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId, approverEmails: emails, recruiterEmail }),
    });
    const data = await res.json();
    setSending(false);
    if (data.error) { setSendNote(data.error); return; }
    setSendNote(
      data.firstApproverEmailSent
        ? `Sent to ${emails[0]} (approver 1 of ${emails.length}).`
        : `Approval chain created. Email sending isn't configured yet — here's approver 1's link: ${data.firstApproverLink}`
    );
  }

  async function loadDashboard(email, filter) {
    const e = (email ?? dashEmail).trim();
    if (!e.includes('@')) { setDashNote('Enter the email you created proposals under.'); return; }
    setDashNote('Loading…');
    const q = new URLSearchParams({ email: e });
    const f = filter ?? dashFilter;
    if (f) q.set('jobRole', f);
    const res = await siteFetch(`/api/tools/offer/dashboard?${q.toString()}`);
    const data = await res.json();
    if (data.error) { setDashNote(data.error); return; }
    setDashRows(data.rows);
    setDashJobRoles(data.jobRoles || []);
    setDashNote(data.rows.length ? '' : 'No proposals created under that email yet.');
  }

  if (checking) return null;
  if (!unlocked) {
    return (
      <KeyGate error={error} keyVal={siteKeyVal} setKey={setKey} submit={submit} checking={checking} label="Offer.ai — enter key" />
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <AccountBadge />
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '44px 56px 80px', maxWidth: 920, margin: '0 auto' }}>
        <div className="eyebrow">Recruit.ai</div>
        <h1 className="serif" style={{ fontSize: 26, color: 'var(--cream)', margin: '8px 0 12px' }}>Offer.ai</h1>
        <p style={{ fontSize: 13.5, color: 'var(--slate)', maxWidth: 620, marginBottom: 28, textAlign: 'justify' }}>
          Upload everything you have on the candidate — AI reads it all, drafts a compensation proposal with the
          reasoning behind it, and takes it from internal approval to a signed-off, downloadable proposal.
        </p>

        <div className="jp-tabs">
          <button className={`jp-tab ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>New proposal</button>
          <button className={`jp-tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
        </div>

        <div className={`jp-panel ${tab === 'new' ? 'active' : ''}`}>
          {!proposalId && (
            <>
              <div className="field-label" style={{ margin: '0 0 8px' }}>Documents</div>
              <div className="dropzone" onClick={() => document.getElementById('offer-file-input').click()}>
                Drag &amp; drop files, or <b style={{ color: 'var(--cream)' }}>browse</b> · appointment letter, payslips, education certificates, CV, JD, budget approval — any order, AI sorts them
              </div>
              <input id="offer-file-input" type="file" multiple accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
                onChange={(e) => { addFiles(Array.from(e.target.files)); e.target.value = ''; }} />

              {files.length > 0 && (
                <div className="doc-summary" onClick={() => setDocListOpen((o) => !o)}>
                  <span>{files.length} file{files.length > 1 ? 's' : ''} selected — {files.map((f) => f.name).join(', ')}</span>
                  <span className="doc-toggle">{docListOpen ? 'Hide files ▴' : 'Show files ▾'}</span>
                </div>
              )}
              {docListOpen && files.length > 0 && (
                <div className="doc-list">
                  {files.map((f, i) => (
                    <div className="doc-row" key={i}>
                      <span className="dicon">{(f.name.split('.').pop() || 'file').slice(0, 3)}</span>
                      <span className="dname">{f.name}</span>
                      <span className="view-link" style={{ cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, fontSize: 10.5, color: 'var(--slate)' }} onClick={(e) => { e.stopPropagation(); removeFile(i); }}>✕ Remove</span>
                    </div>
                  ))}
                </div>
              )}

              <button className="primary-btn" onClick={runExtract} disabled={extracting || !files.length}>
                {extracting ? 'Analysing…' : 'Analyze documents'}
              </button>

              {statusStep >= 0 && (
                <div className="status-log">
                  {STATUS_STEPS.map((label, i) => {
                    const isLast = i === STATUS_STEPS.length - 1;
                    const cls = statusStep > i || (isLast && statusStep >= STATUS_STEPS.length) ? 'done' : statusStep === i ? 'active' : '';
                    const text = isLast && identified ? <>Candidate identified: <b>{identified.name}</b> — applied for <b>{identified.role}</b></> : label;
                    return <div className={`status-row ${cls}`} key={i}><span className="sdot"></span> {text}</div>;
                  })}
                </div>
              )}
              {extractNote && <div className="file-hint" style={{ marginTop: 12 }}>{extractNote}</div>}
            </>
          )}

          {proposalId && (
            <div style={{ marginTop: 8 }}>
              {identified && (
                <div className="offer-ai-identified">
                  <b>{identified.name}</b> — applied for {identified.role}
                </div>
              )}
              {extractNote && <div className="file-hint" style={{ marginTop: 10, marginBottom: 8 }}>{extractNote}</div>}

              {documents.length > 0 && (
                <div className="doc-summary" onClick={() => setDocListOpen((o) => !o)} style={{ marginTop: 14 }}>
                  <span>{documents.length} document{documents.length > 1 ? 's' : ''} uploaded — {Object.entries(documents.reduce((m, d) => ({ ...m, [d.docType]: (m[d.docType] || 0) + 1 }), {})).map(([t, n]) => `${t}${n > 1 ? ` (${n})` : ''}`).join(', ')}</span>
                  <span className="doc-toggle">{docListOpen ? 'Hide files ▴' : 'Show files ▾'}</span>
                </div>
              )}
              {docListOpen && (
                <div className="doc-list">
                  {documents.map((d, i) => (
                    <div className="doc-row" key={i}>
                      <span className="dicon">{d.docType.slice(0, 3)}</span>
                      <span className="dname">{d.fileName || d.docType}</span>
                      <span className={`dtype ${d.needsReview ? 'needs-review' : ''}`}>{d.needsReview ? `${d.docType} — confirm?` : d.docType}</span>
                    </div>
                  ))}
                </div>
              )}

              <AutoManualField
                label="Candidate details"
                mode={candMode} setMode={setCandMode}
                autoDisplay={cand.candidate_name ? (
                  <>
                    <b>{cand.candidate_name}</b>{cand.grade ? <> &middot; Grade <b>{cand.grade}</b></> : ''} &middot; <b>{cand.current_designation || '—'}</b> → <b>{cand.proposed_designation || '—'}</b><br />
                    {cand.division || '—'}{cand.department ? `, ${cand.department}` : ''} &middot; Notice: <b>{cand.notice_period || '—'}</b> &middot; Joining: <b>{cand.tentative_joining_date || 'not set'}</b>
                  </>
                ) : ''}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    ['candidate_name', 'Candidate name'], ['grade', 'Grade'],
                    ['current_designation', 'Current designation'], ['proposed_designation', 'Proposed designation'],
                    ['division', 'Division'], ['department', 'Department'],
                    ['notice_period', 'Notice period'], ['tentative_joining_date', 'Tentative joining date'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, fontSize: 10, color: 'var(--slate)', marginBottom: 6 }}>{label}</label>
                      <input type="text" value={cand[key]} onChange={(e) => setCand((c) => ({ ...c, [key]: e.target.value }))}
                        onBlur={() => saveField({ [key]: cand[key] })} />
                    </div>
                  ))}
                </div>
              </AutoManualField>

              <div className="as-field">
                <div className="as-field-head"><label>Currency</label></div>
                <select value={currency} onChange={(e) => { setCurrency(e.target.value); saveField({ currency: e.target.value }); }}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="as-note">
                  {currency === 'INR' ? 'Payslip figures are in INR — no conversion needed.' :
                    `Payslip was in a foreign currency — figures below are shown in ${currency}, which is now this proposal's base currency.`}
                </div>
              </div>

              {budgetBand && (
                <div className="as-field">
                  <div className="as-field-head"><label>Approved budget band</label></div>
                  <input type="text" value={budgetBand} onChange={(e) => setBudgetBand(e.target.value)} onBlur={() => saveField({ budget_band: budgetBand })} />
                </div>
              )}

              <div className="as-field">
                <div className="as-field-head"><label>Hike % (drives the proposed figures below)</label></div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="number" placeholder="e.g. 20" value={hikePercent} style={{ flex: 1 }}
                    onChange={(e) => setHikePercent(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') recalc(components, hikePercent); }} />
                  <button className="primary-btn" style={{ marginTop: 0, whiteSpace: 'nowrap' }}
                    onClick={() => recalc(components, hikePercent)} disabled={recalculating || hikePercent === ''}>
                    {recalculating ? 'Calculating…' : 'Calculate'}
                  </button>
                </div>
                <div className="as-note">Applies to every "Auto" row — rows you've set to Manual are left exactly as you entered them.</div>
              </div>

              {totals.totalCtcProposed != null && (
                <div className="stat-strip">
                  <div className="stat-item"><span className="stat-label">Total CTC (proposed)</span><span className="stat-value amber">{currency} {money(totals.totalCtcProposed)}</span></div>
                  <div className="stat-item"><span className="stat-label">Gross (proposed)</span><span className="stat-value">{currency} {money(totals.grossProposed)}</span></div>
                  <div className="stat-item"><span className="stat-label">Total CTC hike</span><span className="stat-value">{hikeCtc != null ? `+${hikeCtc}%` : '—'}</span></div>
                  <div className="stat-item"><span className="stat-label">Current CTC</span><span className="stat-value">{currency} {money(totals.totalCtcCurrent)}</span></div>
                </div>
              )}

              <div className="field-label" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, fontSize: 10.5, color: 'var(--slate)', margin: '20px 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Compensation breakdown {recalculating ? '— recalculating…' : ''}
              </div>
              <table className="offer-table">
                <thead>
                  <tr><th rowSpan={2}>Component</th><th className="num" colSpan={2}>Current</th><th className="num" colSpan={2}>Proposed</th><th rowSpan={2}>Mode</th></tr>
                  <tr><th className="num">Monthly</th><th className="num">Annually</th><th className="num">Monthly</th><th className="num">Annually</th></tr>
                </thead>
                <tbody>
                  {components.map((c, i) => (
                    <tr key={i}>
                      <td>
                        {c.mode === 'manual' && (c.current_monthly == null) ? (
                          <input className="offer-comp-name-input" placeholder="e.g. Joining bonus" value={c.label}
                            onChange={(e) => updateComponent(i, { label: e.target.value })} onBlur={() => recalc()} />
                        ) : <span className="dim">{c.label}</span>}
                      </td>
                      <td className="num">{c.current_monthly != null ? money(c.current_monthly) : '—'}</td>
                      <td className="num">{c.current_annual != null ? money(c.current_annual) : '—'}</td>
                      <td className="num">
                        {c.mode === 'manual' ? (
                          <input className="offer-cmp-input" value={c.proposed_monthly ?? ''} onChange={(e) => updateComponent(i, { proposed_monthly: Number(e.target.value) || 0 })} onBlur={() => recalc()} />
                        ) : <span className="proposed">{money(c.proposed_monthly)}</span>}
                      </td>
                      <td className="num">{c.mode === 'manual' ? money((c.proposed_monthly || 0) * 12) : <span className="proposed">{money(c.proposed_annual)}</span>}</td>
                      <td>
                        <div className="offer-row-toggle">
                          <button className={c.mode !== 'manual' ? 'active' : ''} onClick={() => { const next = updateComponent(i, { mode: 'auto' }); recalc(next); }}>Auto</button>
                          <button className={c.mode === 'manual' ? 'active' : ''} onClick={() => updateComponent(i, { mode: 'manual', proposed_monthly: c.proposed_monthly ?? c.current_monthly ?? 0 })}>Manual</button>
                        </div>
                        {c.mode === 'manual' && <span className="approver-remove" style={{ marginLeft: 6 }} onClick={() => removeComponentRow(i)}>✕</span>}
                      </td>
                    </tr>
                  ))}
                  {totals.grossProposed != null && (
                    <tr className="subtotal"><td className="dim" style={{ color: 'var(--cream)' }}>Gross Salary</td><td className="num">{money(totals.grossCurrent)}</td><td className="num" /><td className="num proposed">{money(totals.grossProposed)}</td><td className="num" /><td /></tr>
                  )}
                  {totals.totalCtcProposed != null && (
                    <tr className="subtotal"><td className="dim" style={{ color: 'var(--cream)' }}>Total CTC</td><td className="num">{money(totals.totalCtcCurrent)}</td><td className="num" /><td className="num proposed">{money(totals.totalCtcProposed)}</td><td className="num" /><td /></tr>
                  )}
                </tbody>
              </table>
              <button className="ghost-btn" style={{ marginTop: 12 }} onClick={addComponentRow}>+ Add a component</button>

              <div className="as-field" style={{ marginTop: 22 }}>
                <div className="as-field-head"><label>Other benefits — editable</label></div>
                <textarea rows={3} value={otherBenefits} onChange={(e) => setOtherBenefits(e.target.value)} onBlur={() => saveField({ other_benefits: otherBenefits })} />
              </div>

              <div className="as-field">
                <div className="as-field-head"><label>Justification — editable, edit freely before sending</label></div>
                <textarea rows={5} value={justification} onChange={(e) => setJustification(e.target.value)} onBlur={() => saveField({ justification })} />
                <div className="as-note">
                  AI can research current market comp and ask you anything it needs before drafting this — use the panel below.
                </div>
              </div>
              <div className="offer-chat">
                {chat.length === 0 && <div className="file-hint">Nothing yet — start the research below.</div>}
                {chat.map((m, i) => (
                  <div className={`offer-chat-msg ${m.role}`} key={i}>
                    <span className="who">{m.role === 'ai' ? 'AI' : 'You'}</span>{m.text}
                  </div>
                ))}
              </div>
              <div className="offer-chat-input-row">
                <input type="text" placeholder="Answer AI's question, or leave blank and press Start" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendChat(chatInput); }} />
                <button className="ghost-btn" disabled={chatBusy} onClick={() => sendChat(chatInput)}>
                  {chatBusy ? 'Thinking…' : chat.length === 0 ? 'Start research' : 'Send'}
                </button>
              </div>

              <div className="as-field" style={{ marginTop: 22 }}>
                <div className="as-field-head"><label>Your email (so this shows on your dashboard)</label></div>
                <input type="email" value={recruiterEmail} onChange={(e) => setRecruiterEmail(e.target.value)} />
              </div>
              <div className="as-field">
                <div className="as-field-head"><label>Job / role (optional, groups your dashboard)</label></div>
                <input type="text" value={jobRole} onChange={(e) => setJobRole(e.target.value)} />
              </div>

              <div className="field-label" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, fontSize: 10.5, color: 'var(--slate)', margin: '20px 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Send for approval — in order
              </div>
              {approverEmails.map((email, i) => (
                <div className="approver-row" key={i}>
                  <span className="seq">{i + 1}.</span>
                  <input type="email" placeholder="approver@company.com" value={email} onChange={(e) => updateApprover(i, e.target.value)} />
                  {approverEmails.length > 1 && (
                    <button className="approver-remove" onClick={() => setApproverEmails(approverEmails.filter((_, idx) => idx !== i))}>✕</button>
                  )}
                </div>
              ))}
              <button className="ghost-btn" style={{ marginTop: 10 }} onClick={() => setApproverEmails([...approverEmails, ''])}>+ Add another approver</button>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 18 }}>
                <button className="primary-btn" style={{ marginTop: 0 }} onClick={sendForApproval} disabled={sending}>
                  {sending ? 'Sending…' : 'Send proposal for approval'}
                </button>
                <a className="ghost-btn" style={{ textDecoration: 'none' }} href={`/tools/offer-ai/proposal/${proposalId}`} target="_blank" rel="noreferrer">
                  ⬇ Download proposal
                </a>
              </div>
              {sendNote && <div className="file-hint" style={{ marginTop: 12 }}>{sendNote}</div>}
              <div className="file-hint" style={{ marginTop: 8 }}>
                The downloaded proposal is exactly what each approver sees — for whenever you'd rather send it yourself instead of the approval link.
              </div>
            </div>
          )}
        </div>

        <div className={`jp-panel ${tab === 'dashboard' ? 'active' : ''}`}>
          <div className="email-line">
            <span>Show proposals created under:</span>
            <input type="email" placeholder="you@company.com" value={dashEmail} onChange={(e) => setDashEmail(e.target.value)} />
            <button className="primary-btn" style={{ marginTop: 0 }} onClick={() => loadDashboard()}>Load</button>
          </div>
          {dashJobRoles.length > 0 && (
            <div className="email-line">
              <span>Job / role:</span>
              <select className="sort-select" value={dashFilter} onChange={(e) => { setDashFilter(e.target.value); loadDashboard(dashEmail, e.target.value); }}>
                <option value="">All roles</option>
                {dashJobRoles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}
          {dashNote && <div className="file-hint" style={{ marginTop: 12 }}>{dashNote}</div>}
          {dashRows && dashRows.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table className="assess-table">
                <thead><tr><th>Candidate</th><th>Role</th><th>Proposed CTC</th><th>Status</th><th>Updated</th><th></th></tr></thead>
                <tbody>
                  {dashRows.map((r) => (
                    <tr key={r.id}>
                      <td className="name-cell">{r.candidateName}</td>
                      <td>{r.roleTitle}</td>
                      <td>{r.currency} {money(r.totalCtcProposed)}</td>
                      <td>
                        <span className={`offer-status-pill ${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span>
                        {r.pendingWith && <div className="file-hint" style={{ marginTop: 4 }}>Pending: {r.pendingWith}</div>}
                      </td>
                      <td className="dim">{new Date(r.updatedAt).toLocaleDateString()}</td>
                      <td><a href={`/tools/offer-ai/proposal/${r.id}`} target="_blank" rel="noreferrer">View / download</a></td>
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

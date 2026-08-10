'use client';
import { useState } from 'react';
import AskShreeChat from '../../../components/AskShreeChat';

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

// A single upload slot — one document type, click or drop to attach.
function DocSlot({ label, sub, hint, file, onChange, multiple }) {
  const inputId = `doc-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const hasFile = multiple ? (file && file.length > 0) : !!file;
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="dropzone" onClick={() => document.getElementById(inputId).click()}>
        {hasFile ? (
          <span style={{ color: 'var(--amber)' }}>
            {multiple ? `✓ ${file.length} file${file.length > 1 ? 's' : ''} selected` : `✓ ${file.name}`}
          </span>
        ) : (
          <>
            <b style={{ color: 'var(--cream)' }}>{label}</b>
            {sub && <div style={{ marginTop: 4, fontSize: 11.5 }}>{sub}</div>}
          </>
        )}
      </div>
      <input id={inputId} type="file" multiple={!!multiple} accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
        onChange={(e) => onChange(multiple ? Array.from(e.target.files) : e.target.files[0])} />
      {hint && <div className="file-hint">{hint}</div>}
    </div>
  );
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
  const [tab, setTab] = useState('new');

  // --- Upload ---
  const [slots, setSlots] = useState({ cv: null, appointment_letter: null, payslip: [], education: [], jd: null, budget: null });
  const [extracting, setExtracting] = useState(false);
  const [extractNote, setExtractNote] = useState('');
  const [proposalId, setProposalId] = useState(null);
  const [documents, setDocuments] = useState([]);

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

  async function runExtract() {
    const files = [];
    if (slots.cv) files.push({ docType: 'cv', ...(await fileMeta(slots.cv)) });
    if (slots.appointment_letter) files.push({ docType: 'appointment_letter', ...(await fileMeta(slots.appointment_letter)) });
    if (slots.jd) files.push({ docType: 'jd', ...(await fileMeta(slots.jd)) });
    if (slots.budget) files.push({ docType: 'budget', ...(await fileMeta(slots.budget)) });
    for (const f of slots.payslip) files.push({ docType: 'payslip', ...(await fileMeta(f)) });
    for (const f of slots.education) files.push({ docType: 'education', ...(await fileMeta(f)) });

    if (!files.length) { setExtractNote('Upload at least one document.'); return; }
    setExtracting(true);
    setExtractNote('Reading the documents and identifying the candidate…');
    try {
      const res = await fetch('/api/tools/offer/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ files }),
      });
      const data = await res.json();
      if (data.locked) { setExtractNote(data.message); setExtracting(false); return; }
      if (data.error) { setExtractNote(data.error); setExtracting(false); return; }

      setProposalId(data.proposalId);
      setDocuments(data.documents || []);
      const e = data.extracted || {};
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
          ? 'Read. This candidate is already in your database — attaching to their existing record.'
          : 'Read. New candidate added to your database.'
      );
    } catch {
      setExtractNote('Something went wrong reading those documents.');
    }
    setExtracting(false);
  }

  async function fileMeta(file) {
    const base64 = await fileToBase64(file);
    return { base64, mimeType: file.type, fileName: file.name };
  }

  async function saveField(patch) {
    if (!proposalId) return;
    await fetch('/api/tools/offer/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposalId, patch }),
    });
  }

  async function recalc(nextComponents, nextHike) {
    if (!proposalId) return;
    setRecalculating(true);
    const res = await fetch('/api/tools/offer/recalculate', {
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
    const res = await fetch('/api/tools/offer/chat', {
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
    const res = await fetch('/api/tools/offer/send-for-approval', {
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
    const res = await fetch(`/api/tools/offer/dashboard?${q.toString()}`);
    const data = await res.json();
    if (data.error) { setDashNote(data.error); return; }
    setDashRows(data.rows);
    setDashJobRoles(data.jobRoles || []);
    setDashNote(data.rows.length ? '' : 'No proposals created under that email yet.');
  }

  return (
    <div style={{ position: 'relative' }}>
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
              <DocSlot label="CV" sub="Click to upload — PDF or Word" file={slots.cv} onChange={(f) => setSlots((s) => ({ ...s, cv: f }))} />
              <DocSlot label="Previous appointment letter" sub="Click to upload — PDF or Word" file={slots.appointment_letter} onChange={(f) => setSlots((s) => ({ ...s, appointment_letter: f }))} />
              <DocSlot label="Payslip(s)" sub="Click to upload — one or more" multiple file={slots.payslip} onChange={(f) => setSlots((s) => ({ ...s, payslip: f }))}
                hint="Upload the most recent one at least — AI reads every component on it." />
              <DocSlot label="Education certificates (optional)" sub="Click to upload — one or more" multiple file={slots.education} onChange={(f) => setSlots((s) => ({ ...s, education: f }))} />
              <DocSlot label="Job description" sub="Click to upload — PDF or Word" file={slots.jd} onChange={(f) => setSlots((s) => ({ ...s, jd: f }))} />
              <DocSlot label="Budget approval" sub="Click to upload — PDF or Word" file={slots.budget} onChange={(f) => setSlots((s) => ({ ...s, budget: f }))}
                hint="PDF or Word only for now — a spreadsheet upload here gets flagged for you to confirm the budget band manually." />
              <button className="primary-btn" onClick={runExtract} disabled={extracting}>
                {extracting ? 'Reading…' : 'Analyze documents'}
              </button>
              {extractNote && <div className="file-hint" style={{ marginTop: 12 }}>{extractNote}</div>}
            </>
          )}

          {proposalId && (
            <div style={{ marginTop: extractNote ? 0 : 8 }}>
              {extractNote && <div className="file-hint" style={{ marginBottom: 18 }}>{extractNote}</div>}

              {documents.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  {documents.map((d, i) => (
                    <div className="doc-chip-row" key={i}>
                      <span>{d.fileName || d.docType}</span>
                      <span className={`dtype ${d.needsReview ? 'review' : ''}`}>{d.needsReview ? `${d.docType} — confirm?` : d.docType}</span>
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
                      <label style={{ display: 'block', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'var(--slate)', marginBottom: 6 }}>{label}</label>
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
                <input type="number" placeholder="e.g. 20" value={hikePercent}
                  onChange={(e) => setHikePercent(e.target.value)}
                  onBlur={() => recalc(components, hikePercent)} />
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

              <div className="field-label" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: 'var(--slate)', margin: '20px 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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

              <div className="field-label" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: 'var(--slate)', margin: '20px 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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

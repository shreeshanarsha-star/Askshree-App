'use client';
import { useState } from 'react';
import AskShreeChat from '../../../components/AskShreeChat';
import { ROLE_LADDER, autoAssessmentForRole } from '../../../lib/assessments/roles';
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

const TEST_OPTIONS = [
  { value: 'big_five', label: 'Big Five — trait profile (manual only)' },
  { value: 'pulse', label: 'PULSE™ — Entry level → Sr. Manager' },
  { value: 'impact', label: 'IMPACT™ — GM → CXO / Executive' },
];

const TEST_NAMES = { big_five: 'Big Five', pulse: 'PULSE™', impact: 'IMPACT™' };

// A field that can either take the AI's reading of the CV ("Auto") or be set by
// the recruiter ("Manual"). Auto is the default everywhere — the toggle exists
// because the AI is decision support, not the decision.
function AutoManualField({ label, mode, setMode, autoValue, autoDisplay, children, note }) {
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
        <div className={`as-auto-value ${autoValue ? '' : 'empty'}`}>
          {autoValue ? (autoDisplay || autoValue) : 'Upload a CV — this fills in from it.'}
        </div>
      ) : children}
      {note && <div className="as-note">{note}</div>}
    </div>
  );
}

// Assessment.ai — recruiter assigns a psychometric assessment to a candidate,
// the candidate takes it on their own link, and the recruiter gets a scored
// breakdown. Three instruments: Big Five (IPIP-50, a neutral trait profile),
// PULSE™ (individual/leadership potential) and IMPACT™ (executive).
export default function AssessmentAI() {
  const { unlocked, checking, error, key: siteKeyVal, setKey, submit, siteFetch } = useSiteKey('/api/tools/site-key-check');
  const { token: authToken } = useOptionalSession();
  const [tab, setTab] = useState('assign');

  // --- Assign tab ---
  const [cvFile, setCvFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseNote, setParseNote] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [candidateId, setCandidateId] = useState(null);

  const [testMode, setTestMode] = useState('auto');
  const [roleMode, setRoleMode] = useState('auto');
  const [emailMode, setEmailMode] = useState('auto');
  const [contactMode, setContactMode] = useState('auto');

  const [manualTest, setManualTest] = useState('pulse');
  const [manualRole, setManualRole] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualContact, setManualContact] = useState('');
  const [candidateName, setCandidateName] = useState('');

  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignNote, setAssignNote] = useState('');
  const [assignLink, setAssignLink] = useState('');

  // --- Dashboard tab ---
  const [dashEmail, setDashEmail] = useState('');
  const [dashRows, setDashRows] = useState(null);
  const [dashJobRoles, setDashJobRoles] = useState([]);
  const [dashFilter, setDashFilter] = useState('');
  const [dashNote, setDashNote] = useState('');

  // Effective values — the toggle decides which side of each field wins.
  const effRole = roleMode === 'manual' ? manualRole : (extracted?.roleLevel || '');
  const effEmail = emailMode === 'manual' ? manualEmail : (extracted?.email || '');
  const effContact = contactMode === 'manual' ? manualContact : (extracted?.contact || '');
  // Auto never picks Big Five — it's a trait profile, not a role-fit test, so it
  // only ever gets used when a recruiter chooses it deliberately.
  const effTest = testMode === 'manual' ? manualTest : (effRole ? autoAssessmentForRole(effRole) : '');

  async function readCv() {
    if (!cvFile) return;
    setParsing(true);
    setParseNote('Reading the CV and extracting details…');
    try {
      const base64 = await fileToBase64(cvFile);
      const res = await siteFetch('/api/tools/assessment/parse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: { base64, mimeType: cvFile.type } }),
      });
      const data = await res.json();
      if (data.error) { setParseNote(data.error); setParsing(false); return; }
      setExtracted(data.extracted);
      setCandidateId(data.candidateId);
      setCandidateName(data.extracted.name || '');
      setManualRole(data.extracted.roleLevel || '');
      setManualEmail(data.extracted.email || '');
      setManualContact(data.extracted.contact || '');
      if (data.extracted.assessmentType) setManualTest(data.extracted.assessmentType);
      setParseNote(
        data.existingCandidate
          ? 'Read. This candidate is already in your database — the assessment will attach to their existing record.'
          : 'Read. New candidate added to your database.'
      );
    } catch (e) {
      setParseNote('Something went wrong reading that CV.');
    }
    setParsing(false);
  }

  async function assign() {
    if (!effEmail.includes('@')) { setAssignNote('A valid candidate email is required.'); return; }
    if (!effTest) { setAssignNote('Pick a test, or set the role so one can be selected automatically.'); return; }
    setAssigning(true);
    setAssignNote('Creating the assignment and sending the link…');
    setAssignLink('');
    const res = await siteFetch('/api/tools/assessment/assign', {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: JSON.stringify({
        candidateId,
        candidateName,
        email: effEmail,
        contact: effContact,
        roleLevel: effRole || null,
        assessmentType: effTest,
        assessmentSource: testMode,
        roleSource: roleMode,
        recruiterEmail,
        jobRole: jobRole || null,
      }),
    });
    const data = await res.json();
    setAssigning(false);
    if (data.locked) { setAssignNote(data.message); return; }
    if (data.error) { setAssignNote(data.error); return; }
    if (data.emailSent) {
      setAssignNote(`${data.assessmentName} (${data.questionCount} questions) sent to ${effEmail}.`);
    } else {
      setAssignNote(`${data.assessmentName} (${data.questionCount} questions) assigned. Email sending isn't configured yet — here's the candidate's link:`);
      setAssignLink(data.assessmentLink);
    }
  }

  async function loadDashboard(email, filter) {
    const e = (email ?? dashEmail).trim();
    if (!e.includes('@')) { setDashNote('Enter the email you assigned under.'); return; }
    setDashNote('Loading…');
    const q = new URLSearchParams({ email: e });
    const f = filter ?? dashFilter;
    if (f) q.set('jobRole', f);
    const res = await siteFetch(`/api/tools/assessment/dashboard?${q.toString()}`);
    const data = await res.json();
    if (data.error) { setDashNote(data.error); return; }
    setDashRows(data.rows);
    setDashJobRoles(data.jobRoles || []);
    setDashNote(data.rows.length ? '' : 'No assessments assigned under that email yet.');
  }

  if (checking) return null;
  if (!unlocked) {
    return (
      <KeyGate error={error} keyVal={siteKeyVal} setKey={setKey} submit={submit} checking={checking} label="Assessment.ai — enter key" />
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
        <h1 className="serif" style={{ fontSize: 26, color: 'var(--cream)', margin: '8px 0 12px' }}>Assessment.ai</h1>
        <p style={{ fontSize: 13.5, color: 'var(--slate)', maxWidth: 620, marginBottom: 28, textAlign: 'justify' }}>
          Assign a real psychometric assessment from a CV. Upload it, and AI reads the candidate's role
          level, email and contact — then picks the right instrument: PULSE™ for entry level through Sr.
          Manager, IMPACT™ for GM through CXO. The Big Five trait profile (IPIP-50) is available too, but
          only when you choose it: it describes how someone is wired, not how well they'd do the job.
          The candidate gets their own link, answers at their own pace, and you get the scored breakdown.
        </p>

        <div className="jp-tabs">
          <button className={`jp-tab ${tab === 'assign' ? 'active' : ''}`} onClick={() => setTab('assign')}>Assign</button>
          <button className={`jp-tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
        </div>

        <div className={`jp-panel ${tab === 'assign' ? 'active' : ''}`}>
          <div className="dropzone" onClick={() => document.getElementById('assess-cv-input').click()}>
            {cvFile ? cvFile.name : "Drop the candidate's CV here, or click to upload (PDF / Word)"}
          </div>
          <input id="assess-cv-input" type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
            onChange={(e) => { setCvFile(e.target.files[0]); setExtracted(null); setParseNote(''); }} />
          <div className="file-hint">
            We check your candidate database first — if this person is already there, the assessment attaches to their existing record rather than creating a duplicate.
          </div>
          <button className="primary-btn" onClick={readCv} disabled={!cvFile || parsing}>
            {parsing ? 'Reading…' : 'Read CV'}
          </button>
          {parseNote && <div className="file-hint" style={{ marginTop: 12 }}>{parseNote}</div>}

          <div style={{ marginTop: 26 }}>
            <div className="as-field">
              <div className="as-field-head"><label>Candidate name</label></div>
              <input type="text" placeholder="Candidate name" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
            </div>

            <AutoManualField
              label="Assignment / Test"
              mode={testMode} setMode={setTestMode}
              autoValue={effTest}
              autoDisplay={effTest ? `${TEST_NAMES[effTest]} — selected from role level` : ''}
              note="Auto picks PULSE™ up to Sr. Manager and IMPACT™ from AGM upward. Big Five is manual-only."
            >
              <select value={manualTest} onChange={(e) => setManualTest(e.target.value)}>
                {TEST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </AutoManualField>

            <AutoManualField label="Role" mode={roleMode} setMode={setRoleMode} autoValue={extracted?.roleLevel || ''}>
              <select value={manualRole} onChange={(e) => setManualRole(e.target.value)}>
                <option value="">Select a role level…</option>
                {ROLE_LADDER.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </AutoManualField>

            <AutoManualField label="Email" mode={emailMode} setMode={setEmailMode} autoValue={extracted?.email || ''}>
              <input type="email" placeholder="candidate@email.com" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} />
            </AutoManualField>

            <AutoManualField label="Contact" mode={contactMode} setMode={setContactMode} autoValue={extracted?.contact || ''}>
              <input type="text" placeholder="+91 …" value={manualContact} onChange={(e) => setManualContact(e.target.value)} />
            </AutoManualField>

            <div className="as-field">
              <div className="as-field-head"><label>Your email (so this shows on your dashboard)</label></div>
              <input type="email" placeholder="you@company.com" value={recruiterEmail} onChange={(e) => setRecruiterEmail(e.target.value)} />
            </div>
            <div className="as-field">
              <div className="as-field-head"><label>Job / role you're hiring for (optional)</label></div>
              <input type="text" placeholder="e.g. Head of Supply Chain" value={jobRole} onChange={(e) => setJobRole(e.target.value)} />
              <div className="as-note">Used to group candidates on your dashboard.</div>
            </div>
          </div>

          <button className="primary-btn" onClick={assign} disabled={assigning || !effEmail.includes('@') || !effTest}>
            {assigning ? 'Assigning…' : 'Assign assessment'}
          </button>
          {assignNote && <div className="file-hint" style={{ marginTop: 14 }}>{assignNote}</div>}
          {assignLink && (
            <div className="file-hint" style={{ marginTop: 8 }}>
              <a href={assignLink} style={{ color: 'var(--amber)' }}>{assignLink}</a>
            </div>
          )}
        </div>

        <div className={`jp-panel ${tab === 'dashboard' ? 'active' : ''}`}>
          <div className="email-line">
            <span>Show assessments assigned under:</span>
            <input type="email" placeholder="you@company.com" value={dashEmail} onChange={(e) => setDashEmail(e.target.value)} />
            <button className="primary-btn" style={{ marginTop: 0 }} onClick={() => loadDashboard()}>Load</button>
          </div>
          {dashJobRoles.length > 0 && (
            <div className="email-line">
              <span>Job / role:</span>
              <select className="sort-select" value={dashFilter}
                onChange={(e) => { setDashFilter(e.target.value); loadDashboard(dashEmail, e.target.value); }}>
                <option value="">All roles</option>
                {dashJobRoles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}
          {dashNote && <div className="file-hint" style={{ marginTop: 12 }}>{dashNote}</div>}

          {dashRows && dashRows.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table className="assess-table">
                <thead>
                  <tr>
                    <th>Candidate</th><th>Role</th><th>Test</th><th>Contact</th><th>Email</th><th>Score</th><th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {dashRows.map((r) => (
                    <tr key={r.id}>
                      <td className="name-cell">{r.name}</td>
                      <td>{r.roleLevel}</td>
                      <td>{r.assessmentName}</td>
                      <td>{r.contact}</td>
                      <td>{r.email}</td>
                      <td>
                        {!r.hasResult ? '—' : r.evaluative ? `${r.score}/100` : 'Profile'}
                      </td>
                      <td>
                        {r.hasResult
                          ? <a href={`/tools/assessment-ai/result/${r.id}`}>View result</a>
                          : <span style={{ color: 'var(--slate)' }}>{r.status === 'registered' ? 'In progress' : 'Not started'}</span>}
                      </td>
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

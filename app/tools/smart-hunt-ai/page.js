'use client';
import { useState } from 'react';
import AskShreeChat from '../../../components/AskShreeChat';
import { useSiteKey } from '../../../lib/useSiteKey';
import { KeyGate } from '../../../components/KeyGate';
import { useOptionalSession } from '../../../lib/useOptionalSession';
import { AccountBadge } from '../../../components/AccountBadge';
import CandidateResults from '../../../components/CandidateResults';
import SavedSearches from '../../../components/SavedSearches';


// Smart Hunt.ai — original spec: manual X-ray search across public
// candidate data. Keywords/location/company in, AI builds the search and
// scores what comes back. Same finalized results table as Smart Source.ai
// (Match % bar, contact reveal, share via email, Excel export) — no JD
// upload, no database merge, no local files here, that's Smart Source.ai's
// job.
export default function SmartHuntAI() {
  const { unlocked, checking, error, key: siteKeyVal, setKey, submit, siteFetch } = useSiteKey('/api/tools/site-key-check');
  const { token: authToken } = useOptionalSession();

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [keywords, setKeywords] = useState('');
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState('');
  const [candidates, setCandidates] = useState(null);

  const [selected, setSelected] = useState(new Set());
  const [contactState, setContactState] = useState({});
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
        setContactState((prev) => ({ ...prev, [key]: { loading: false, revealed: true, email: data.email, phone: data.phone, emailConfidence: data.emailConfidence, phoneConfidence: data.phoneConfidence } }));
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
            ? { loading: false, revealed: true, email: r.email, phone: r.phone, emailConfidence: r.emailConfidence, phoneConfidence: r.phoneConfidence }
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
    XLSX.writeFile(book, 'smart-hunt-candidates.xlsx');
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
    setCandidates(null);
    setSelected(new Set());
    setContactState({});

    // Narrative status while the search runs — cycles on its own timer,
    // independent of the actual request, so it always reads naturally
    // whether the search takes one second or ten.
    const steps = company.trim()
      ? [`Exploring ${company.trim()}…`, 'Identifying candidates…', 'Scoring matches…', 'Here we go…']
      : ['Casting the net…', 'Identifying candidates…', 'Scoring matches…', 'Here we go…'];
    let stepIndex = 0;
    setNote(steps[0]);
    const stepTimer = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, steps.length - 1);
      setNote(steps[stepIndex]);
    }, 1100);

    const body = {
      company, role, location,
      skills: skillsInput.split(',').map((s) => s.trim()).filter(Boolean),
      keywords,
    };
    const res = await siteFetch('/api/tools/smart-hunt/search', {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: JSON.stringify(body),
    });
    const data = await res.json();
    clearInterval(stepTimer);
    setRunning(false);
    if (data.locked) { setNote(data.message); return; }
    if (data.error) { setNote(data.error); return; }
    setCandidates(data.candidates || []);
    setNote(data.candidates?.length
      ? `Found ${data.candidates.length} candidate${data.candidates.length > 1 ? 's' : ''}.`
      : "Came up empty — try loosening a field or two.");
  }

  const canSearch = !running && (company.trim() || role.trim() || location.trim() || skillsInput.trim() || keywords.trim());

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
          You want to head hunt? Let AI do the job for you. Fill in as many or as few fields as you like —
          reveal contact details, select candidates to share by email, or export the full list to Excel.
        </p>

        <div className="jp-panel active">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <SavedSearches
              tool="smart_hunt"
              siteFetch={siteFetch}
              getParams={() => ({ company, role, location, skillsInput, keywords })}
              onLoad={(p) => {
                setCompany(p.company || '');
                setRole(p.role || '');
                setLocation(p.location || '');
                setSkillsInput(p.skillsInput || '');
                setKeywords(p.keywords || '');
              }}
            />
          </div>
          <input className="free-text-input" type="text" placeholder="1. Company — e.g. Razorpay"
            value={company} onChange={(e) => setCompany(e.target.value)} />
          <input className="free-text-input" style={{ marginTop: 10 }} type="text" placeholder="2. Role — e.g. Sourcing Manager"
            value={role} onChange={(e) => setRole(e.target.value)} />
          <input className="free-text-input" style={{ marginTop: 10 }} type="text" placeholder="3. Location / Country — e.g. Bengaluru"
            value={location} onChange={(e) => setLocation(e.target.value)} />
          <input className="free-text-input" style={{ marginTop: 10 }} type="text" placeholder="4. Skills, comma-separated — e.g. Talent Acquisition, Sourcing"
            value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} />
          <input className="free-text-input" style={{ marginTop: 10 }} type="text" placeholder="5. Keywords — any other exact terms or phrases"
            value={keywords} onChange={(e) => setKeywords(e.target.value)} />

          <button className="primary-btn" onClick={runSearch} disabled={!canSearch}>
            {running ? 'Searching…' : 'Search'}
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

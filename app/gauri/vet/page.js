'use client';
import { useEffect, useState } from 'react';

// Vet dashboard — case queue on the left, detail + AI draft + approve/edit/
// reject on the right. This is the only place the AI's draft triage is ever
// shown; it never reaches the farmer directly, only via an approved
// final_recommendation.
const STATUS_LABEL = {
  pending_ai: 'Awaiting AI draft',
  pending_vet_review: 'Needs review',
  approved: 'Approved',
  rejected: 'Rejected',
};
const STATUS_COLOR = {
  pending_ai: { background: 'rgba(232,163,61,0.1)', color: 'var(--amber)' },
  pending_vet_review: { background: 'rgba(232,163,61,0.18)', color: 'var(--amber)' },
  approved: { background: 'rgba(120,200,140,0.15)', color: '#7bd08f' },
  rejected: { background: 'rgba(220,80,80,0.15)', color: '#e28080' },
};

export default function GauriVetDashboard() {
  const [account, setAccount] = useState(undefined);
  const [cases, setCases] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [finalRec, setFinalRec] = useState('');
  const [vetNotes, setVetNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  async function loadMe() {
    const res = await fetch('/api/gauri/me');
    const data = await res.json();
    setAccount(data.account || null);
    if (!data.account) window.location.href = '/gauri/login';
  }
  async function loadCases() {
    const res = await fetch('/api/gauri/cases');
    if (res.status === 401) { window.location.href = '/gauri/login'; return; }
    const data = await res.json();
    setCases(data.cases || []);
  }

  useEffect(() => { loadMe(); loadCases(); }, []);

  const selected = cases.find((c) => c.id === selectedId);
  let draft = null;
  if (selected?.ai_draft) {
    try { draft = JSON.parse(selected.ai_draft); } catch (e) { draft = null; }
  }

  function openCase(c) {
    setSelectedId(c.id);
    setFinalRec(draft?.suggested_direction || '');
    setVetNotes('');
    setNote('');
  }

  async function act(action) {
    if (!selected) return;
    if (action === 'approve' && !finalRec.trim()) { setNote('Write a recommendation before approving.'); return; }
    setBusy(true);
    const res = await fetch(`/api/gauri/cases/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, finalRecommendation: finalRec, vetNotes }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setSelectedId(null);
      loadCases();
    } else {
      setNote(data.error || 'Could not save that.');
    }
  }

  async function logout() {
    await fetch('/api/gauri/logout', { method: 'POST' });
    window.location.href = '/gauri/login';
  }

  if (account === undefined) return <div className="admin-main">Loading…</div>;

  return (
    <div className="admin-shell">
      <div className="admin-side">
        <div className="logo">Gauri<span>.ai</span></div>
        <div className="admin-nav">
          <a href="/gauri/vet" className="active">Case queue</a>
          <a onClick={logout} style={{ cursor: 'pointer' }}>Sign out ({account?.displayName})</a>
        </div>
      </div>
      <div className="admin-main">
        <div className="admin-header"><h2>Case queue</h2></div>

        {!selected && (
          <div className="panel">
            <div className="panel-head"><h3>{cases.length} case(s)</h3></div>
            <table className="admin-table">
              <thead><tr><th>Farmer</th><th>Cow</th><th>Issue</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td className="name-cell">{c.farmer_name || 'Not given'}</td>
                    <td>{c.cow_details || '—'}</td>
                    <td style={{ maxWidth: 280 }}>{c.issue_text?.slice(0, 90)}{c.issue_text?.length > 90 ? '…' : ''}</td>
                    <td><span className="status-pill" style={STATUS_COLOR[c.status] || {}}>{STATUS_LABEL[c.status] || c.status}</span></td>
                    <td><span className="row-action" onClick={() => openCase(c)}>Open</span></td>
                  </tr>
                ))}
                {cases.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--slate)' }}>No cases yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <div className="panel">
            <div className="panel-head">
              <h3>{selected.farmer_name || 'Farmer'} — {selected.cow_details || 'cow details not given'}</h3>
              <span className="action" style={{ cursor: 'pointer' }} onClick={() => setSelectedId(null)}>← Back to queue</span>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <div className="file-hint" style={{ marginBottom: 14 }}><b style={{ color: 'var(--cream)' }}>Farmer's description:</b><br />{selected.issue_text}</div>

              {draft ? (
                <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 14, marginBottom: 16, background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--amber)', marginBottom: 8, textTransform: 'uppercase' }}>
                    AI draft — urgency: {draft.urgency} ({draft.urgency_reason})
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--cream)', marginBottom: 8 }}>
                    <b>Likely causes:</b> {(draft.likely_causes || []).join(', ')}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--cream)' }}>
                    <b>Immediate care:</b> {(draft.immediate_care || []).join('; ')}
                  </div>
                </div>
              ) : (
                <div className="file-hint" style={{ marginBottom: 16 }}>No AI draft available — write a recommendation from scratch.</div>
              )}

              <label style={{ fontSize: 11.5, color: 'var(--slate)', display: 'block', marginBottom: 6 }}>Final recommendation (this is what the farmer sees)</label>
              <textarea className="free-text-input" style={{ minHeight: 90 }} value={finalRec} onChange={(e) => setFinalRec(e.target.value)} />

              <label style={{ fontSize: 11.5, color: 'var(--slate)', display: 'block', margin: '12px 0 6px' }}>Internal vet notes (not shown to farmer)</label>
              <textarea className="free-text-input" style={{ minHeight: 60 }} value={vetNotes} onChange={(e) => setVetNotes(e.target.value)} />

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="primary-btn" disabled={busy} onClick={() => act('approve')}>Approve &amp; send</button>
                <button className="primary-btn" style={{ borderColor: 'rgba(220,80,80,0.4)', color: '#e28080' }} disabled={busy} onClick={() => act('reject')}>Reject</button>
              </div>
              {note && <div className="file-hint" style={{ marginTop: 10 }}>{note}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

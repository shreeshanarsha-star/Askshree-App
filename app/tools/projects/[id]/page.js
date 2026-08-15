'use client';
import { useEffect, useState } from 'react';
import AskShreeChat from '../../../../components/AskShreeChat';
import { useSiteKey } from '../../../../lib/useSiteKey';
import { KeyGate } from '../../../../components/KeyGate';
import { AccountBadge } from '../../../../components/AccountBadge';
import EditableCell from '../../../../components/EditableCell';

function scoreColor(score) {
  if (score == null) return 'var(--slate)';
  return score >= 70 ? 'var(--amber)' : score >= 40 ? 'var(--amber-dim)' : 'var(--slate)';
}

const STATUS_LABELS = { shortlisted: 'Shortlisted', rejected: 'Rejected', screen_later: 'Screen later' };
const STATUS_COLORS = { shortlisted: 'var(--amber)', rejected: '#c0665f', screen_later: 'var(--slate)' };
const OUTREACH = ['new', 'contacted', 'responded', 'rejected'];
const OUTREACH_LABELS = { new: 'New', contacted: 'Contacted', responded: 'Responded', rejected: 'Rejected' };
const OUTREACH_COLORS = { new: 'var(--slate)', contacted: 'var(--amber-dim)', responded: 'var(--amber)', rejected: '#c0665f' };

function CommentsCell({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--amber-dim)', borderRadius: 4,
            padding: '5px 7px', color: 'var(--cream)', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace',
            outline: 'none', resize: 'vertical',
          }}
        />
        <button
          onClick={() => { setEditing(false); onSave(draft); }}
          style={{ fontSize: 10.5, color: 'var(--amber)', border: '1px solid var(--amber-dim)', borderRadius: 12, padding: '3px 10px', background: 'transparent', alignSelf: 'flex-start' }}
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <span onClick={() => { setDraft(value || ''); setEditing(true); }} style={{ cursor: 'pointer', color: value ? 'var(--cream)' : 'var(--slate)', fontStyle: value ? 'normal' : 'italic', fontSize: 11 }}>
      {value || 'Add comment'}
    </span>
  );
}

// A single project's saved shortlist — same table shape as Smart Source.ai
// / Smart Hunt.ai results (Match % bar, editable Qualification/CTC/Notice,
// contact reveal, share via email, Excel export), plus what only makes
// sense once a candidate is saved: a Shortlisted/Rejected/Screen-later
// status, free-text comments, and per-row removal.
export default function ProjectDetail({ params }) {
  const { unlocked, checking, error, key: siteKeyVal, setKey, submit, siteFetch } = useSiteKey('/api/tools/site-key-check');
  const [project, setProject] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [contactState, setContactState] = useState({});
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTo, setShareTo] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!unlocked) return;
    siteFetch(`/api/tools/projects/${params.id}`).then((r) => r.json()).then((d) => {
      if (d.ok) { setProject(d.project); setCandidates(d.candidates); }
    });
  }, [unlocked]);

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function patchCandidate(id, fields) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));
    await siteFetch(`/api/tools/projects/${params.id}/candidates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
  }

  async function removeCandidate(id) {
    await siteFetch(`/api/tools/projects/${params.id}/candidates/${id}`, { method: 'DELETE' });
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  async function revealContactFor(c) {
    setContactState((prev) => ({ ...prev, [c.id]: { loading: true } }));
    try {
      const res = await siteFetch('/api/tools/smart-source/reveal-contact', {
        method: 'POST',
        body: JSON.stringify({ name: c.name, company: c.company, profileUrl: c.profile_url }),
      });
      const data = await res.json();
      if (data.ok) {
        setContactState((prev) => ({ ...prev, [c.id]: { loading: false, revealed: true, email: data.email, phone: data.phone } }));
      } else {
        setContactState((prev) => ({ ...prev, [c.id]: { loading: false, revealed: false, message: data.message } }));
      }
    } catch (e) {
      setContactState((prev) => ({ ...prev, [c.id]: { loading: false, revealed: false, message: 'Could not look up contact details.' } }));
    }
  }

  async function exportToExcel() {
    const XLSX = await import('xlsx');
    const rows = candidates
      .filter((c) => selected.size === 0 || selected.has(c.id))
      .map((c) => ({
        Candidate: c.name || '', Designation: c.designation || '', Company: c.company || '',
        Location: c.location || '', 'Match %': c.match_score != null ? c.match_score : '',
        Qualification: c.qualification || '', 'Current CTC': c.current_ctc || '', 'Expected CTC': c.expected_ctc || '',
        'Notice Period': c.notice_period || '', Status: STATUS_LABELS[c.status] || '', Outreach: OUTREACH_LABELS[c.outreach_status || 'new'], Comments: c.comments || '',
        'Profile URL': c.profile_url || '',
      }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Candidates');
    XLSX.writeFile(book, `${(project?.name || 'project').replace(/[^a-z0-9]+/gi, '-')}.xlsx`);
  }

  async function sendShareEmail() {
    setSharing(true);
    setShareNote('');
    const toShare = candidates.filter((c) => selected.has(c.id));
    const res = await siteFetch('/api/tools/smart-source/share-email', {
      method: 'POST',
      body: JSON.stringify({ to: shareTo, candidates: toShare }),
    });
    const data = await res.json();
    setSharing(false);
    if (data.ok) {
      setShareNote('Sent.');
      setTimeout(() => { setShareOpen(false); setShareNote(''); }, 1400);
    } else {
      setShareNote(data.error || 'Could not send that email.');
    }
  }

  if (checking) return null;
  if (!unlocked) {
    return <KeyGate error={error} keyVal={siteKeyVal} setKey={setKey} submit={submit} checking={checking} label="Projects — enter key" />;
  }

  return (
    <div style={{ position: 'relative' }}>
      <AccountBadge />
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '44px 56px 80px', maxWidth: 1180, margin: '0 auto' }}>
        <div className="eyebrow"><a href="/tools/projects" style={{ color: 'var(--amber-dim)' }}>Projects</a> / {project?.name || '…'}</div>
        <h1 className="serif" style={{ fontSize: 26, color: 'var(--cream)', margin: '8px 0 20px' }}>{project?.name || 'Loading…'}</h1>

        {candidates === null && <div className="file-hint">Loading…</div>}
        {candidates && candidates.length === 0 && (
          <div className="file-hint">No candidates in this project yet — add some from Smart Source.ai or Smart Hunt.ai.</div>
        )}

        {candidates && candidates.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 12px', flexWrap: 'wrap', gap: 10 }}>
              <div className="file-hint" style={{ margin: 0 }}>
                {candidates.length} candidate{candidates.length > 1 ? 's' : ''}{selected.size > 0 ? ` — ${selected.size} selected` : ''}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShareOpen((v) => !v)} disabled={selected.size === 0}
                  style={{
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 11.5, color: selected.size ? 'var(--amber)' : 'var(--slate)',
                    border: '1px solid ' + (selected.size ? 'var(--amber-dim)' : 'var(--line)'), borderRadius: 20, padding: '8px 14px',
                    background: 'transparent', cursor: selected.size ? 'pointer' : 'not-allowed',
                  }}>
                  Share via email
                </button>
                <button type="button" onClick={exportToExcel}
                  style={{
                    fontFamily: 'IBM Plex Mono, monospace', fontSize: 11.5, color: 'var(--amber)',
                    border: '1px solid var(--amber-dim)', borderRadius: 20, padding: '8px 14px', background: 'transparent', cursor: 'pointer',
                  }}>
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
                    <th></th><th>Candidate</th><th>Designation</th><th>Company</th><th>Location</th><th>Match</th>
                    <th>Qualification</th><th>Current CTC</th><th>Expected CTC</th><th>Notice</th>
                    <th>Status</th><th>Outreach</th><th>Comments</th><th>Contact</th><th>Profile</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => {
                    const cs = contactState[c.id] || {};
                    return (
                      <tr key={c.id}>
                        <td><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} /></td>
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
                        <td><EditableCell value={c.qualification} onChange={(v) => patchCandidate(c.id, { qualification: v })} /></td>
                        <td><EditableCell value={c.current_ctc} onChange={(v) => patchCandidate(c.id, { current_ctc: v })} /></td>
                        <td><EditableCell value={c.expected_ctc} onChange={(v) => patchCandidate(c.id, { expected_ctc: v })} /></td>
                        <td><EditableCell value={c.notice_period} onChange={(v) => patchCandidate(c.id, { notice_period: v })} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {['shortlisted', 'rejected', 'screen_later'].map((s) => (
                              <button
                                key={s}
                                onClick={() => patchCandidate(c.id, { status: c.status === s ? null : s })}
                                title={STATUS_LABELS[s]}
                                style={{
                                  fontSize: 9.5, fontFamily: 'IBM Plex Mono, monospace', padding: '3px 6px', borderRadius: 10,
                                  border: '1px solid ' + (c.status === s ? STATUS_COLORS[s] : 'var(--line)'),
                                  color: c.status === s ? STATUS_COLORS[s] : 'var(--slate)',
                                  background: 'transparent', whiteSpace: 'nowrap',
                                }}
                              >
                                {s === 'shortlisted' ? 'Short' : s === 'rejected' ? 'Rej' : 'Later'}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {OUTREACH.map((s) => (
                              <button
                                key={s}
                                onClick={() => patchCandidate(c.id, { outreach_status: s })}
                                title={OUTREACH_LABELS[s]}
                                style={{
                                  fontSize: 9.5, fontFamily: 'IBM Plex Mono, monospace', padding: '3px 6px', borderRadius: 10,
                                  border: '1px solid ' + ((c.outreach_status || 'new') === s ? OUTREACH_COLORS[s] : 'var(--line)'),
                                  color: (c.outreach_status || 'new') === s ? OUTREACH_COLORS[s] : 'var(--slate)',
                                  background: 'transparent', whiteSpace: 'nowrap',
                                }}
                              >
                                {OUTREACH_LABELS[s]}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td><CommentsCell value={c.comments} onSave={(v) => patchCandidate(c.id, { comments: v })} /></td>
                        <td>
                          {cs.revealed ? (
                            <span style={{ fontSize: 11 }}>{cs.email || cs.phone || '—'}</span>
                          ) : (
                            <button type="button" onClick={() => revealContactFor(c)} disabled={cs.loading} title={cs.message || ''}
                              style={{
                                fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: 'var(--slate)',
                                border: '1px solid var(--line)', borderRadius: 14, padding: '5px 11px', background: 'transparent',
                                cursor: cs.loading ? 'default' : 'pointer', whiteSpace: 'nowrap',
                              }}>
                              {cs.loading ? '…' : cs.message ? 'Not available' : 'Reveal contact'}
                            </button>
                          )}
                        </td>
                        <td>{c.profile_url ? <a href={c.profile_url} target="_blank" rel="noreferrer">View</a> : '—'}</td>
                        <td>
                          <a href="#" onClick={(e) => { e.preventDefault(); removeCandidate(c.id); }} style={{ color: 'var(--slate)', fontSize: 11 }}>Remove</a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <AskShreeChat />
    </div>
  );
}

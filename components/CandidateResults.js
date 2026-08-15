'use client';
import { useMemo, useState } from 'react';
import AddToProjectButton from './AddToProjectButton';
import EditableCell from './EditableCell';

function scoreColor(score) {
  if (score == null) return 'var(--slate)';
  return score >= 70 ? 'var(--amber)' : score >= 40 ? 'var(--amber-dim)' : 'var(--slate)';
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

// Shared results view for Smart Source.ai and Smart Hunt.ai — a responsive
// card grid instead of an 11-column table, so nothing needs a horizontal
// scrollbar to read. Adds client-side sort (by match %, default) and a
// live search box so a recruiter can narrow a big result set fast, plus
// a "select all visible" toggle that respects whatever the search/sort
// currently has on screen.
export default function CandidateResults({
  candidates, candidateKey, selected, toggleSelect, setSelected,
  contactState, revealContactFor, updateCandidateField,
  siteFetch, cached,
  shareOpen, setShareOpen, shareTo, setShareTo, shareNote, sharing, sendShareEmail,
  exportToExcel,
}) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('match');

  const visible = useMemo(() => {
    let list = candidates;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        [c.name, c.company, c.designation, c.location].some((f) => (f || '').toLowerCase().includes(q))
      );
    }
    list = [...list];
    if (sortBy === 'match') {
      list.sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1));
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return list;
  }, [candidates, query, sortBy]);

  const allVisibleSelected = visible.length > 0 && visible.every((c) => selected.has(candidateKey(c)));

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visible.forEach((c) => next.delete(candidateKey(c)));
      } else {
        visible.forEach((c) => next.add(candidateKey(c)));
      }
      return next;
    });
  }

  return (
    <>
      <div className="cand-toolbar">
        <div className="cand-toolbar-left">
          <label className="cand-selectall">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
            {candidates.length} candidate{candidates.length > 1 ? 's' : ''}{selected.size > 0 ? ` — ${selected.size} selected` : ''}
          </label>
          {cached && <span className="file-hint" style={{ margin: 0 }}>showing results from a recent matching search</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="cand-search" type="text" placeholder="Search name, company, location…"
            value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="cand-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="match">Sort: Match %</option>
            <option value="name">Sort: Name</option>
          </select>
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

      {visible.length === 0 ? (
        <div className="cand-empty">No candidates match "{query}".</div>
      ) : (
        <div className="cand-grid">
          {visible.map((c) => {
            const key = candidateKey(c);
            const cs = contactState[key] || {};
            const isSelected = selected.has(key);
            const score = c.match_score;
            return (
              <div key={key} className={`cand-card${isSelected ? ' selected' : ''}`}>
                <div className="cand-card-top">
                  <input className="cand-check" type="checkbox" checked={isSelected} onChange={() => toggleSelect(c)} />
                  <div className="cand-avatar">{initials(c.name)}</div>
                  <div className="cand-id">
                    <div className="cand-name" title={c.name || ''}>{c.name || 'Unknown'}</div>
                    <div className="cand-role" title={`${c.designation || ''}${c.company ? ' · ' + c.company : ''}`}>
                      {c.designation || '—'}{c.company ? ` · ${c.company}` : ''}
                    </div>
                  </div>
                  {score != null && (
                    <div className="cand-ring" style={{ background: `conic-gradient(${scoreColor(score)} ${score}%, rgba(255,255,255,0.08) 0)` }}>
                      <div className="cand-ring-inner" style={{ color: scoreColor(score) }}>{score}%</div>
                    </div>
                  )}
                </div>

                <div className="cand-chips">
                  {c.location && <span className="cand-chip">{c.location}</span>}
                  {c.notice_period && <span className="cand-chip">Notice: {c.notice_period}</span>}
                </div>

                <div className="cand-field-row">
                  <div className="cand-field">
                    <div className="cand-field-label">Qualification</div>
                    <EditableCell value={c.qualification} onChange={(v) => updateCandidateField(key, 'qualification', v)} />
                  </div>
                </div>
                <div className="cand-field-row">
                  <div className="cand-field">
                    <div className="cand-field-label">Current CTC</div>
                    <EditableCell value={c.current_ctc} onChange={(v) => updateCandidateField(key, 'current_ctc', v)} />
                  </div>
                  <div className="cand-field">
                    <div className="cand-field-label">Expected CTC</div>
                    <EditableCell value={c.expected_ctc} onChange={(v) => updateCandidateField(key, 'expected_ctc', v)} />
                  </div>
                </div>

                <div className="cand-actions">
                  {cs.revealed ? (
                    <span style={{ fontSize: 11.5, color: 'var(--cream)' }}>{cs.email || cs.phone || '—'}</span>
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
                  {c.profile_url && (
                    <a href={c.profile_url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: 'var(--amber)' }}>View profile</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

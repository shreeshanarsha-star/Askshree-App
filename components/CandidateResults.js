'use client';
import { useMemo, useState } from 'react';
import AddToProjectButton from './AddToProjectButton';
import EditableCell from './EditableCell';
import CompareDrawer from './CompareDrawer';

function scoreColor(score) {
  if (score == null) return 'var(--slate)';
  return score >= 70 ? 'var(--amber)' : score >= 40 ? 'var(--amber-dim)' : 'var(--slate)';
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

const OUTREACH = ['new', 'contacted', 'responded', 'rejected'];
const OUTREACH_LABELS = { new: 'New', contacted: 'Contacted', responded: 'Responded', rejected: 'Rejected' };
const OUTREACH_COLORS = { new: 'var(--slate)', contacted: 'var(--amber-dim)', responded: 'var(--amber)', rejected: '#c0665f' };
const MAX_COMPARE = 4;

const LAYOUTS = [
  { id: 'cards', label: 'Cards' },
  { id: 'list', label: 'Ranked list' },
  { id: 'pipeline', label: 'Pipeline board' },
  { id: 'dossier', label: 'Dossier' },
  { id: 'table', label: 'Table' },
];

// Shared results view for Smart Source.ai and Smart Hunt.ai. Five selectable
// layouts share one filtered/sorted/paginated candidate list and the same
// underlying actions (select, outreach status, reveal contact, compare,
// add to project) so switching views never loses state:
//  - cards: the default responsive card grid (2-5 per row)
//  - list: a ranked, scannable digest with a summary strip and inline reasoning
//  - pipeline: candidates grouped into New/Contacted/Responded/Rejected columns
//  - dossier: fewer, larger cards for a shortlist, reason always expanded
//  - table: the original dense multi-column table, opt-in only, scoped
//    horizontal scroll (this is what the card grid replaced — kept as a
//    power-user option, not the default)
export default function CandidateResults({
  candidates, candidateKey, selected, toggleSelect, setSelected,
  contactState, revealContactFor, updateCandidateField,
  siteFetch, cached,
  shareOpen, setShareOpen, shareTo, setShareTo, shareNote, sharing, sendShareEmail,
  exportToExcel,
}) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('match');
  const [layout, setLayout] = useState('cards');
  const [expandedReason, setExpandedReason] = useState(new Set());
  const [compareKeys, setCompareKeys] = useState(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [bulkRevealing, setBulkRevealing] = useState(false);
  const [cols, setCols] = useState(2);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageCandidates = useMemo(
    () => visible.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visible, currentPage, pageSize]
  );

  function changePage(p) {
    setPage(Math.max(1, Math.min(pageCount, p)));
  }

  function changePageSize(size) {
    setPageSize(size);
    setPage(1);
  }

  const pageWindow = useMemo(() => {
    const windowSize = 5;
    let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    let end = Math.min(pageCount, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    const pages = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }, [currentPage, pageCount]);

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

  function toggleReason(key) {
    setExpandedReason((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function togglePin(key) {
    setCompareKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); return next; }
      if (next.size >= MAX_COMPARE) return next;
      next.add(key);
      return next;
    });
  }

  async function bulkRevealContact() {
    setBulkRevealing(true);
    const targets = candidates.filter((c) => selected.has(candidateKey(c)) && !(contactState[candidateKey(c)] || {}).revealed);
    for (const c of targets) {
      await revealContactFor(c);
    }
    setBulkRevealing(false);
  }

  const compareCandidates = candidates.filter((c) => compareKeys.has(candidateKey(c)));

  // ---------- Ranked-list summary strip ----------
  const insights = useMemo(() => {
    if (visible.length === 0) return null;
    const scored = visible.filter((c) => c.match_score != null);
    const avg = scored.length ? Math.round(scored.reduce((s, c) => s + c.match_score, 0) / scored.length) : null;
    const locationCounts = {};
    visible.forEach((c) => { if (c.location) locationCounts[c.location] = (locationCounts[c.location] || 0) + 1; });
    const topLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0];
    return { count: visible.length, avg, topLocation: topLocation ? topLocation[0] : null, topLocationCount: topLocation ? topLocation[1] : 0 };
  }, [visible]);

  // ---------- Pipeline grouping ----------
  const pipelineGroups = useMemo(() => {
    const groups = { new: [], contacted: [], responded: [], rejected: [] };
    visible.forEach((c) => {
      const s = c.outreach_status || 'new';
      (groups[s] || groups.new).push(c);
    });
    return groups;
  }, [visible]);

  function renderOutreachPills(c, key, outreach) {
    return (
      <div className="cand-outreach">
        {OUTREACH.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => updateCandidateField(key, 'outreach_status', outreach === s ? 'new' : s)}
            title={OUTREACH_LABELS[s]}
            style={{
              border: '1px solid ' + (outreach === s ? OUTREACH_COLORS[s] : 'var(--line)'),
              color: outreach === s ? OUTREACH_COLORS[s] : 'var(--slate)',
            }}
          >
            {OUTREACH_LABELS[s]}
          </button>
        ))}
      </div>
    );
  }

  function renderCandidateCard(c, { forceReason = false, dossier = false } = {}) {
    const key = candidateKey(c);
    const cs = contactState[key] || {};
    const isSelected = selected.has(key);
    const isPinned = compareKeys.has(key);
    const score = c.match_score;
    const outreach = c.outreach_status || 'new';
    const showReason = forceReason ? !!c.match_reason : (c.match_reason && expandedReason.has(key));
    return (
      <div key={key} className={`cand-card${isSelected ? ' selected' : ''}${dossier ? ' cand-card-dossier' : ''}`}>
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
            <div
              className="cand-ring"
              onClick={() => !forceReason && c.match_reason && toggleReason(key)}
              title={c.match_reason && !forceReason ? 'Click for why this match' : ''}
              style={{ background: `conic-gradient(${scoreColor(score)} ${score}%, rgba(255,255,255,0.08) 0)`, cursor: !forceReason && c.match_reason ? 'pointer' : 'default' }}
            >
              <div className="cand-ring-inner" style={{ color: scoreColor(score) }}>{score}%</div>
            </div>
          )}
        </div>

        {showReason && <div className="cand-reason">{c.match_reason}</div>}

        <div className="cand-chips">
          {c.location && <span className="cand-chip">{c.location}</span>}
          {c.notice_period && <span className="cand-chip">Notice: {c.notice_period}</span>}
        </div>

        {renderOutreachPills(c, key, outreach)}

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
                fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, fontSize: 10.5, color: 'var(--slate)',
                border: '1px solid var(--line)', borderRadius: 14, padding: '5px 11px', background: 'transparent',
                cursor: cs.loading ? 'default' : 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {cs.loading ? '…' : cs.message ? 'Not available' : 'Reveal contact'}
            </button>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" className={`cand-pin${isPinned ? ' pinned' : ''}`} onClick={() => togglePin(key)}>
              {isPinned ? '✓ Compare' : '+ Compare'}
            </button>
            {c.profile_url && (
              <a href={c.profile_url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: 'var(--amber)' }}>View profile</a>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderPaginationBar() {
    if (visible.length === 0 || layout === 'pipeline') return null;
    return (
      <div className="cand-pagination">
        <span className="cand-pagination-count">{visible.length} profile{visible.length > 1 ? 's' : ''}</span>
        <div className="cand-pagination-pages">
          <button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1}>&#8249;</button>
          {pageWindow[0] > 1 && <button type="button" onClick={() => changePage(1)}>1</button>}
          {pageWindow[0] > 2 && <span style={{ color: 'var(--slate)', fontSize: 12 }}>…</span>}
          {pageWindow.map((p) => (
            <button key={p} type="button" className={p === currentPage ? 'active' : ''} onClick={() => changePage(p)}>{p}</button>
          ))}
          {pageWindow[pageWindow.length - 1] < pageCount - 1 && <span style={{ color: 'var(--slate)', fontSize: 12 }}>…</span>}
          {pageWindow[pageWindow.length - 1] < pageCount && <button type="button" onClick={() => changePage(pageCount)}>{pageCount}</button>}
          <button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage === pageCount}>&#8250;</button>
        </div>
        <select className="cand-pagination-size" value={pageSize} onChange={(e) => changePageSize(Number(e.target.value))}>
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
      </div>
    );
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
            value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          <select className="cand-sort" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
            <option value="match">Sort: Match %</option>
            <option value="name">Sort: Name</option>
          </select>
          <select className="cand-sort" value={layout} onChange={(e) => setLayout(e.target.value)} title="Change how results are displayed">
            {LAYOUTS.map((l) => <option key={l.id} value={l.id}>View: {l.label}</option>)}
          </select>
          {layout === 'cards' && (
            <div className="cand-view-toggle">
              {[2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={cols === n ? 'active' : ''} onClick={() => setCols(n)} title={`${n} per row`}>{n}</button>
              ))}
            </div>
          )}
          <a href="/tools/projects" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, fontSize: 11, color: 'var(--slate)' }}>View projects</a>
          <AddToProjectButton
            siteFetch={siteFetch}
            selectedCount={selected.size}
            getSelectedCandidates={() => candidates.filter((c) => selected.has(candidateKey(c)))}
          />
          <button
            type="button"
            onClick={bulkRevealContact}
            disabled={selected.size === 0 || bulkRevealing}
            style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, fontSize: 11.5, color: selected.size ? 'var(--amber)' : 'var(--slate)',
              border: '1px solid ' + (selected.size ? 'var(--amber-dim)' : 'var(--line)'), borderRadius: 20, padding: '8px 14px',
              background: 'transparent', cursor: selected.size ? 'pointer' : 'not-allowed',
            }}
          >
            {bulkRevealing ? 'Revealing…' : `Reveal contact${selected.size ? ` (${selected.size})` : ''}`}
          </button>
          <button
            type="button"
            onClick={() => setShareOpen((v) => !v)}
            disabled={selected.size === 0}
            style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, fontSize: 11.5, color: selected.size ? 'var(--amber)' : 'var(--slate)',
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
              fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, fontSize: 11.5, color: 'var(--amber)',
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
      ) : layout === 'cards' ? (
        <div className="cand-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {pageCandidates.map((c) => renderCandidateCard(c))}
        </div>
      ) : layout === 'dossier' ? (
        <div className="cand-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          {pageCandidates.map((c) => renderCandidateCard(c, { forceReason: true, dossier: true }))}
        </div>
      ) : layout === 'list' ? (
        <div className="cand-list">
          {insights && (
            <div className="cand-list-insight">
              {insights.count} candidate{insights.count > 1 ? 's' : ''}
              {insights.avg != null && <> · avg match <b>{insights.avg}%</b></>}
              {insights.topLocation && <> · most in <b>{insights.topLocation}</b> ({insights.topLocationCount})</>}
            </div>
          )}
          {pageCandidates.map((c, i) => {
            const key = candidateKey(c);
            const cs = contactState[key] || {};
            const isSelected = selected.has(key);
            const isPinned = compareKeys.has(key);
            const score = c.match_score;
            const rank = (currentPage - 1) * pageSize + i + 1;
            return (
              <div key={key} className={`cand-list-row${isSelected ? ' selected' : ''}`}>
                <div className="cand-list-rank">{rank}</div>
                <input className="cand-check" type="checkbox" checked={isSelected} onChange={() => toggleSelect(c)} />
                <div className="cand-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initials(c.name)}</div>
                <div className="cand-list-body">
                  <div className="cand-list-line">
                    <span className="cand-name" style={{ fontSize: 13.5 }}>{c.name || 'Unknown'}</span>
                    <span className="cand-list-sub"> · {c.designation || '—'}{c.company ? `, ${c.company}` : ''}{c.location ? ` · ${c.location}` : ''}</span>
                  </div>
                  {c.match_reason && <div className="cand-list-reason">{c.match_reason}</div>}
                  {score != null && (
                    <div className="cand-list-bar"><div className="cand-list-bar-fill" style={{ width: `${score}%`, background: scoreColor(score) }} /></div>
                  )}
                </div>
                {score != null && <div className="cand-list-score" style={{ color: scoreColor(score) }}>{score}%</div>}
                <div className="cand-list-actions">
                  <button type="button" className={`cand-pin${isPinned ? ' pinned' : ''}`} onClick={() => togglePin(key)} title="Add to compare">
                    {isPinned ? '✓' : '+'}
                  </button>
                  <button type="button" onClick={() => revealContactFor(c)} disabled={cs.loading} title={cs.revealed ? (cs.email || cs.phone || '') : 'Reveal contact'}>
                    {cs.revealed ? '☎' : cs.loading ? '…' : '☎'}
                  </button>
                  {c.profile_url && <a href={c.profile_url} target="_blank" rel="noreferrer" title="View profile">↗</a>}
                </div>
              </div>
            );
          })}
        </div>
      ) : layout === 'table' ? (
        <div className="cand-table-wrap">
          <table className="cand-table">
            <thead>
              <tr>
                <th></th><th>Name</th><th>Company</th><th>Role</th><th>Location</th><th>Match</th>
                <th>Qualification</th><th>Current CTC</th><th>Expected CTC</th><th>Notice</th><th>Outreach</th><th></th>
              </tr>
            </thead>
            <tbody>
              {pageCandidates.map((c) => {
                const key = candidateKey(c);
                const isSelected = selected.has(key);
                const score = c.match_score;
                const outreach = c.outreach_status || 'new';
                return (
                  <tr key={key} className={isSelected ? 'selected' : ''}>
                    <td><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(c)} /></td>
                    <td className="cand-table-name">{c.name || 'Unknown'}</td>
                    <td>{c.company || '—'}</td>
                    <td>{c.designation || '—'}</td>
                    <td>{c.location || '—'}</td>
                    <td style={{ color: scoreColor(score) }}>{score != null ? `${score}%` : '—'}</td>
                    <td><EditableCell value={c.qualification} onChange={(v) => updateCandidateField(key, 'qualification', v)} /></td>
                    <td><EditableCell value={c.current_ctc} onChange={(v) => updateCandidateField(key, 'current_ctc', v)} /></td>
                    <td><EditableCell value={c.expected_ctc} onChange={(v) => updateCandidateField(key, 'expected_ctc', v)} /></td>
                    <td>{c.notice_period || '—'}</td>
                    <td>
                      <select className="cand-table-outreach" value={outreach} onChange={(e) => updateCandidateField(key, 'outreach_status', e.target.value)} style={{ color: OUTREACH_COLORS[outreach] }}>
                        {OUTREACH.map((s) => <option key={s} value={s}>{OUTREACH_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td>{c.profile_url && <a href={c.profile_url} target="_blank" rel="noreferrer">View</a>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="cand-pipeline">
          {OUTREACH.map((s) => (
            <div key={s} className="cand-pipeline-col">
              <div className="cand-pipeline-head" style={{ color: OUTREACH_COLORS[s] }}>
                {OUTREACH_LABELS[s]} · {pipelineGroups[s].length}
              </div>
              {pipelineGroups[s].map((c) => {
                const key = candidateKey(c);
                const score = c.match_score;
                const isSelected = selected.has(key);
                return (
                  <div key={key} className={`cand-pipeline-chip${isSelected ? ' selected' : ''}`} style={{ borderColor: s === 'new' ? 'var(--line)' : OUTREACH_COLORS[s] }}>
                    <div className="cand-pipeline-chip-top" onClick={() => toggleSelect(c)}>
                      <span className="cand-name" style={{ fontSize: 12 }}>{c.name || 'Unknown'}</span>
                      {score != null && <span style={{ fontSize: 10.5, color: scoreColor(score) }}>{score}%</span>}
                    </div>
                    <div className="cand-list-sub" style={{ fontSize: 10.5 }}>{c.designation || '—'}{c.location ? ` · ${c.location}` : ''}</div>
                    <select
                      className="cand-table-outreach"
                      style={{ marginTop: 6, fontSize: 10 }}
                      value={s}
                      onChange={(e) => updateCandidateField(key, 'outreach_status', e.target.value)}
                    >
                      {OUTREACH.map((opt) => <option key={opt} value={opt}>Move to {OUTREACH_LABELS[opt]}</option>)}
                    </select>
                  </div>
                );
              })}
              {pipelineGroups[s].length === 0 && <div className="cand-pipeline-empty">Nothing here</div>}
            </div>
          ))}
        </div>
      )}

      {renderPaginationBar()}

      {compareKeys.size >= 2 && !compareOpen && (
        <div className="cand-compare-bar" onClick={() => setCompareOpen(true)}>
          Compare {compareKeys.size} candidates
        </div>
      )}

      {compareOpen && (
        <CompareDrawer
          candidates={compareCandidates}
          candidateKey={candidateKey}
          onRemove={(key) => setCompareKeys((prev) => { const next = new Set(prev); next.delete(key); return next; })}
          onClose={() => setCompareOpen(false)}
          contactState={contactState}
          revealContactFor={revealContactFor}
        />
      )}
    </>
  );
}

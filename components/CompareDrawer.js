'use client';

function scoreColor(score) {
  if (score == null) return 'var(--slate)';
  return score >= 70 ? 'var(--amber)' : score >= 40 ? 'var(--amber-dim)' : 'var(--slate)';
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

// Side-by-side comparison of 2-4 pinned candidates — opened from
// CandidateResults once at least 2 are pinned. Pure client-side, reads
// off the same candidate objects already in memory (no extra fetch).
export default function CompareDrawer({ candidates, candidateKey, onRemove, onClose, contactState, revealContactFor }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(4,6,10,0.82)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--navy-2)', border: '1px solid var(--line)', borderRadius: 14,
          maxWidth: 1000, width: '100%', maxHeight: '86vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, color: 'var(--cream)' }}>Compare candidates</div>
          <span onClick={onClose} style={{ color: 'var(--slate)', cursor: 'pointer', fontSize: 18 }}>&times;</span>
        </div>
        <div style={{ overflow: 'auto', padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${candidates.length}, minmax(220px, 1fr))`, gap: 14 }}>
            {candidates.map((c) => {
              const key = candidateKey(c);
              const cs = contactState[key] || {};
              const score = c.match_score;
              return (
                <div key={key} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 16, position: 'relative' }}>
                  <span onClick={() => onRemove(key)} style={{ position: 'absolute', top: 10, right: 12, color: 'var(--slate)', cursor: 'pointer', fontSize: 14 }} title="Remove from compare">&times;</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: 'rgba(232,163,61,0.1)', color: 'var(--amber)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fraunces, serif',
                      fontSize: 14, fontWeight: 600, marginBottom: 8,
                    }}>{initials(c.name)}</div>
                    <div style={{ fontSize: 13.5, color: 'var(--cream)', fontWeight: 500 }}>{c.name || 'Unknown'}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>{c.designation || '—'}{c.company ? ` · ${c.company}` : ''}</div>
                  </div>

                  {score != null && (
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 20, color: scoreColor(score) }}>{score}%</span>
                      {c.match_reason && <div style={{ fontSize: 10.5, color: 'var(--slate)', marginTop: 4, lineHeight: 1.5 }}>{c.match_reason}</div>}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11.5, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                    <div><span style={{ color: 'var(--amber-dim)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9.5, textTransform: 'uppercase' }}>Location</span><div style={{ color: 'var(--cream)' }}>{c.location || '—'}</div></div>
                    <div><span style={{ color: 'var(--amber-dim)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9.5, textTransform: 'uppercase' }}>Qualification</span><div style={{ color: 'var(--cream)' }}>{c.qualification || '—'}</div></div>
                    <div><span style={{ color: 'var(--amber-dim)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9.5, textTransform: 'uppercase' }}>Current CTC</span><div style={{ color: 'var(--cream)' }}>{c.current_ctc || '—'}</div></div>
                    <div><span style={{ color: 'var(--amber-dim)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9.5, textTransform: 'uppercase' }}>Expected CTC</span><div style={{ color: 'var(--cream)' }}>{c.expected_ctc || '—'}</div></div>
                    <div><span style={{ color: 'var(--amber-dim)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 9.5, textTransform: 'uppercase' }}>Notice</span><div style={{ color: 'var(--cream)' }}>{c.notice_period || '—'}</div></div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                    {cs.revealed ? (
                      <span style={{ fontSize: 11, color: 'var(--cream)' }}>{cs.email || cs.phone || '—'}</span>
                    ) : (
                      <button
                        type="button" onClick={() => revealContactFor(c)} disabled={cs.loading}
                        style={{
                          fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: 'var(--slate)',
                          border: '1px solid var(--line)', borderRadius: 14, padding: '5px 11px', background: 'transparent', cursor: 'pointer',
                        }}
                      >
                        {cs.loading ? '…' : 'Reveal contact'}
                      </button>
                    )}
                    {c.profile_url && <a href={c.profile_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--amber)' }}>View profile</a>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Shared "saved / recent searches" control for Smart Source.ai and Smart
// Hunt.ai. Each tool passes its own current form state as `getParams()`
// and gets back whatever was saved via `onLoad(params)` — the two tools'
// fields differ, so this component stays deliberately opaque about shape.
export default function SavedSearches({ tool, siteFetch, getParams, onLoad }) {
  const [open, setOpen] = useState(false);
  const [searches, setSearches] = useState(null);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await siteFetch(`/api/tools/saved-searches?tool=${tool}`);
    const data = await res.json().catch(() => null);
    setSearches(data?.searches || []);
  }

  function toggle() {
    setOpen((v) => !v);
    if (!searches) load();
  }

  async function save() {
    if (!saveName.trim()) return;
    setSaving(true);
    await siteFetch('/api/tools/saved-searches', {
      method: 'POST',
      body: JSON.stringify({ tool, name: saveName.trim(), params: getParams() }),
    });
    setSaveName('');
    setSaving(false);
    load();
  }

  async function remove(id, e) {
    e.stopPropagation();
    await siteFetch(`/api/tools/saved-searches/${id}`, { method: 'DELETE' });
    setSearches((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          fontFamily: 'IBM Plex Mono, monospace', fontSize: 11.5, color: 'var(--slate)',
          border: '1px solid var(--line)', borderRadius: 20, padding: '8px 14px',
          background: 'transparent', cursor: 'pointer',
        }}
      >
        Saved searches
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 40, left: 0, zIndex: 20, width: 280,
          background: 'var(--navy-2)', border: '1px solid var(--line)', borderRadius: 10,
          padding: 12, boxShadow: '0 12px 30px #000a',
        }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input
              type="text" placeholder="Name this search…" value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)',
                borderRadius: 6, padding: '6px 9px', color: 'var(--cream)', fontSize: 11.5,
                fontFamily: 'IBM Plex Mono, monospace', outline: 'none',
              }}
            />
            <button
              type="button" onClick={save} disabled={saving || !saveName.trim()}
              style={{
                fontSize: 11, color: 'var(--amber)', border: '1px solid var(--amber-dim)', borderRadius: 6,
                padding: '6px 10px', background: 'transparent', cursor: saveName.trim() ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
              }}
            >
              {saving ? '…' : 'Save'}
            </button>
          </div>

          {searches === null ? (
            <div style={{ fontSize: 11.5, color: 'var(--slate)', padding: '8px 2px' }}>Loading…</div>
          ) : searches.length === 0 ? (
            <div style={{ fontSize: 11.5, color: 'var(--slate)', padding: '8px 2px' }}>No saved searches yet.</div>
          ) : (
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {searches.map((s) => (
                <div
                  key={s.id}
                  onClick={() => { onLoad(s.params); setOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    padding: '7px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                    <div style={{ color: 'var(--slate)', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}>{timeAgo(s.created_at)}</div>
                  </div>
                  <span onClick={(e) => remove(s.id, e)} style={{ color: 'var(--slate)', fontSize: 13, flexShrink: 0 }} title="Delete">&times;</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

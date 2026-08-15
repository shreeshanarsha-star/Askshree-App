'use client';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'askshree_home2_clipboard';

export default function ClipboardWidget() {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (e) { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) { /* ignore */ }
  }, [items, loaded]);

  function save() {
    const text = draft.trim();
    if (!text) return;
    setItems((i) => [{ id: Date.now(), text }, ...i]);
    setDraft('');
  }
  function remove(id) {
    setItems((i) => i.filter((it) => it.id !== id));
  }
  async function copy(item) {
    try {
      await navigator.clipboard.writeText(item.text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId((c) => (c === item.id ? null : c)), 1500);
    } catch (e) { /* ignore */ }
  }

  return (
    <div className="widget-box">
      <div className="widget-row">
        <input
          type="text" className="widget-input" placeholder="Paste or type something to save..."
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <button type="button" className="widget-btn" onClick={save}>Save</button>
      </div>

      {items.length === 0 && <div className="widget-empty">Nothing saved yet — items stay on this device.</div>}

      <div className="widget-list">
        {items.map((it) => (
          <div key={it.id} className="widget-list-item">
            <span className="widget-list-item-text">{it.text}</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button type="button" className="widget-btn-ghost" onClick={() => copy(it)}>{copiedId === it.id ? 'Copied' : 'Copy'}</button>
              <button type="button" className="widget-remove" onClick={() => remove(it.id)} aria-label="Delete">&times;</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

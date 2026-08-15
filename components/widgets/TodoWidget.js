'use client';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'askshree_home2_todo';

export default function TodoWidget() {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState('');
  const [loaded, setLoaded] = useState(false);

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

  function add() {
    const text = draft.trim();
    if (!text) return;
    setItems((i) => [{ id: Date.now(), text, done: false }, ...i]);
    setDraft('');
  }
  function toggle(id) {
    setItems((i) => i.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  }
  function remove(id) {
    setItems((i) => i.filter((it) => it.id !== id));
  }

  const openCount = items.filter((i) => !i.done).length;

  return (
    <div className="widget-box">
      <div className="widget-row">
        <input
          type="text" className="widget-input" placeholder="Add a task..."
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button type="button" className="widget-btn" onClick={add}>Add</button>
      </div>

      {items.length === 0 && <div className="widget-empty">Nothing on your list yet.</div>}

      <div className="widget-list">
        {items.map((it) => (
          <div key={it.id} className={`widget-list-item ${it.done ? 'done' : ''}`}>
            <label className="widget-checkbox-item">
              <input type="checkbox" className="widget-checkbox" checked={it.done} onChange={() => toggle(it.id)} />
              <span className="widget-list-item-text">{it.text}</span>
            </label>
            <button type="button" className="widget-remove" onClick={() => remove(it.id)} aria-label="Delete">&times;</button>
          </div>
        ))}
      </div>
      {items.length > 0 && <div className="widget-hint">{openCount} open &middot; {items.length - openCount} done</div>}
    </div>
  );
}

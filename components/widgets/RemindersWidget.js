'use client';
import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'askshree_home2_reminders';

function defaultTime() {
  const d = new Date(Date.now() + 15 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export default function RemindersWidget() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [when, setWhen] = useState(defaultTime());
  const [loaded, setLoaded] = useState(false);
  const [permission, setPermission] = useState('default');
  const firedRef = useRef(new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (e) { /* ignore */ }
    setLoaded(true);
    if (typeof Notification !== 'undefined') setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) { /* ignore */ }
  }, [items, loaded]);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      items.forEach((r) => {
        if (!r.done && !firedRef.current.has(r.id) && new Date(r.time).getTime() <= now) {
          firedRef.current.add(r.id);
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Ask Shree reminder', { body: r.text });
          }
          setItems((i) => i.map((it) => (it.id === r.id ? { ...it, due: true } : it)));
        }
      });
    }, 5000);
    return () => clearInterval(id);
  }, [items]);

  function requestPermission() {
    if (typeof Notification === 'undefined') return;
    Notification.requestPermission().then((p) => setPermission(p));
  }

  function add() {
    const t = text.trim();
    if (!t || !when) return;
    setItems((i) => [{ id: Date.now(), text: t, time: when, done: false, due: false }, ...i].sort((a, b) => new Date(a.time) - new Date(b.time)));
    setText('');
    setWhen(defaultTime());
  }
  function dismiss(id) {
    setItems((i) => i.map((it) => (it.id === id ? { ...it, done: true } : it)));
  }
  function remove(id) {
    setItems((i) => i.filter((it) => it.id !== id));
  }

  const active = items.filter((i) => !i.done);

  return (
    <div className="widget-box">
      {permission !== 'granted' && (
        <button type="button" className="widget-btn-ghost" style={{ width: '100%', marginBottom: 12 }} onClick={requestPermission}>
          Enable browser notifications
        </button>
      )}
      <div className="widget-row">
        <input type="text" className="widget-input" placeholder="Remind me to..." value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="widget-row">
        <input type="datetime-local" className="widget-input" value={when} onChange={(e) => setWhen(e.target.value)} />
        <button type="button" className="widget-btn" onClick={add}>Set</button>
      </div>

      {active.length === 0 && <div className="widget-empty">No reminders set.</div>}

      <div className="widget-list">
        {active.map((r) => (
          <div key={r.id} className={`widget-list-item ${r.due ? '' : ''}`} style={r.due ? { borderColor: 'var(--amber)' } : undefined}>
            <div className="widget-list-item-text">
              <div>{r.text}</div>
              <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>
                {r.due ? 'Due now' : new Date(r.time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {r.due && <button type="button" className="widget-btn-ghost" onClick={() => dismiss(r.id)}>Done</button>}
              <button type="button" className="widget-remove" onClick={() => remove(r.id)} aria-label="Delete">&times;</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

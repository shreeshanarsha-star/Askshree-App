'use client';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'askshree_home2_expenses';

export default function ExpenseWidget() {
  const [items, setItems] = useState([]);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
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
    const l = label.trim();
    const a = parseFloat(amount);
    if (!l || !Number.isFinite(a)) return;
    setItems((i) => [{ id: Date.now(), label: l, amount: a }, ...i]);
    setLabel('');
    setAmount('');
  }
  function remove(id) {
    setItems((i) => i.filter((it) => it.id !== id));
  }

  const total = items.reduce((sum, it) => sum + it.amount, 0);

  return (
    <div className="widget-box">
      <div className="widget-big-display">
        <div className="widget-clock-time" style={{ fontSize: 30 }}>{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        <div className="widget-clock-date">Total across {items.length} {items.length === 1 ? 'item' : 'items'}</div>
      </div>

      <div className="widget-row" style={{ marginTop: 14 }}>
        <input type="text" className="widget-input" placeholder="What was it for?" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className="widget-row">
        <input type="number" step="0.01" className="widget-input" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button type="button" className="widget-btn" onClick={add}>Add</button>
      </div>

      {items.length === 0 && <div className="widget-empty">No expenses logged yet.</div>}

      <div className="widget-list">
        {items.map((it) => (
          <div key={it.id} className="widget-list-item">
            <span className="widget-list-item-text">{it.label}</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{it.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <button type="button" className="widget-remove" onClick={() => remove(it.id)} aria-label="Delete">&times;</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

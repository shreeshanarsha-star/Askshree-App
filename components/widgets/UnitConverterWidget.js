'use client';
import { useState, useMemo } from 'react';

const CATEGORIES = {
  Length: { base: 'm', units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.34, yd: 0.9144, ft: 0.3048, in: 0.0254 } },
  Weight: { base: 'kg', units: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, ton: 1000 } },
  Volume: { base: 'l', units: { l: 1, ml: 0.001, gal: 3.78541, qt: 0.946353, cup: 0.24, floz: 0.0295735 } },
  Temperature: { base: 'c', units: { c: 'c', f: 'f', k: 'k' } },
};

function convertTemp(val, from, to) {
  let c;
  if (from === 'c') c = val;
  else if (from === 'f') c = (val - 32) * (5 / 9);
  else c = val - 273.15;
  if (to === 'c') return c;
  if (to === 'f') return c * (9 / 5) + 32;
  return c + 273.15;
}

export default function UnitConverterWidget() {
  const [cat, setCat] = useState('Length');
  const units = Object.keys(CATEGORIES[cat].units);
  const [from, setFrom] = useState(units[0]);
  const [to, setTo] = useState(units[1]);
  const [val, setVal] = useState('1');

  function changeCat(c) {
    setCat(c);
    const u = Object.keys(CATEGORIES[c].units);
    setFrom(u[0]);
    setTo(u[1]);
  }

  const result = useMemo(() => {
    const n = parseFloat(val);
    if (!Number.isFinite(n)) return '';
    if (cat === 'Temperature') return +convertTemp(n, from, to).toFixed(4);
    const { units: u } = CATEGORIES[cat];
    const inBase = n * u[from];
    return +(inBase / u[to]).toFixed(6);
  }, [val, from, to, cat]);

  return (
    <div className="widget-box">
      <div className="widget-tabs">
        {Object.keys(CATEGORIES).map((c) => (
          <div key={c} className={`widget-tab ${cat === c ? 'active' : ''}`} onClick={() => changeCat(c)}>{c}</div>
        ))}
      </div>

      <div className="widget-row">
        <input type="number" className="widget-input" value={val} onChange={(e) => setVal(e.target.value)} />
        <select className="widget-select" value={from} onChange={(e) => setFrom(e.target.value)} style={{ flex: '0 0 90px' }}>
          {units.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div className="widget-hint" style={{ margin: '10px 0' }}>equals</div>
      <div className="widget-row">
        <div className="widget-input" style={{ background: 'rgba(var(--amber-rgb),0.06)', borderColor: 'rgba(var(--amber-rgb),0.3)', color: 'var(--amber)', fontWeight: 600 }}>
          {result === '' ? '—' : result}
        </div>
        <select className="widget-select" value={to} onChange={(e) => setTo(e.target.value)} style={{ flex: '0 0 90px' }}>
          {units.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
    </div>
  );
}

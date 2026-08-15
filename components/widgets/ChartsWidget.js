'use client';
import { useState, useMemo } from 'react';

export default function ChartsWidget() {
  const [raw, setRaw] = useState('Mon:12, Tue:19, Wed:8, Thu:15, Fri:22');

  const data = useMemo(() => {
    return raw.split(',').map((chunk) => {
      const [label, val] = chunk.split(':').map((s) => s && s.trim());
      const num = parseFloat(val);
      if (!label || !Number.isFinite(num)) return null;
      return { label, value: num };
    }).filter(Boolean).slice(0, 10);
  }, [raw]);

  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="widget-box-wide">
      <div className="widget-label">Data (label:value, comma-separated)</div>
      <textarea
        className="widget-input" rows={2} value={raw} onChange={(e) => setRaw(e.target.value)}
        style={{ resize: 'vertical' }}
      />

      {data.length === 0 ? (
        <div className="widget-empty">Enter something like Mon:12, Tue:19 to see a chart.</div>
      ) : (
        <div className="widget-chart-bars">
          {data.map((d, i) => (
            <div key={i} className="widget-chart-bar-wrap">
              <span className="widget-chart-val">{d.value}</span>
              <div className="widget-chart-bar" style={{ height: `${(d.value / max) * 100}%` }} />
              <span className="widget-chart-label">{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

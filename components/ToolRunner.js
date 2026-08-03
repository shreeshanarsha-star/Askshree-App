'use client';
import { useState } from 'react';

export default function ToolRunner({ title, tag, endpoint, fields, renderResult }) {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [locked, setLocked] = useState(null);

  async function run() {
    setLoading(true);
    setError(null);
    setLocked(null);
    setResult(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (res.status === 402) {
        setLocked(data.message);
      } else if (!res.ok) {
        setError(data.error || 'Something went wrong.');
      } else {
        setResult(data.result);
      }
    } catch (e) {
      setError('Network error. Try again.');
    }
    setLoading(false);
  }

  return (
    <div className="section" style={{ maxWidth: 760 }}>
      <span style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--amber-dim)',
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>{tag}</span>
      <h2 style={{ marginTop: 8 }}>{title}</h2>

      <div style={{ display: 'grid', gap: 14, marginTop: 24 }}>
        {fields.map((f) => (
          <div key={f.name}>
            <label style={{
              display: 'block', fontSize: 12, color: 'var(--slate)', marginBottom: 6,
              fontFamily: 'IBM Plex Mono, monospace',
            }}>{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea
                rows={f.rows || 5}
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)',
                  borderRadius: 8, padding: 12, color: 'var(--cream)', fontFamily: 'Inter, sans-serif',
                  fontSize: 13.5,
                }}
              />
            ) : (
              <input
                type="text"
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)',
                  borderRadius: 8, padding: '10px 12px', color: 'var(--cream)', fontFamily: 'Inter, sans-serif',
                  fontSize: 13.5,
                }}
              />
            )}
          </div>
        ))}
        <button
          onClick={run}
          disabled={loading}
          style={{
            justifySelf: 'start', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12.5,
            border: '1px solid var(--amber-dim)', color: 'var(--amber)', background: 'transparent',
            padding: '10px 22px', borderRadius: 6, cursor: 'pointer',
          }}
        >
          {loading ? 'running…' : 'run tool'}
        </button>
      </div>

      {locked && (
        <div style={{
          marginTop: 24, border: '1px solid var(--amber-dim)', borderRadius: 8, padding: 18,
          background: 'rgba(232,163,61,0.06)', color: 'var(--cream)', fontSize: 13.5,
        }}>
          {locked} <a href="/subscribe" style={{ color: 'var(--amber)' }}>Subscribe →</a>
        </div>
      )}
      {error && (
        <div style={{ marginTop: 24, color: '#e28080', fontSize: 13.5 }}>{error}</div>
      )}
      {result && (
        <div style={{ marginTop: 28 }}>{renderResult(result)}</div>
      )}
    </div>
  );
}

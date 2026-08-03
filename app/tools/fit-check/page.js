'use client';
import { useState } from 'react';

export default function FitCheckPage() {
  const [jd, setJd] = useState('');
  const [resumeBlob, setResumeBlob] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [locked, setLocked] = useState(null);

  async function run() {
    setLoading(true);
    setError(null);
    setLocked(null);
    const resumes = resumeBlob
      .split(/\n---\n/)
      .map((block, i) => {
        const lines = block.trim().split('\n');
        return { name: lines[0]?.slice(0, 60) || `Candidate ${i + 1}`, text: block.trim() };
      })
      .filter((r) => r.text.length > 0);

    try {
      const res = await fetch('/api/tools/fit-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jd, resumes }),
      });
      const data = await res.json();
      if (res.status === 402) setLocked(data.message);
      else if (!res.ok) setError(data.error);
      else setResult(data.result);
    } catch (e) {
      setError('Network error. Try again.');
    }
    setLoading(false);
  }

  return (
    <div className="section" style={{ maxWidth: 780 }}>
      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--amber-dim)', textTransform: 'uppercase' }}>Screening</span>
      <h2 style={{ marginTop: 8 }}>Fit Check</h2>
      <p className="lead">Paste the job description, then paste each resume separated by a line containing only ---</p>

      <label style={{ display: 'block', fontSize: 12, color: 'var(--slate)', margin: '20px 0 6px' }}>Job description</label>
      <textarea rows={6} onChange={(e) => setJd(e.target.value)}
        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', borderRadius: 8, padding: 12, color: 'var(--cream)' }} />

      <label style={{ display: 'block', fontSize: 12, color: 'var(--slate)', margin: '16px 0 6px' }}>Resumes (separate each with a line of ---)</label>
      <textarea rows={12} onChange={(e) => setResumeBlob(e.target.value)}
        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', borderRadius: 8, padding: 12, color: 'var(--cream)' }} />

      <button onClick={run} disabled={loading}
        style={{ marginTop: 16, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12.5, border: '1px solid var(--amber-dim)', color: 'var(--amber)', background: 'transparent', padding: '10px 22px', borderRadius: 6, cursor: 'pointer' }}>
        {loading ? 'scoring…' : 'run fit check'}
      </button>

      {locked && <div style={{ marginTop: 24, border: '1px solid var(--amber-dim)', borderRadius: 8, padding: 18, background: 'rgba(232,163,61,0.06)' }}>{locked} <a href="/subscribe" style={{ color: 'var(--amber)' }}>Subscribe →</a></div>}
      {error && <div style={{ marginTop: 24, color: '#e28080' }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 28, display: 'grid', gap: 14 }}>
          {result.candidates?.map((c, i) => (
            <div key={i} className="tool-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3>{c.name}</h3>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 20, color: 'var(--teal, var(--amber))' }}>{c.overall}<span style={{ fontSize: 12, color: 'var(--slate)' }}>/100</span></span>
              </div>
              <p>{c.rationale}</p>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--slate)' }}>
                {Object.entries(c.factors || {}).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span>{k.replace(/_/g, ' ')}</span><span>{v}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';

function money(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const DECIDED_MESSAGE = {
  approved: 'You already approved this proposal.',
  rejected: 'You already rejected this proposal.',
  changes_requested: 'You already requested changes on this proposal.',
  expired: 'This approval link has expired.',
};

export default function ApprovePage({ params }) {
  const [state, setState] = useState('loading'); // loading | error | decided | ready | submitted
  const [data, setData] = useState(null);
  const [comment, setComment] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/tools/offer/approve/${params.token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setState('error'); return; }
        if (d.decided) { setState('decided'); setData(d); return; }
        setData(d);
        setState('ready');
      });
  }, [params.token]);

  async function decide(decision) {
    setBusy(true);
    const res = await fetch(`/api/tools/offer/approve/${params.token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, comment }),
    });
    const d = await res.json();
    setBusy(false);
    if (d.error) { setResult({ error: d.error }); return; }
    setResult(d);
    setState('submitted');
  }

  if (state === 'loading') return <div style={{ padding: 60, color: 'var(--slate)' }}>Loading…</div>;
  if (state === 'error') return <div style={{ padding: 60, color: 'var(--slate)' }}>This approval link is invalid.</div>;
  if (state === 'decided') return <div style={{ padding: 60, color: 'var(--slate)' }}>{DECIDED_MESSAGE[data.status] || 'This has already been decided.'}</div>;
  if (state === 'submitted') {
    return (
      <div style={{ padding: 60, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <h2 className="serif" style={{ color: 'var(--cream)' }}>
          {result.status === 'approved' ? (result.chainComplete ? 'Approved — fully signed off.' : `Approved. Moved to ${result.nextApprover}.`) :
            result.status === 'rejected' ? 'Rejected.' : 'Changes requested — sent back to the recruiter.'}
        </h2>
      </div>
    );
  }

  const p = data.proposal;
  const hikeCtc = p.totalCtcCurrent && p.totalCtcProposed
    ? (((p.totalCtcProposed - p.totalCtcCurrent) / p.totalCtcCurrent) * 100).toFixed(1) : null;

  return (
    <div style={{ padding: '48px 24px', maxWidth: 820, margin: '0 auto' }}>
      <div className="eyebrow">Approval requested {p.recruiterEmail ? `by ${p.recruiterEmail}` : ''}</div>
      <h1 className="serif" style={{ fontSize: 24, margin: '8px 0 4px' }}>
        Approve offer — {p.candidateName}, {p.proposedDesignation}
      </h1>
      <p style={{ color: 'var(--slate)', fontSize: 12, marginBottom: 24 }}>Step {data.position} of {data.totalSteps}</p>

      <div className="field-label" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: 'var(--slate)', margin: '0 0 8px', textTransform: 'uppercase' }}>1 · Proposal summary</div>
      <div className="stat-strip">
        <div className="stat-item"><span className="stat-label">Total CTC</span><span className="stat-value amber">{p.currency} {money(p.totalCtcProposed)}</span></div>
        <div className="stat-item"><span className="stat-label">Gross</span><span className="stat-value">{p.currency} {money(p.grossProposed)}</span></div>
        <div className="stat-item"><span className="stat-label">Total CTC hike</span><span className="stat-value">{hikeCtc != null ? `+${hikeCtc}%` : '—'}</span></div>
        <div className="stat-item"><span className="stat-label">Notice period</span><span className="stat-value" style={{ fontSize: 15 }}>{p.noticePeriod || '—'}</span></div>
      </div>

      {p.justification && (
        <>
          <div className="field-label" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: 'var(--slate)', margin: '24px 0 8px', textTransform: 'uppercase' }}>2 · Justification</div>
          <div className="as-auto-value" style={{ lineHeight: 1.75, textAlign: 'justify' }}>{p.justification}</div>
        </>
      )}

      <div className="field-label" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: 'var(--slate)', margin: '24px 0 8px', textTransform: 'uppercase' }}>3 · Detailed breakup</div>
      <table className="offer-table">
        <thead>
          <tr><th rowSpan={2}>Component</th><th className="num" colSpan={2}>Current</th><th className="num" colSpan={2}>Proposed</th></tr>
          <tr><th className="num">Monthly</th><th className="num">Annually</th><th className="num">Monthly</th><th className="num">Annually</th></tr>
        </thead>
        <tbody>
          {(p.components || []).map((c, i) => (
            <tr key={i}>
              <td className="dim">{c.label}</td>
              <td className="num">{money(c.current_monthly)}</td><td className="num">{money(c.current_annual)}</td>
              <td className="num proposed">{money(c.proposed_monthly)}</td><td className="num proposed">{money(c.proposed_annual)}</td>
            </tr>
          ))}
          <tr className="subtotal"><td>Gross Salary</td><td className="num">{money(p.grossCurrent)}</td><td className="num" /><td className="num proposed">{money(p.grossProposed)}</td><td className="num" /></tr>
          <tr className="subtotal"><td>Total CTC</td><td className="num">{money(p.totalCtcCurrent)}</td><td className="num" /><td className="num proposed">{money(p.totalCtcProposed)}</td><td className="num" /></tr>
        </tbody>
      </table>

      {p.otherBenefits && (
        <>
          <div className="field-label" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: 'var(--slate)', margin: '24px 0 8px', textTransform: 'uppercase' }}>Other benefits</div>
          <div className="as-auto-value" style={{ lineHeight: 1.75 }}>{p.otherBenefits}</div>
        </>
      )}

      <div className="field-label" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, color: 'var(--slate)', margin: '24px 0 8px', textTransform: 'uppercase' }}>Your decision</div>
      <input type="text" placeholder="Optional comment" value={comment} onChange={(e) => setComment(e.target.value)}
        style={{ width: '100%', marginBottom: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', borderRadius: 6, padding: '10px 12px', color: 'var(--cream)', fontSize: 13 }} />
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="primary-btn" style={{ marginTop: 0 }} disabled={busy} onClick={() => decide('approve')}>Approve</button>
        <button className="ghost-btn" disabled={busy} onClick={() => decide('request_changes')}>Request changes</button>
        <button className="danger-btn" disabled={busy} onClick={() => decide('reject')}>Reject</button>
      </div>
      {result?.error && <div className="file-hint" style={{ marginTop: 12, color: '#e28080' }}>{result.error}</div>}
    </div>
  );
}

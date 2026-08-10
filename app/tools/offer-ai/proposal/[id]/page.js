'use client';
import { useEffect, useState } from 'react';

function money(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function ProposalView({ params }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/tools/offer/proposal/${params.id}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)));
  }, [params.id]);

  if (error) return <div style={{ padding: 60, color: 'var(--slate)' }}>{error}</div>;
  if (!data) return <div style={{ padding: 60, color: 'var(--slate)' }}>Loading…</div>;

  const p = data.proposal;
  const hikeCtc = p.total_ctc_current && p.total_ctc_proposed
    ? (((p.total_ctc_proposed - p.total_ctc_current) / p.total_ctc_current) * 100).toFixed(1) : null;

  return (
    <div className="offer-print-sheet" style={{ padding: '48px 24px' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="primary-btn" style={{ marginTop: 0 }} onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      <div className="eyebrow">Recruit.ai — Offer proposal</div>
      <h1 className="serif" style={{ fontSize: 24, margin: '8px 0 4px' }}>{p.candidate_name || 'Candidate'}</h1>
      <p style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 24 }}>
        {p.current_designation || '—'} → {p.proposed_designation || p.role_title || '—'}
        {p.grade ? ` · Grade ${p.grade}` : ''}
      </p>

      <div className="stat-strip">
        <div className="stat-item"><span className="stat-label">Total CTC</span><span className="stat-value amber">{p.currency} {money(p.total_ctc_proposed)}</span></div>
        <div className="stat-item"><span className="stat-label">Gross</span><span className="stat-value">{p.currency} {money(p.gross_proposed)}</span></div>
        <div className="stat-item"><span className="stat-label">Total CTC hike</span><span className="stat-value">{hikeCtc != null ? `+${hikeCtc}%` : '—'}</span></div>
        <div className="stat-item"><span className="stat-label">Notice period</span><span className="stat-value" style={{ fontSize: 15 }}>{p.notice_period || '—'}</span></div>
      </div>

      {p.justification && (
        <>
          <h3 style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--amber-dim)', textTransform: 'uppercase', margin: '24px 0 8px' }}>Justification</h3>
          <p style={{ fontSize: 13, lineHeight: 1.75, textAlign: 'justify' }}>{p.justification}</p>
        </>
      )}

      <h3 style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--amber-dim)', textTransform: 'uppercase', margin: '24px 0 8px' }}>Detailed breakup</h3>
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
          <tr className="subtotal"><td>Gross Salary</td><td className="num">{money(p.gross_current)}</td><td className="num" /><td className="num proposed">{money(p.gross_proposed)}</td><td className="num" /></tr>
          <tr className="subtotal"><td>Total CTC</td><td className="num">{money(p.total_ctc_current)}</td><td className="num" /><td className="num proposed">{money(p.total_ctc_proposed)}</td><td className="num" /></tr>
        </tbody>
      </table>

      {p.other_benefits && (
        <>
          <h3 style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--amber-dim)', textTransform: 'uppercase', margin: '24px 0 8px' }}>Other benefits</h3>
          <p style={{ fontSize: 13, lineHeight: 1.75 }}>{p.other_benefits}</p>
        </>
      )}

      {data.approvals && data.approvals.length > 0 && (
        <>
          <h3 style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--amber-dim)', textTransform: 'uppercase', margin: '24px 0 8px' }}>Approval chain</h3>
          <ul style={{ fontSize: 12.5, color: 'var(--slate)', lineHeight: 2 }}>
            {data.approvals.map((a) => (
              <li key={a.sequence_order}>{a.sequence_order}. {a.approver_email} — {a.status}{a.comment ? ` ("${a.comment}")` : ''}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

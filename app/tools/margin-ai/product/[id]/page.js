'use client';
import { useEffect, useState } from 'react';
import { useMarginKey } from '../../../../../lib/useMarginKey';
import { KeyGate, MarginNav } from '../../../../../components/MarginShell';

function money(n) {
  if (n == null) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function MarginProduct({ params }) {
  const { key, setKey, unlocked, checking, error, submit, marginFetch } = useMarginKey();
  const [data, setData] = useState(null);
  const [note, setNote] = useState('');

  async function load() {
    const res = await marginFetch(`/api/tools/margin/product/${params.id}`);
    if (res.ok) setData(await res.json());
  }
  useEffect(() => { if (unlocked) load(); }, [unlocked]);

  async function decide(recId, status) {
    setNote('Saving…');
    await marginFetch('/api/tools/margin/actions', {
      method: 'POST', body: JSON.stringify({ recommendationId: recId, status, decidedBy: 'CEO' }),
    });
    setNote('');
    load();
  }

  if (checking) return <div className="admin-main">Loading…</div>;
  if (!unlocked) return <KeyGate error={error} keyVal={key} setKey={setKey} submit={submit} checking={checking} />;
  if (!data) return <div className="admin-main">Loading…</div>;
  if (data.error) return <div className="admin-main">{data.error}</div>;

  const p = data.product;

  return (
    <div className="admin-shell">
      <MarginNav active="dashboard" />
      <div className="admin-main">
        <div className="admin-header">
          <h2>{p.product_name}{p.customer_name ? ` — ${p.customer_name}` : ''}</h2>
          <span className={`status-pill ${p.status}`}>{p.status}</span>
        </div>

        <div className="metric-row">
          <div className={`metric ${p.margin_pct < 0 ? 'flag' : ''}`}><div className="label">Current margin</div><div className="val">{p.margin_pct}%</div>{p.prev_margin_pct != null && <div className="delta">was {p.prev_margin_pct}%</div>}</div>
          <div className="metric"><div className="label">Monthly revenue</div><div className="val">{money(p.revenue_monthly)}</div></div>
          <div className="metric flag"><div className="label">Monthly cost</div><div className="val">{money(p.cost_monthly)}</div></div>
          <div className="metric"><div className="label">Root cause</div><div className="val" style={{ fontSize: 15 }}>{p.root_cause || '—'}</div></div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Cost breakdown</h3></div>
          <table className="admin-table">
            <thead><tr><th>Component</th><th>Now</th><th>Previously</th><th>Change</th></tr></thead>
            <tbody>
              {(p.cost_breakdown || []).map((c, i) => {
                const pct = c.prevAmount ? (((c.amount - c.prevAmount) / c.prevAmount) * 100).toFixed(0) : null;
                return (
                  <tr key={i}>
                    <td className="name-cell">{c.component}</td>
                    <td>{money(c.amount)}</td>
                    <td className="dim">{c.prevAmount != null ? money(c.prevAmount) : '—'}</td>
                    <td style={{ color: pct > 0 ? '#e28080' : 'var(--slate)' }}>{pct != null ? `${pct > 0 ? '+' : ''}${pct}%` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>AI recommendation</h3></div>
          <div style={{ padding: '4px 20px 20px' }}>
            {data.recommendations.length === 0 && <div className="dim">No recommendation drafted yet.</div>}
            {data.recommendations.map((r) => (
              <div key={r.id} className="justif-card" style={{ marginBottom: 14 }}>
                <span className="jlabel">{r.action_type ? r.action_type.replace('_', ' ') : 'Recommendation'}{r.expected_impact_monthly != null ? ` — expected impact ${money(r.expected_impact_monthly)}/mo` : ''}</span>
                {r.recommendation_text}
                <div style={{ marginTop: 12 }}>
                  {r.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="primary-btn" style={{ marginTop: 0 }} onClick={() => decide(r.id, 'approved')}>Approve</button>
                      <button className="ghost-btn" onClick={() => decide(r.id, 'dismissed')}>Dismiss</button>
                    </div>
                  ) : (
                    <span className={`status-pill ${r.status}`}>{r.status}{r.decided_by ? ` — ${r.decided_by}` : ''}</span>
                  )}
                </div>
              </div>
            ))}
            {note && <div className="dim" style={{ fontSize: 11.5 }}>{note}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

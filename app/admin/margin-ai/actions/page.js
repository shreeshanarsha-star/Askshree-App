'use client';
import { useEffect, useState } from 'react';
import { useAdminSession } from '../../../../lib/useAdminSession';

function money(n) {
  if (n == null) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function MarginActions() {
  const { token, ready } = useAdminSession();
  const [actions, setActions] = useState(null);

  async function load() {
    const res = await fetch('/api/admin/margin/actions', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setActions(data.actions || []);
  }
  useEffect(() => { if (ready) load(); }, [ready]);

  if (!ready || !actions) return <div className="admin-main">Loading…</div>;

  return (
    <div className="admin-shell">
      <div className="admin-side">
        <div className="logo">Ask <span>Shree</span> admin</div>
        <div className="admin-nav">
          <a href="/admin">Overview</a>
          <a href="/admin/job-postings">Job postings</a>
          <a href="/admin/chatbot">Ask Shree chatbot</a>
          <a href="/admin/margin-ai" className="active">Margin.ai</a>
        </div>
      </div>
      <div className="admin-main">
        <div className="admin-header"><h2>Margin.ai — Actions</h2></div>
        <div className="panel">
          <div className="panel-head"><h3>Every recommendation, and where it stands</h3></div>
          <table className="admin-table">
            <thead><tr><th>Product</th><th>Recommendation</th><th>Expected impact</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {actions.map((r) => (
                <tr key={r.id}>
                  <td className="name-cell">{r.margin_products?.product_name}{r.margin_products?.customer_name ? <span style={{ color: 'var(--slate)' }}> — {r.margin_products.customer_name}</span> : ''}</td>
                  <td className="dim">{r.action_type ? r.action_type.replace('_', ' ') : '—'}</td>
                  <td>{money(r.expected_impact_monthly)}</td>
                  <td><span className={`status-pill ${r.status}`}>{r.status}</span></td>
                  <td><a href={`/admin/margin-ai/product/${r.product_id}`} className="row-action">View</a></td>
                </tr>
              ))}
              {actions.length === 0 && <tr><td colSpan={5} className="dim">No recommendations yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

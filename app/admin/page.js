'use client';
import { useEffect, useState } from 'react';
import { useAdminSession } from '../../lib/useAdminSession';

export default function AdminDashboard() {
  const { token, ready } = useAdminSession();
  const [data, setData] = useState(null);

  async function load() {
    const res = await fetch('/api/admin/usage', { headers: { Authorization: `Bearer ${token}` } });
    setData(await res.json());
  }

  useEffect(() => {
    if (ready) load();
  }, [ready]);

  async function act(ip, action) {
    await fetch('/api/admin/usage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ip, action }),
    });
    load();
  }

  if (!ready || !data) return <div className="admin-main">Loading…</div>;

  return (
    <div className="admin-shell">
      <div className="admin-side">
        <div className="logo">Ask <span>Shree</span> admin</div>
        <div className="admin-nav">
          <a href="/admin" className="active">Overview</a>
          <a href="/admin/job-postings">Job postings</a>
          <a href="/admin/chatbot">Ask Shree chatbot</a>
        </div>
      </div>
      <div className="admin-main">
        <div className="admin-header"><h2>Overview</h2></div>
        <div className="metric-row">
          <div className="metric"><div className="label">Active free users</div><div className="val">{data.metrics.freeCount}</div></div>
          <div className="metric"><div className="label">In grace window</div><div className="val">{data.metrics.graceCount}</div></div>
          <div className="metric"><div className="label">Paid subscribers</div><div className="val">{data.metrics.subCount}</div></div>
          <div className="metric"><div className="label">Tool runs (7d)</div><div className="val">{Object.values(data.toolCounts).reduce((a, b) => a + b, 0)}</div></div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Recent activity — usage &amp; IPs</h3></div>
          <table className="admin-table">
            <thead><tr><th>IP address</th><th>Uses</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {data.recentIps.map((row) => (
                <tr key={row.ip_address}>
                  <td>{row.ip_address}</td>
                  <td>{row.use_count}</td>
                  <td><span className={`status-pill status-${row.status === 'locked' ? 'locked' : row.status === 'grace' ? 'grace' : 'free'}`}>{row.status}</span></td>
                  <td className="name-cell">
                    <span className="row-action" onClick={() => act(row.ip_address, 'extend')}>Extend</span>
                    <span className="row-action" onClick={() => act(row.ip_address, 'whitelist')}>Whitelist</span>
                    <span className="row-action" onClick={() => act(row.ip_address, 'block')}>Block</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Tool activity (7 days)</h3></div>
          <table className="admin-table">
            <thead><tr><th>Tool</th><th>Runs</th></tr></thead>
            <tbody>
              {Object.entries(data.toolCounts).map(([tool, count]) => (
                <tr key={tool}><td className="name-cell">{tool}</td><td>{count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

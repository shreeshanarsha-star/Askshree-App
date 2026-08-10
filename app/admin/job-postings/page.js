'use client';
import { useEffect, useState } from 'react';
import { useAdminSession } from '../../../lib/useAdminSession';

export default function AdminJobPostings() {
  const { token, ready } = useAdminSession();
  const [postings, setPostings] = useState([]);

  async function load() {
    const res = await fetch('/api/admin/job-postings', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setPostings(data.postings || []);
  }

  useEffect(() => { if (ready) load(); }, [ready]);

  async function act(id, action) {
    await fetch('/api/admin/job-postings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, action }),
    });
    load();
  }

  if (!ready) return <div className="admin-main">Loading…</div>;

  const pending = postings.filter((p) => !p.approved);
  const approved = postings.filter((p) => p.approved);

  return (
    <div className="admin-shell">
      <div className="admin-side">
        <div className="logo">Ask <span>Shree</span> admin</div>
        <div className="admin-nav">
          <a href="/admin">Overview</a>
          <a href="/admin/job-postings" className="active">Job postings</a>
          <a href="/admin/chatbot">Ask Shree chatbot</a>
          <a href="/admin/margin-ai">Margin.ai</a>
        </div>
      </div>
      <div className="admin-main">
        <div className="admin-header"><h2>Job postings</h2></div>

        <div className="panel">
          <div className="panel-head"><h3>Pending approval ({pending.length})</h3></div>
          {pending.length === 0 && <p style={{ padding: 20, color: 'var(--slate)', fontSize: 13 }}>Nothing pending.</p>}
          {pending.map((j) => (
            <div key={j.id} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, color: 'var(--cream)', marginBottom: 4 }}>{j.title} — {j.company}</div>
              <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 8 }}>
                {j.location} · {j.email_verified ? (j.domain_match ? '✓ Verified match' : '⚠ Unverified email/domain') : 'Email not confirmed yet'}
              </div>
              <span className="row-action" onClick={() => act(j.id, 'approve')}>Approve</span>
              <span className="row-action" onClick={() => act(j.id, 'reject')}>Reject</span>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Approved & live ({approved.length})</h3></div>
          {approved.map((j) => (
            <div key={j.id} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: 'var(--cream)' }}>
              {j.title} — {j.company} <span style={{ color: 'var(--slate)', fontSize: 11 }}> · expires {new Date(j.expires_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useAdminSession } from '../../../lib/useAdminSession';

export default function AdminChatbot() {
  const { token, ready } = useAdminSession();
  const [tab, setTab] = useState('sources');
  const [sources, setSources] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ weekCount: 0, flaggedCount: 0, confidentPct: 100 });
  const [sourceType, setSourceType] = useState('url');
  const [form, setForm] = useState({ label: '', url: '', docText: '', question: '', answer: '' });

  async function loadSources() {
    const res = await fetch('/api/admin/chatbot-sources', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setSources(data.sources || []);
  }
  async function loadLogs() {
    const res = await fetch('/api/admin/chat-logs', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setLogs(data.logs || []);
    setStats(data.stats || stats);
  }

  useEffect(() => { if (ready) { loadSources(); loadLogs(); } }, [ready]);

  async function addSource() {
    await fetch('/api/admin/chatbot-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: sourceType, ...form }),
    });
    setForm({ label: '', url: '', docText: '', question: '', answer: '' });
    loadSources();
  }
  async function removeSource(id) {
    await fetch('/api/admin/chatbot-sources', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    loadSources();
  }

  if (!ready) return <div className="admin-main">Loading…</div>;

  return (
    <div className="admin-shell">
      <div className="admin-side">
        <div className="logo">Ask <span>Shree</span> admin</div>
        <div className="admin-nav">
                    <a href="/admin">Overview</a>
          <a href="/admin/dashboard">Analytics</a>
          <a href="/admin/job-postings">Job postings</a>
          <a href="/admin/chatbot" className="active">Ask Shree chatbot</a>
          <a href="/settings">Settings</a>
          <a href="/admin/margin-ai">Margin.ai</a>
        </div>
      </div>
      <div className="admin-main">
        <div className="admin-header"><h2>Chatbot control</h2></div>
        <div className="mode-switch" style={{ justifyContent: 'flex-start', padding: 0, border: 'none', marginBottom: 20 }}>
          <button className={tab === 'sources' ? 'active' : ''} onClick={() => setTab('sources')}>Knowledge sources</button>
          <button className={tab === 'logs' ? 'active' : ''} onClick={() => setTab('logs')}>Conversation logs</button>
        </div>

        {tab === 'sources' && (
          <>
            <div className="panel">
              <div className="panel-head"><h3>Add a knowledge source</h3></div>
              <div style={{ padding: 20 }}>
                <div className="mode-switch" style={{ justifyContent: 'flex-start', padding: 0, border: 'none', marginBottom: 16 }}>
                  {['url', 'page', 'tool', 'file', 'qa'].map((t) => (
                    <button key={t} className={sourceType === t ? 'active' : ''} onClick={() => setSourceType(t)}>{t}</button>
                  ))}
                </div>
                {(sourceType === 'url' || sourceType === 'page') && (
                  <div className="repo-row" style={{ padding: 0, border: 'none' }}>
                    <input placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
                    <input placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                    <button onClick={addSource}>Add</button>
                  </div>
                )}
                {sourceType === 'tool' && (
                  <div>
                    <input placeholder="Tool name" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} style={{ width: '100%', marginBottom: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', borderRadius: 6, padding: 10, color: 'var(--cream)' }} />
                    <textarea placeholder="What should the bot know about it" value={form.docText} onChange={(e) => setForm({ ...form, docText: e.target.value })} style={{ width: '100%', minHeight: 80, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', borderRadius: 6, padding: 10, color: 'var(--cream)', marginBottom: 10 }} />
                    <button className="primary-btn" onClick={addSource}>Add tool reference</button>
                  </div>
                )}
                {sourceType === 'file' && (
                  <div>
                    <input placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} style={{ width: '100%', marginBottom: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', borderRadius: 6, padding: 10, color: 'var(--cream)' }} />
                    <textarea placeholder="Paste document text" value={form.docText} onChange={(e) => setForm({ ...form, docText: e.target.value })} style={{ width: '100%', minHeight: 100, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', borderRadius: 6, padding: 10, color: 'var(--cream)', marginBottom: 10 }} />
                    <button className="primary-btn" onClick={addSource}>Add file source</button>
                  </div>
                )}
                {sourceType === 'qa' && (
                  <div>
                    <input placeholder="Question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} style={{ width: '100%', marginBottom: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', borderRadius: 6, padding: 10, color: 'var(--cream)' }} />
                    <textarea placeholder="Exact answer" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} style={{ width: '100%', minHeight: 80, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', borderRadius: 6, padding: 10, color: 'var(--cream)', marginBottom: 10 }} />
                    <button className="primary-btn" onClick={addSource}>Add Q&amp;A pair</button>
                  </div>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><h3>Active sources ({sources.length})</h3></div>
              {sources.map((s) => (
                <div key={s.id} className="repo-list-item">
                  <div><span className="src-type">{s.source_type}</span>{s.label}</div>
                  <span className="row-action" onClick={() => removeSource(s.id)}>remove</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'logs' && (
          <>
            <div className="metric-row">
              <div className="metric"><div className="label">Questions this week</div><div className="val">{stats.weekCount}</div></div>
              <div className="metric"><div className="label">Answered confidently</div><div className="val">{stats.confidentPct}%</div></div>
              <div className="metric"><div className="label">Flagged — couldn't answer</div><div className="val">{stats.flaggedCount}</div></div>
            </div>
            <div className="panel">
              <div className="panel-head"><h3>Recent conversations</h3></div>
              {logs.map((l) => (
                <div key={l.id} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 13, color: 'var(--cream)', marginBottom: 4 }}>
                    &quot;{l.question}&quot;
                    {l.flagged_reason && <span className="status-locked status-pill" style={{ marginLeft: 8 }}>flagged — {l.flagged_reason}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--slate)' }}>{l.answer}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--amber-dim)', marginTop: 6, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500 }}>{l.page || 'homepage'} · {new Date(l.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

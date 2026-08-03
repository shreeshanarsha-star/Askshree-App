'use client';
import { useEffect, useState } from 'react';
import { useAdminSession } from '../../../lib/useAdminSession';

export default function DataSourcesPage() {
  const { token, ready } = useAdminSession();
  const [sources, setSources] = useState([]);
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');

  async function load() {
    const res = await fetch('/api/admin/repository', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setSources(data.sources || []);
  }

  useEffect(() => {
    if (ready) load();
  }, [ready]);

  async function addUrl() {
    if (!url) return;
    setStatus('Fetching and summarizing…');
    await fetch('/api/admin/repository', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: 'url', url, label: url }),
    });
    setUrl('');
    setStatus('');
    load();
  }

  async function uploadFile() {
    if (!file) return;
    setStatus('Reading document…');
    const form = new FormData();
    form.append('file', file);
    const uploadRes = await fetch('/api/admin/repository/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const { text, label } = await uploadRes.json();
    await fetch('/api/admin/repository', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: 'doc', docText: text, label }),
    });
    setFile(null);
    setStatus('');
    load();
  }

  async function remove(id) {
    await fetch('/api/admin/repository', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    load();
  }

  if (!ready) return <div className="admin-main">Loading…</div>;

  return (
    <div className="admin-shell">
      <div className="admin-side">
        <div className="logo">Ask <span>Shree</span> admin</div>
        <div className="admin-nav">
          <a href="/admin">Overview</a>
          <a href="/admin/data-sources" className="active">Ask Shree data sources</a>
        </div>
      </div>
      <div className="admin-main">
        <div className="admin-header"><h2>Ask Shree data sources</h2><span className="today">unrestricted &middot; not gated</span></div>

        <div className="panel">
          <div className="panel-head"><h3>Add a URL for Ask Shree to reference</h3></div>
          <div className="repo-row">
            <input type="text" placeholder="https://naturalremedy.com/careers" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button onClick={addUrl}>Add URL</button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h3>Upload a document for Ask Shree to reference</h3></div>
          <div className="repo-row">
            <input type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files[0])} style={{ padding: 6 }} />
            <button onClick={uploadFile}>Upload file</button>
          </div>
        </div>

        {status && <p style={{ fontSize: 12.5, color: 'var(--amber-dim)' }}>{status}</p>}

        <div className="panel">
          <div className="panel-head"><h3>Current repository ({sources.length})</h3><span className="action">Ask Shree checks these first, then the public web</span></div>
          {sources.map((s) => (
            <div key={s.id} className="repo-list-item">
              <span><span className="src-type">{s.source_type.toUpperCase()}</span>{s.label}</span>
              <span className="row-action" onClick={() => remove(s.id)}>Remove</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

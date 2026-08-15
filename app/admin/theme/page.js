'use client';
import { useEffect, useState } from 'react';
import { useAdminSession } from '../../../lib/useAdminSession';
import { THEMES } from '../../../lib/themes';

export default function AdminTheme() {
  const { token, ready } = useAdminSession();
  const [current, setCurrent] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/site-theme', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setCurrent(data.theme);
  }
  useEffect(() => { if (ready) load(); }, [ready]);

  async function setTheme(id) {
    setSaving(true);
    await fetch('/api/admin/site-theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ theme: id }),
    });
    setCurrent(id);
    setSaving(false);
  }

  if (!ready || current === null) return <div className="admin-main">Loading…</div>;

  return (
    <div className="admin-shell">
      <div className="admin-side">
        <div className="logo">Ask <span>Shree</span> admin</div>
        <div className="admin-nav">
                    <a href="/admin">Overview</a>
          <a href="/admin/dashboard">Analytics</a>
          <a href="/admin/job-postings">Job postings</a>
          <a href="/admin/chatbot">Ask Shree chatbot</a>
          <a href="/admin/theme" className="active">Site theme</a>
          <a href="/admin/margin-ai">Margin.ai</a>
        </div>
      </div>
      <div className="admin-main">
        <div className="admin-header"><h2>Site-wide default theme</h2></div>
        <p className="file-hint" style={{ marginBottom: 10 }}>
          Applies to any visitor who hasn't picked their own theme in Settings. {saving && 'Saving…'}
        </p>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <div key={t.id} className={`theme-swatch ${current === t.id ? 'active' : ''}`} style={{ background: t.gradient }} onClick={() => setTheme(t.id)}>
              {current === t.id && <div className="theme-swatch-check">✓</div>}
              <div className="theme-swatch-label">{t.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

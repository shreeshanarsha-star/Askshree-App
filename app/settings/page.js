'use client';
import { useEffect, useState } from 'react';
import { useAdminSession } from '../../lib/useAdminSession';
import { THEMES } from '../../lib/themes';

const SHORTCUTS = [
  { label: 'Overview', desc: 'Usage & IP metrics', href: '/admin' },
  { label: 'Analytics', desc: 'Trends & activity heatmap', href: '/admin/dashboard' },
  { label: 'Job postings', desc: 'Manage job postings', href: '/admin/job-postings' },
  { label: 'Ask Shree chatbot', desc: 'Chatbot content control', href: '/admin/chatbot' },
  { label: 'Margin.ai', desc: 'Commission & actions admin', href: '/admin/margin-ai' },
];

export default function SettingsPage() {
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
          <a href="/settings" className="active">Settings</a>
          <a href="/admin/margin-ai">Margin.ai</a>
        </div>
      </div>
      <div className="admin-main">
        <div className="admin-header"><h2>Settings</h2></div>

        <div className="panel">
          <div className="panel-head"><h3>Quick links</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, padding: 18 }}>
            {SHORTCUTS.map((s) => (
              <a key={s.href} href={s.href} style={{
                display: 'block', textDecoration: 'none', border: '1px solid var(--line)', borderRadius: 10,
                padding: '14px 16px', background: 'rgba(255,255,255,0.015)',
              }}>
                <div style={{ fontSize: 13.5, color: 'var(--cream)', fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--slate)' }}>{s.desc}</div>
              </a>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Site-wide default theme</h3>
            {saving && <span className="action">Saving…</span>}
          </div>
          <div style={{ padding: 18 }}>
            <p className="file-hint" style={{ marginBottom: 14 }}>
              Applies to any visitor who hasn't picked their own theme override in this browser.
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
      </div>
    </div>
  );
}

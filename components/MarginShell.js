'use client';
import ThemeShell from './ThemeShell';

export function KeyGate({ error, keyVal, setKey, submit, checking }) {
  return (
    <ThemeShell className="margin-gate">
      <div className="margin-gate-card">
        <div className="logo">Ask <span>Shree</span></div>
        <div className="sub">Margin.ai — enter key</div>
        <input type="password" autoFocus placeholder="Key" value={keyVal}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        <button className="primary-btn" style={{ width: '100%' }} onClick={submit} disabled={checking}>
          {checking ? 'Checking…' : 'Unlock'}
        </button>
        {error && <div className="err">{error}</div>}
      </div>
    </ThemeShell>
  );
}

export function MarginNav({ active }) {
  return (
    <div className="admin-side">
      <div className="logo">Ask <span>Shree</span> — Margin.ai</div>
      <div className="admin-nav">
        <a href="/tools/margin-ai" className={active === 'dashboard' ? 'active' : ''}>Command Center</a>
        <a href="/tools/margin-ai/actions" className={active === 'actions' ? 'active' : ''}>Actions</a>
      </div>
    </div>
  );
}

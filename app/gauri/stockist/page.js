'use client';
import { useEffect, useState } from 'react';

// Stockist dashboard — placeholder for phase 2. Phase 1 is intake + AI draft
// + vet approval only; coordinating stockists/paravets to get product to
// farmers is the next phase. This page is login-gated so the account and
// role already work end-to-end, ready to build on.
export default function GauriStockistPage() {
  const [account, setAccount] = useState(undefined);

  async function loadMe() {
    const res = await fetch('/api/gauri/me');
    const data = await res.json();
    setAccount(data.account || null);
    if (!data.account || data.account.role !== 'stockist') window.location.href = '/gauri/login';
  }
  useEffect(() => { loadMe(); }, []);

  async function logout() {
    await fetch('/api/gauri/logout', { method: 'POST' });
    window.location.href = '/gauri/login';
  }

  if (account === undefined) return <div className="admin-main">Loading…</div>;

  return (
    <div className="admin-shell">
      <div className="admin-side">
        <div className="logo">Gauri<span>.ai</span></div>
        <div className="admin-nav">
          <a href="/gauri/stockist" className="active">Dashboard</a>
          <a onClick={logout} style={{ cursor: 'pointer' }}>Sign out ({account?.displayName})</a>
        </div>
      </div>
      <div className="admin-main">
        <div className="admin-header"><h2>Stockist dashboard</h2></div>
        <div className="panel">
          <div style={{ padding: '28px 20px', color: 'var(--slate)', fontSize: 13, lineHeight: 1.7 }}>
            You're signed in as <b style={{ color: 'var(--cream)' }}>{account.displayName}</b>.
            Fulfillment coordination — matching approved cases to stock and getting product to farmers —
            is phase 2 and isn't live yet. Phase 1 covers farmer intake, AI triage, and vet approval only.
          </div>
        </div>
      </div>
    </div>
  );
}

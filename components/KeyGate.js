'use client';

export function KeyGate({ error, keyVal, setKey, submit, checking, label }) {
  return (
    <div className="margin-gate">
      <div className="margin-gate-card">
        <div className="logo">Ask <span>Shree</span></div>
        <div className="sub">{label || 'Enter key to continue'}</div>
        <input type="password" autoFocus placeholder="Key" value={keyVal}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        <button className="primary-btn" style={{ width: '100%' }} onClick={submit} disabled={checking}>
          {checking ? 'Checking…' : 'Unlock'}
        </button>
        {error && <div className="err">{error}</div>}
      </div>
    </div>
  );
}

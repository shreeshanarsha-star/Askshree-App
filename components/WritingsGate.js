'use client';

export function WritingsGate({ error, keyVal, setKey, submit, checking }) {
  return (
    <div className="margin-gate">
      <div className="margin-gate-card">
        <div className="logo">Ask <span>Shree</span></div>
        <div className="sub">my writings — enter code</div>
        <input type="password" autoFocus placeholder="Code" value={keyVal}
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

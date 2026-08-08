'use client';
import { useState } from 'react';
import { supabasePublic } from '../../lib/supabase';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (password.length < 8) {
      setStatus('Use at least 8 characters.');
      return;
    }
    setLoading(true);
    const supabase = supabasePublic();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setStatus(error.message);
    } else {
      setStatus('Password updated. Redirecting to sign in…');
      setTimeout(() => (window.location.href = '/admin/login'), 1500);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="mark">S</div>
        <div className="logo">Set a new password</div>
        <div className="sub">This applies to your Ask Shree admin login</div>
        <label>New password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()} />
        <button onClick={save} disabled={loading}>{loading ? 'Saving…' : 'Save password'}</button>
        {status && <div style={{ color: 'var(--amber)', fontSize: 12, marginTop: 10 }}>{status}</div>}
      </div>
    </div>
  );
}

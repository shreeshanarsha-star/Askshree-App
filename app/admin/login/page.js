'use client';
import { useState } from 'react';
import { supabasePublic } from '../../../lib/supabase';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setError(null);
    const supabase = supabasePublic();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    window.location.href = '/admin';
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="mark">S</div>
        <div className="logo">Ask <span>Shree</span> admin</div>
        <div className="sub">Private — not publicly visible</div>
        <label>Email</label>
        <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && signIn()} />
        <button onClick={signIn} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        {error && <div style={{ color: '#e28080', fontSize: 12, marginTop: 10 }}>{error}</div>}
        <div className="login-note">Set up your admin account in Supabase Dashboard → Authentication → Users</div>
      </div>
    </div>
  );
}

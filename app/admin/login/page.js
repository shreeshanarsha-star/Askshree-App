'use client';
import { useState } from 'react';
import { supabasePublic } from '../../../lib/supabase';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetNote, setResetNote] = useState(null);

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

  async function forgotPassword() {
    if (!email) {
      setError('Enter your email above first, then click "Forgot password?"');
      return;
    }
    setError(null);
    const supabase = supabasePublic();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setResetNote(error ? error.message : `Reset link sent to ${email}.`);
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
        {resetNote && <div style={{ color: 'var(--amber)', fontSize: 12, marginTop: 10 }}>{resetNote}</div>}
        <div className="login-note" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={forgotPassword}>Forgot password?</div>
      </div>
    </div>
  );
}

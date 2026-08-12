'use client';
import { useState } from 'react';
import { supabasePublic } from '../../lib/supabase';

// Public account login/signup — separate from /admin/login. Any account
// created here gets the free-use limits lifted on every tool (Job
// Postings.ai, Apply.ai, Assessment.ai, Offer.ai, Smart screen.ai), but
// does NOT get admin dashboard access — that requires user_metadata.role
// === 'admin', set manually, never via this self-serve form.
export default function LoginPage() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setError(null);
    setNote(null);
    const supabase = supabasePublic();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    window.location.href = '/';
  }

  async function signUp() {
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError(null);
    setNote(null);
    const supabase = supabasePublic();
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.session) {
      window.location.href = '/';
      return;
    }
    setNote('Account created — check your email to confirm it, then sign in.');
    setMode('signin');
  }

  async function forgotPassword() {
    if (!email) { setError('Enter your email above first, then click "Forgot password?"'); return; }
    setError(null);
    const supabase = supabasePublic();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setNote(error ? error.message : `Reset link sent to ${email}.`);
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="mark">S</div>
        <div className="logo">Ask <span>Shree</span></div>
        <div className="sub">{mode === 'signin' ? 'Sign in to your account' : 'Create a free account'}</div>

        <label>Email</label>
        <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (mode === 'signin' ? signIn() : signUp())} />

        <button onClick={mode === 'signin' ? signIn : signUp} disabled={loading}>
          {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        {error && <div style={{ color: '#e28080', fontSize: 12, marginTop: 10 }}>{error}</div>}
        {note && <div style={{ color: 'var(--amber)', fontSize: 12, marginTop: 10 }}>{note}</div>}

        <div className="login-note" style={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setNote(null); }}>
          {mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
        </div>
        {mode === 'signin' && (
          <div className="login-note" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={forgotPassword}>
            Forgot password?
          </div>
        )}
      </div>
    </div>
  );
}

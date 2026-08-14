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

  async function signInWithGoogle() {
    setError(null);
    const supabase = supabasePublic();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="mark">S</div>
        <div className="logo">Ask <span>Shree</span></div>
        <div className="sub">{mode === 'signin' ? 'Sign in to your account' : 'Create a free account'}</div>

        <button type="button" onClick={signInWithGoogle} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(255,255,255,0.03)',
          color: 'var(--cream)', fontSize: 13.5, cursor: 'pointer', marginTop: 6,
        }}>
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.2 0 19-7.4 19-19 0-1.4-.1-2.7-.4-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.5 18.9 12.5 24 12.5c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.7 0-14.4 4.3-17.7 10.2z"/><path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.3-7.2 2.3-5.3 0-9.7-3.6-11.3-8.4l-6.5 5C9.5 39.1 16.2 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C40.9 36 43.5 30.5 43.5 24c0-1.4-.1-2.7-.4-3.5z"/></svg>
          Continue with Google
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0', color: 'var(--slate)', fontSize: 11 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />or<div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

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

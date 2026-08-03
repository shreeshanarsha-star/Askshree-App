'use client';
import { useState } from 'react';

export default function SubscribePage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function goToCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error || 'Could not start checkout.');
    } catch (e) {
      setError('Network error. Try again.');
    }
    setLoading(false);
  }

  return (
    <div className="section" style={{ maxWidth: 480, margin: '80px auto' }}>
      <h2>Subscribe to Ask Shree</h2>
      <p className="lead">Your free trial has ended. Subscribe to keep using the toolkit.</p>
      <input
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)', borderRadius: 8, padding: 12, color: 'var(--cream)', marginBottom: 14 }}
      />
      <button onClick={goToCheckout} disabled={loading || !email}
        style={{ width: '100%', background: 'var(--amber)', color: '#1a1204', border: 'none', borderRadius: 6, padding: 12, fontWeight: 500, cursor: 'pointer' }}>
        {loading ? 'redirecting…' : 'Continue to payment'}
      </button>
      {error && <div style={{ marginTop: 14, color: '#e28080' }}>{error}</div>}
    </div>
  );
}

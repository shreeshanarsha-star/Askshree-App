'use client';
import { useState, useEffect } from 'react';

// Client-side gate for Margin.ai — prompts for the key, verifies it against
// a real API call (not just a client-side string match), remembers it for
// the tab session, and hands back a fetch wrapper that attaches it to every
// request. If the server ever rejects the key (401), the gate re-locks.
export function useMarginKey() {
  const [key, setKey] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  async function tryKey(k) {
    setChecking(true);
    setError('');
    try {
      const res = await fetch('/api/tools/margin/dashboard', { headers: { 'X-Margin-Key': k } });
      if (res.status === 401) {
        setError('Incorrect key.');
        sessionStorage.removeItem('marginKey');
        setUnlocked(false);
      } else {
        sessionStorage.setItem('marginKey', k);
        setKey(k);
        setUnlocked(true);
      }
    } catch {
      setError('Something went wrong — try again.');
    }
    setChecking(false);
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('marginKey');
    if (stored) tryKey(stored);
    else setChecking(false);
  }, []);

  async function marginFetch(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: { ...(opts.headers || {}), 'X-Margin-Key': key, 'Content-Type': 'application/json' },
    });
    if (res.status === 401) { setUnlocked(false); sessionStorage.removeItem('marginKey'); }
    return res;
  }

  return { key, setKey, unlocked, checking, error, submit: () => tryKey(key), marginFetch };
}

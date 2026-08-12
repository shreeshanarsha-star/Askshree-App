'use client';
import { useState, useEffect } from 'react';

export function useSiteKey(probeUrl) {
  const [key, setKey] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  async function tryKey(k) {
    setChecking(true);
    setError('');
    try {
      const res = await fetch(probeUrl, { headers: { 'X-Site-Key': k } });
      if (res.status === 401) {
        setError('Incorrect key.');
        sessionStorage.removeItem('siteKey');
        setUnlocked(false);
      } else {
        sessionStorage.setItem('siteKey', k);
        setKey(k);
        setUnlocked(true);
      }
    } catch {
      setError('Something went wrong — try again.');
    }
    setChecking(false);
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('siteKey');
    if (stored) tryKey(stored);
    else setChecking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function siteFetch(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: { ...(opts.headers || {}), 'X-Site-Key': key, 'Content-Type': 'application/json' },
    });
    if (res.status === 401) { setUnlocked(false); sessionStorage.removeItem('siteKey'); }
    return res;
  }

  return { key, setKey, unlocked, checking, error, submit: () => tryKey(key), siteFetch };
}

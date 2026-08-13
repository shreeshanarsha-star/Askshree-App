'use client';
import { useState, useEffect } from 'react';

export function useWritingsKey() {
  const [key, setKey] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  async function tryKey(k) {
    setChecking(true);
    setError('');
    try {
      const res = await fetch('/api/writings/key-check', { headers: { 'X-Writings-Key': k } });
      if (res.status === 401) {
        setError('Incorrect code.');
        sessionStorage.removeItem('writingsKey');
        setUnlocked(false);
      } else {
        sessionStorage.setItem('writingsKey', k);
        setKey(k);
        setUnlocked(true);
      }
    } catch {
      setError('Something went wrong — try again.');
    }
    setChecking(false);
  }

  useEffect(() => {
    const stored = sessionStorage.getItem('writingsKey');
    if (stored) tryKey(stored);
    else setChecking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { key, setKey, unlocked, checking, error, submit: () => tryKey(key) };
}

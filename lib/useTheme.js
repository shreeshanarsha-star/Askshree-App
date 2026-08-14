'use client';
import { useState, useEffect } from 'react';
import { DEFAULT_THEME } from './themes';

const STORAGE_KEY = 'askshree_theme';

// Personal override (localStorage) wins if set; otherwise falls back to
// whatever the admin has configured as the site-wide default.
export function useTheme() {
  const [themeId, setThemeId] = useState(DEFAULT_THEME);
  const [ready, setReady] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      setThemeId(stored);
      setHasOverride(true);
      setReady(true);
      return;
    }
    fetch('/api/site-theme').then((r) => r.json()).then((d) => {
      setThemeId(d.theme || DEFAULT_THEME);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  function chooseTheme(id) {
    localStorage.setItem(STORAGE_KEY, id);
    setThemeId(id);
    setHasOverride(true);
  }

  function resetToSiteDefault() {
    localStorage.removeItem(STORAGE_KEY);
    setHasOverride(false);
    fetch('/api/site-theme').then((r) => r.json()).then((d) => setThemeId(d.theme || DEFAULT_THEME));
  }

  return { themeId, ready, hasOverride, chooseTheme, resetToSiteDefault };
}

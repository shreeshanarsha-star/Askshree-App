'use client';
import { useState, useLayoutEffect, useEffect } from 'react';
import { DEFAULT_THEME } from './themes';

const STORAGE_KEY = 'askshree_theme';
// Separate from the personal-override key above: this caches whatever the
// site-wide default LAST resolved to, purely so repeat visits can paint
// the right colors on the very first client render instead of flashing
// unthemed defaults for the round-trip it takes /api/site-theme to
// respond. Personal overrides still always win when present.
const SITE_DEFAULT_CACHE_KEY = 'askshree_site_theme_cache';

function readCache(key) {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

// Personal override (localStorage) wins if set; otherwise falls back to
// whatever the admin has configured as the site-wide default.
//
// IMPORTANT: initial state here must be SSR-safe (i.e. identical to what
// the server rendered) or React throws hydration errors #418/#423 on
// every returning visit, since the server has no localStorage to read and
// always renders the DEFAULT_THEME/ready=false state. The cached value is
// applied in a useLayoutEffect instead -- that runs synchronously right
// after the hydration-matching commit but BEFORE the browser paints, so
// there's still no visible flash of the wrong theme, just no hydration
// mismatch either. (Previously this read localStorage directly inside
// useState(() => ...), which mismatched the server render and forced
// React to tear down and rebuild the whole themed subtree on every load.)
export function useTheme() {
  const [themeId, setThemeId] = useState(DEFAULT_THEME);
  const [ready, setReady] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);

  useLayoutEffect(() => {
    const cached = readCache(STORAGE_KEY) || readCache(SITE_DEFAULT_CACHE_KEY);
    if (cached) {
      setThemeId(cached);
      setReady(true);
      setHasOverride(!!readCache(STORAGE_KEY));
    }
  }, []);

  useEffect(() => {
    const stored = readCache(STORAGE_KEY);
    if (stored) {
      setThemeId(stored);
      setHasOverride(true);
      setReady(true);
      return;
    }
    fetch('/api/site-theme').then((r) => r.json()).then((d) => {
      const t = d.theme || DEFAULT_THEME;
      setThemeId(t);
      setReady(true);
      try { localStorage.setItem(SITE_DEFAULT_CACHE_KEY, t); } catch (e) { /* ignore */ }
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
    fetch('/api/site-theme').then((r) => r.json()).then((d) => {
      const t = d.theme || DEFAULT_THEME;
      setThemeId(t);
      try { localStorage.setItem(SITE_DEFAULT_CACHE_KEY, t); } catch (e) { /* ignore */ }
    });
  }

  return { themeId, ready, hasOverride, chooseTheme, resetToSiteDefault };
}

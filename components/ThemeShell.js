'use client';
import { useSearchParams } from 'next/navigation';
import ThemeBackground from './ThemeBackground';
import { useTheme } from '../lib/useTheme';
import { getThemeAccentStyle } from '../lib/themes';

// Shared site-wide wrapper: the same animated background + selected-theme
// accent color used on Home/About/Contact/Credits/Gauri, packaged so every
// other page can opt in with one import instead of re-deriving the
// useTheme + getThemeAccentStyle + ThemeBackground boilerplate each time.
// Safe to render from a Server Component too (children only, no functions
// passed down), so SEO-critical pages (e.g. /jobs) can stay server-rendered
// while still getting the themed backdrop.
// `rawChildren`: skip the inner position:relative/z-index wrapper -- only
// for classNames that already bring their own stacking context (e.g.
// .admin-shell, which is `display:grid` expecting exactly 2 direct
// children; an extra wrapper div would collapse that grid into 1 cell).
// Every other consumer gets the safe default.
export default function ThemeShell({ children, className, style, rawChildren }) {
  const { themeId, ready } = useTheme();
  // Tool pages render this same full-page background when visited directly
  // -- but they're also loaded a second way, inside the reactor's small
  // workspace iframe (see FeatureWorkspace.js), which appends ?embed=1 to
  // the src for exactly this reason. A full-page animated canvas squeezed
  // into that small pane doesn't scale down gracefully -- it reads as a
  // stray, oddly-placed ring/particle glitch behind whatever's on top of
  // it (e.g. the KeyGate unlock card), not a themed backdrop. The animation
  // belongs to standalone pages and the reactor itself, not a cramped embed.
  let embedded = false;
  try {
    embedded = useSearchParams()?.get('embed') === '1';
  } catch (e) { /* no router context (e.g. rendered outside app router) -- default to false */ }
  return (
    <div className={className} style={{ position: 'relative', ...(style || {}), ...(ready ? getThemeAccentStyle(themeId) : {}) }}>
      {ready && !embedded && <ThemeBackground themeId={themeId} />}
      {/* Real content always needs to sit above the absolutely-positioned
          background canvas. Per CSS stacking rules, a positioned element
          (the canvas wrapper, z-index:0) paints *above* plain in-flow,
          non-positioned siblings -- so without this wrapper, any page whose
          content div doesn't already carry its own position:relative +
          z-index would render invisibly behind the animation. Established
          pages (About/Contact/Gauri) work around this per-page via their
          own position:relative;zIndex:1 content div; this wrapper makes
          that guarantee universal by default. */}
      {rawChildren ? children : (
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      )}
    </div>
  );
}

'use client';
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
export default function ThemeShell({ children, className, style }) {
  const { themeId, ready } = useTheme();
  return (
    <div className={className} style={{ position: 'relative', ...(style || {}), ...(ready ? getThemeAccentStyle(themeId) : {}) }}>
      {ready && <ThemeBackground themeId={themeId} />}
      {children}
    </div>
  );
}

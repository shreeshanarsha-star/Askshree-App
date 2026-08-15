'use client';
import Sidebar from '../../components/Sidebar';
import ThemeBackground from '../../components/ThemeBackground';
import { THEMES } from '../../lib/themes';
import { useTheme } from '../../lib/useTheme';
import HeyShreeVoice from '../../components/HeyShreeVoice';

export default function SettingsPage() {
  const { themeId, ready, hasOverride, chooseTheme, resetToSiteDefault } = useTheme();

  return (
    <div style={{ position: 'relative' }}>
      <Sidebar active="settings" />
      <div className="side-content">
        <ThemeBackground themeId={themeId} />
        <div className="simple-page">
          <div className="eyebrow">Settings</div>
          <h1>Choose your theme</h1>
          <p className="sub">Pick a background mood for the site. This only changes what you see — saved in this browser.</p>
          {hasOverride && (
            <div className="file-hint" style={{ marginTop: 6 }}>
              Using your own choice, not the site default. <span style={{ color: 'var(--amber-dim)', cursor: 'pointer', textDecoration: 'underline' }} onClick={resetToSiteDefault}>Reset to site default</span>
            </div>
          )}

          {ready && (
            <div className="theme-grid">
              {THEMES.map((t) => (
                <div key={t.id} className={`theme-swatch ${themeId === t.id ? 'active' : ''}`} style={{ background: t.gradient }} onClick={() => chooseTheme(t.id)}>
                  {themeId === t.id && <div className="theme-swatch-check">✓</div>}
                  <div className="theme-swatch-label">{t.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <HeyShreeVoice />
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useOptionalSession } from '../lib/useOptionalSession';

const ICONS = {
  home: <path d="M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10" />,
  systems: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  pencil: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
  credit: <><path d="M12 2 3 7l9 5 9-5-9-5z" /><path d="M3 12l9 5 9-5M3 17l9 5 9-5" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  login: <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5M15 12H3" /></>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="8" y1="22" x2="16" y2="22" /></>,
};

function Icon({ name, size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

function openHeyShree() {
  const btn = document.querySelector('.heyshree-launcher');
  if (btn) btn.click();
}

const APPS = [
  { key: 'home', name: 'home', label: 'Home', href: '/home2' },
  { key: 'systems', name: 'systems', label: 'AI Systems', href: '/home2#ai-systems' },
  { key: 'heyshree', name: 'mic', label: 'HeyShree', onClick: openHeyShree },
  { key: 'writings', name: 'pencil', label: 'Writings', href: '/writings/purpose' },
  { key: 'about', name: 'user', label: 'About Me', href: '/about' },
  { key: 'contact', name: 'mail', label: 'Contact', href: '/contact' },
  { key: 'credits', name: 'credit', label: 'Credits', disabled: true },
  { key: 'settings', name: 'gear', label: 'Settings', href: '/settings' },
];

export default function AppLauncher() {
  const [open, setOpen] = useState(false);
  const { ready, email, signOut } = useOptionalSession();

  return (
    <>
      {open && <div className="applauncher-backdrop" onClick={() => setOpen(false)} />}

      <button
        type="button"
        className="applauncher-btn"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="applauncher-dots">
          {Array.from({ length: 8 }).map((_, i) => <i key={i} />)}
        </span>
      </button>

      {open && (
        <div className="applauncher-card">
          <div className="applauncher-eyebrow">MENU</div>
          <div className="applauncher-grid">
            {APPS.map((app) =>
              app.disabled ? (
                <div key={app.key} className="applauncher-item applauncher-item-disabled" title="Coming soon">
                  <Icon name={app.name} />
                  <span>{app.label}</span>
                </div>
              ) : app.onClick ? (
                <div
                  key={app.key}
                  className="applauncher-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => { app.onClick(); setOpen(false); }}
                >
                  <Icon name={app.name} />
                  <span>{app.label}</span>
                </div>
              ) : (
                <a key={app.key} className="applauncher-item" href={app.href} onClick={() => setOpen(false)}>
                  <Icon name={app.name} />
                  <span>{app.label}</span>
                </a>
              )
            )}
          </div>

          <div className="applauncher-footer">
            {ready && (
              email ? (
                <div className="applauncher-footer-item" role="button" tabIndex={0} onClick={() => { signOut(); setOpen(false); }} title={email}>
                  <Icon name="login" size={16} /><span>Log out</span>
                </div>
              ) : (
                <a className="applauncher-footer-item" href="/login" onClick={() => setOpen(false)}>
                  <Icon name="login" size={16} /><span>Login</span>
                </a>
              )
            )}
            <a className="applauncher-footer-item" href="https://www.linkedin.com/in/shreesha09/" target="_blank" rel="noopener noreferrer">
              <span className="applauncher-li">in</span><span>LinkedIn</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}

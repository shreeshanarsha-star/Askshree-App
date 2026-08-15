'use client';
import { useState } from 'react';
import { useOptionalSession } from '../lib/useOptionalSession';

const ICONS = {
  home: <path d="M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10" />,
  systems: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  chat: <path d="M4 4h16v12H8l-4 4V4z" />,
  pencil: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
  credit: <><path d="M12 2 3 7l9 5 9-5-9-5z" /><path d="M3 12l9 5 9-5M3 17l9 5 9-5" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  login: <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5M15 12H3" /></>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="8" y1="22" x2="16" y2="22" /></>,
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

function openHeyShree() {
  const btn = document.querySelector('.heyshree-launcher');
  if (btn) btn.click();
}

export default function Sidebar({ active }) {
  const [writingsOpen, setWritingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const { ready, email, signOut } = useOptionalSession();

  function closeFlyouts() { setWritingsOpen(false); setAboutOpen(false); setContactOpen(false); }

  return (
    <nav className="side-rail">
      <a href="/" className="side-logo" title="Ask Shree">
        <div className="side-mark">Ask<span>Shree</span></div>
      </a>

      <div className="side-items">
        <a href="/" className={`side-item ${active === 'home' ? 'active' : ''}`}>
          <Icon name="home" /><span>Home</span>
        </a>
        <a href="/#ai-systems" className={`side-item ${active === 'systems' ? 'active' : ''}`}>
          <Icon name="systems" /><span>AI Systems</span>
        </a>
        <div className="side-item" onClick={openHeyShree} role="button" tabIndex={0}>
          <Icon name="mic" /><span>HeyShree</span>
        </div>

        <div className="side-item-wrap">
          <div className={`side-item ${writingsOpen ? 'active' : ''}`} onClick={() => { setWritingsOpen((o) => !o); setAboutOpen(false); setContactOpen(false); }}>
            <Icon name="pencil" /><span>Writings</span>
          </div>
          {writingsOpen && (
            <div className="side-flyout" onMouseLeave={closeFlyouts}>
              <a href="/writings/purpose">&#9679; Purpose</a>
              <a href="/writings/leadership">&#9679; Leadership</a>
              <a href="/writings/strategy">&#9679; Strategy</a>
              <a href="/writings/artificial-intelligence">&#9679; Artificial Intelligence</a>
              <a href="/writings/spirituality">&#9679; Spirituality</a>
            </div>
          )}
        </div>

        <div className="side-item-wrap">
          <div className={`side-item ${aboutOpen ? 'active' : ''}`} onClick={() => { setAboutOpen((o) => !o); setWritingsOpen(false); setContactOpen(false); }}>
            <Icon name="user" /><span>About Me</span>
          </div>
          {aboutOpen && (
            <div className="side-flyout" onMouseLeave={closeFlyouts}>
              <div className="side-flyout-static">Head-Global Talent Acquisition</div>
              <div className="side-flyout-static">AI Builder</div>
              <div className="side-flyout-static">Bengaluru, India</div>
            </div>
          )}
        </div>

        <div className="side-item-wrap">
          <div className={`side-item ${contactOpen ? 'active' : ''}`} onClick={() => { setContactOpen((o) => !o); setWritingsOpen(false); setAboutOpen(false); }}>
            <Icon name="mail" /><span>Contact</span>
          </div>
          {contactOpen && (
            <div className="side-flyout" onMouseLeave={closeFlyouts}>
              <a href="tel:+919606591623">+91 96065 91623</a>
              <a href="mailto:shreesha.narsha@gmail.com">shreesha.narsha@gmail.com</a>
              <a href="https://www.linkedin.com/in/shreesha09/" target="_blank" rel="noopener noreferrer">linkedin.com/in/shreesha09</a>
            </div>
          )}
        </div>

        <a href="/credits" className={`side-item ${active === 'credits' ? 'active' : ''}`}>
          <Icon name="credit" /><span>Credits</span>
        </a>

        {ready && (
          email ? (
            <div className="side-item" onClick={signOut} role="button" tabIndex={0} title={email}>
              <Icon name="login" /><span>Log out</span>
            </div>
          ) : (
            <a href="/login" className="side-item">
              <Icon name="login" /><span>Login</span>
            </a>
          )
        )}

        <a href="/settings" className={`side-item ${active === 'settings' ? 'active' : ''}`}>
          <Icon name="gear" /><span>Settings</span>
        </a>
      </div>

      <div className="side-social">
        <a href="https://www.linkedin.com/in/shreesha09/" target="_blank" rel="noopener noreferrer" title="LinkedIn">in</a>
      </div>
    </nav>
  );
}

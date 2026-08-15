'use client';
import Sidebar from '../../components/Sidebar';
import ThemeBackground from '../../components/ThemeBackground';
import { useTheme } from '../../lib/useTheme';
import { getThemeAccentStyle } from '../../lib/themes';
import HeyShreeVoice from '../../components/HeyShreeVoice';

const CHANNELS = [
  { role: 'Phone', name: '+91 96065 91623', href: 'tel:+919606591623' },
  { role: 'Email', name: 'shreesha.narsha@gmail.com', href: 'mailto:shreesha.narsha@gmail.com' },
  { role: 'LinkedIn', name: 'linkedin.com/in/shreesha09', href: 'https://www.linkedin.com/in/shreesha09/' },
];

export default function ContactPage() {
  const { themeId, ready } = useTheme();
  return (
    <div style={{ position: 'relative', ...(ready ? getThemeAccentStyle(themeId) : {}) }}>
      <Sidebar active="contact" />
      <div className="side-content">
        {ready && <ThemeBackground themeId={themeId} />}
        <div className="simple-page">
          <div className="eyebrow">Contact</div>
          <h1>Get in touch</h1>
          <p className="sub">Reach out directly — phone, email, or LinkedIn.</p>

          <div className="credits-list">
            {CHANNELS.map((c) => (
              <a key={c.role} href={c.href} target={c.role === 'LinkedIn' ? '_blank' : undefined} rel={c.role === 'LinkedIn' ? 'noopener noreferrer' : undefined}
                 className="credits-item" style={{ display: 'block', textDecoration: 'none' }}>
                <div className="role">{c.role}</div>
                <div className="name">{c.name}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
      <HeyShreeVoice />
    </div>
  );
}

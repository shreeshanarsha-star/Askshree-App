'use client';
import Sidebar from '../../components/Sidebar';
import ThemeBackground from '../../components/ThemeBackground';
import { useTheme } from '../../lib/useTheme';
import { getThemeAccentStyle } from '../../lib/themes';
import HeyShreeVoice from '../../components/HeyShreeVoice';

export default function AboutPage() {
  const { themeId, ready } = useTheme();
  return (
    <div style={{ position: 'relative', ...(ready ? getThemeAccentStyle(themeId) : {}) }}>
      <Sidebar active="about" />
      <div className="side-content">
        {ready && <ThemeBackground themeId={themeId} />}
        <div className="simple-page">
          <div className="eyebrow">About</div>
          <h1>Shreesha Narsha</h1>
          <p className="sub">Head-Global Talent Acquisition &middot; AI Builder &middot; Bengaluru, India</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 22, margin: '28px 0 32px' }}>
            <div style={{
              width: 92, height: 92, borderRadius: '50%', border: '1px solid var(--amber-dim)',
              overflow: 'hidden', flexShrink: 0, background: 'var(--navy-2)',
            }}>
              <img src="/profile-photo.jpg" alt="Shreesha Narsha" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11.5, color: 'var(--amber-dim)', lineHeight: 2 }}>
              <div>Head-Global Talent Acquisition &#9679;</div>
              <div>AI Builder &#9679;</div>
              <div>Bengaluru, India &#9679;</div>
            </div>
          </div>

          <div style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--cream)', maxWidth: 620 }}>
            <p style={{ margin: '0 0 20px' }}>
              A talent acquisition leader who architected the solution, then coded it with AI to fix his
              own talent acquisition challenges &mdash; until delegating tasks to AI became the solution itself.
            </p>
            <p style={{ margin: '0 0 20px' }}>
              I lead talent acquisition at scale, and in my own time I build AI-native recruiting tools
              &mdash; sourcing, screening, assessment, offers, and everything in between &mdash; to fix the problems
              I run into on the job.
            </p>
            <p style={{ margin: 0 }}>
              Beyond the tools, I write about purpose, leadership, strategy, AI, and spirituality &mdash;
              you'll find those under Writings.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap' }}>
            <a href="/writings/purpose" className="engage-btn" style={{ textDecoration: 'none' }}>my writings</a>
            <a href="/credits" className="engage-btn" style={{ textDecoration: 'none' }}>credits</a>
            <a href="https://www.linkedin.com/in/shreesha09/" target="_blank" rel="noopener noreferrer" className="engage-btn" style={{ textDecoration: 'none' }}>linkedin</a>
            <a href="mailto:shreesha.narsha@gmail.com" className="engage-btn" style={{ textDecoration: 'none' }}>email</a>
          </div>
        </div>
      </div>
      <HeyShreeVoice />
    </div>
  );
}

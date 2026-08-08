'use client';
import { useState, useEffect } from 'react';
import NeuralBackground from '../components/NeuralBackground';
import AskShreeChat from '../components/AskShreeChat';

const TOOL_LINKS = {
  'job posting.ai': '/tools/job-posting-ai',
  'smart source.ai': '/tools/smart-source-ai',
  'smart screen.ai': '/tools/smart-screen-ai',
};
const TOOL_NAMES = [
  'Job posting.ai', 'Smart Source.ai', 'Smart hunt.ai', 'Smart screen.ai', 'Interview.ai',
  'Assessment.ai', 'Offer.ai', 'Refer.ai', 'Onboard.ai', 'Induction.ai', 'Campus.ai', 'Analytics.ai', 'Dashboard.ai',
];
export default function HomePage() {
  const [query, setQuery] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [recruitOpen, setRecruitOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(null);
  const [shareNote, setShareNote] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);

  const SHARE_URL = 'https://askshree.com';
  const SHARE_TEXT = 'AI-native recruiting tools by Shreesha Narsha';

  useEffect(() => {
    function onScroll() {
      setShowScrollHint(window.scrollY < 120);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetch('/api/homepage/likes').then((r) => r.json()).then((d) => setLikeCount(d.count)).catch(() => setLikeCount(0));
  }, []);

  async function handleLike() {
    setJustLiked(true);
    setTimeout(() => setJustLiked(false), 400);
    setLikeCount((c) => (typeof c === 'number' ? c + 1 : c)); // instant feedback, corrected below
    try {
      const res = await fetch('/api/homepage/likes', { method: 'POST' });
      const data = await res.json();
      if (typeof data.count === 'number') setLikeCount(data.count);
    } catch (e) { /* optimistic count already shown */ }
  }

  function shareVia(kind) {
    const url = encodeURIComponent(SHARE_URL);
    const text = encodeURIComponent(SHARE_TEXT);
    const links = {
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      email: `mailto:?subject=${encodeURIComponent('Ask Shree')}&body=${text}%20${url}`,
    };
    if (links[kind]) window.open(links[kind], '_blank', 'noopener,noreferrer');
    setShareOpen(false);
  }

  async function copyShareLink() {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(SHARE_URL);
      setShareNote('Link copied');
      setTimeout(() => setShareNote(''), 2000);
    }
    setShareOpen(false);
  }

  function scrollToNext() {
    document.querySelector('.section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    const id = setInterval(() => setHintIndex((i) => (i + 1) % TOOL_NAMES.length), 2200);
    return () => clearInterval(id);
  }, []);

  function runQuery() {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const match = Object.keys(TOOL_LINKS).find((name) => name.includes(q) || q.includes(name));
    if (match) window.location.href = TOOL_LINKS[match];
    else document.querySelector('.chat-launcher')?.click();
  }

  return (
    <div style={{ position: 'relative' }}>
      <NeuralBackground />

      <div className="nav">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="logo">Ask <span>Shree</span></div>
          <span className="mic-badge" title="Voice — coming soon">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </span>
        </div>
        <div className="nav-right">
          <div className="links" style={{ position: 'relative' }}>
            <span onClick={() => setContactOpen((o) => !o)} style={{ cursor: 'pointer' }}>my contact</span>
            {contactOpen && (
              <div style={{ position: 'absolute', top: 28, right: 0, background: 'var(--navy-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '14px 18px', fontSize: 12.5, color: 'var(--cream)', minWidth: 220, zIndex: 10 }}>
                <div><a href="tel:+919606591623" style={{ color: 'inherit', textDecoration: 'none' }}>+91 96065 91623</a></div>
                <div style={{ margin: '8px 0', borderTop: '1px solid var(--line)' }}></div>
                <div><a href="mailto:shreesha.narsha@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>shreesha.narsha@gmail.com</a></div>
                <div style={{ margin: '8px 0', borderTop: '1px solid var(--line)' }}></div>
                <div><a href="https://www.linkedin.com/in/shreesha09/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>linkedin.com/in/shreesha09</a></div>
              </div>
            )}
          </div>
          <div className="profile">
            <div className="tags">
              <div>Head-Global Talent Acquisition &#9679;</div>
              <div>AI Builder &#9679;</div>
              <div>Bengaluru &#9679;</div>
            </div>
            <div className="ring">
              <img src="/profile-photo.jpg" alt="Shreesha Narsha" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="hero">
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--amber)', fontSize: 16, marginBottom: 10 }}>
            <span style={{ color: 'var(--cream)', fontStyle: 'normal' }}>Hiring is evolving.</span> So am I.
          </div>
          <h1>
            A talent acquisition leader who architected the solution, then coded it with AI to fix
            his own talent acquisition challenges — until <em>delegating tasks to AI became the solution itself.</em>
          </h1>
          <p className="sub">Talent acquisition, based in Bengaluru — building AI-native tools for sourcing and hiring in my own time.</p>

          <div className="terminal">
            <span className="chev">&gt;</span>
            <input
              type="text"
              placeholder={`Try a tool name... ${TOOL_NAMES[hintIndex]}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runQuery()}
            />
            <button className="run" onClick={runQuery}>run query</button>
          </div>

          <div className="engage-row">
            <button className={`engage-btn ${justLiked ? 'liked' : ''}`} onClick={handleLike}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill={justLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7.5-4.6-10-9.3C.6 8.4 2 4.8 5.6 4c2-.4 3.9.5 5 2 1.1-1.5 3-2.4 5-2 3.6.8 5 4.4 3.6 7.7-2.5 4.7-10 9.3-10 9.3z" />
              </svg>
              Like{likeCount !== null ? ` · ${likeCount}` : ''}
            </button>

            <div style={{ position: 'relative' }}>
              <button className="engage-btn" onClick={() => setShareOpen((o) => !o)}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" />
                  <line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
                </svg>
                Share
              </button>
              {shareOpen && (
                <div style={{ position: 'absolute', top: 40, left: 0, background: 'var(--navy-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 0', fontSize: 12.5, color: 'var(--cream)', minWidth: 170, zIndex: 10 }}>
                  <div className="share-menu-item" onClick={() => shareVia('whatsapp')}>WhatsApp</div>
                  <div className="share-menu-item" onClick={() => shareVia('linkedin')}>LinkedIn</div>
                  <div className="share-menu-item" onClick={() => shareVia('twitter')}>X / Twitter</div>
                  <div className="share-menu-item" onClick={() => shareVia('email')}>Email</div>
                  <div className="share-menu-item" onClick={copyShareLink}>Copy link</div>
                </div>
              )}
            </div>
            {shareNote && <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--amber-dim)' }}>{shareNote}</span>}
          </div>

        </div>
      </div>

      <div className={`scroll-indicator-wrap ${showScrollHint ? '' : 'hidden'}`}>
        <button className="scroll-indicator" onClick={scrollToNext} aria-label="Scroll down">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <div className="section">
        <div className="eyebrow">AI SYSTEMS</div>
        <div style={{ marginTop: 16 }}>
          <div className="ai-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="ai-badge">A</span>
                <span className="ai-name">C suite.ai</span>
              </div>
            </div>
          </div>

          <div className="ai-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setRecruitOpen((o) => !o)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="ai-badge">B</span>
                <span className="ai-name">Recruit.ai</span>
              </div>
              <span style={{ color: 'var(--slate)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>{recruitOpen ? '▾' : '▸'}</span>
            </div>
            {recruitOpen && (
              <div style={{ marginTop: 16, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--slate)', lineHeight: 2.2 }}>
                <span style={{ color: 'var(--cream)', cursor: 'pointer', marginRight: 16 }} onClick={() => window.location.href = '/tools/job-posting-ai'}>Job posting.ai</span>
                <span style={{ cursor: 'pointer', marginRight: 16 }} onClick={() => window.location.href = '/tools/smart-source-ai'}>Smart Source.ai</span>
                <span style={{ cursor: 'pointer', marginRight: 16 }} onClick={() => window.location.href = '/tools/smart-screen-ai'}>Smart screen.ai</span>
                <span style={{ opacity: 0.45, marginRight: 16 }}>Smart hunt.ai</span>
                <span style={{ opacity: 0.45, marginRight: 16 }}>Interview.ai</span>
                <span style={{ opacity: 0.45, marginRight: 16 }}>Assessment.ai</span>
                <span style={{ opacity: 0.45, marginRight: 16 }}>Offer.ai</span>
                <span style={{ opacity: 0.45, marginRight: 16 }}>Refer.ai</span>
                <span style={{ opacity: 0.45, marginRight: 16 }}>Onboard.ai</span>
                <span style={{ opacity: 0.45, marginRight: 16 }}>Induction.ai</span>
                <span style={{ opacity: 0.45, marginRight: 16 }}>Campus.ai</span>
                <span style={{ opacity: 0.45, marginRight: 16 }}>Analytics.ai</span>
                <span style={{ opacity: 0.45 }}>Dashboard.ai</span>
              </div>
            )}
          </div>

          <div className="ai-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="ai-badge">C</span>
                <span className="ai-name">Talent.ai</span>
              </div>
            </div>
          </div>

          <div className="ai-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setMarketOpen((o) => !o)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="ai-badge">D</span>
                <span className="ai-name">Market.ai</span>
              </div>
              <span style={{ color: 'var(--slate)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>{marketOpen ? '▾' : '▸'}</span>
            </div>
            {marketOpen && (
              <div style={{ marginTop: 16, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--slate)', lineHeight: 2.2 }}>
                <span style={{ opacity: 0.45, marginRight: 16 }}>Leads.ai</span>
                <span style={{ opacity: 0.45 }}>Research.ai</span>
              </div>
            )}
          </div>

          {[
            ['E', 'Learn.ai'],
            ['F', 'Rewards.ai'],
            ['G', 'Finance.ai'],
            ['H', 'Brand.ai'],
            ['I', 'Sales.ai'],
            ['J', 'Research.ai'],
          ].map(([letter, name]) => (
            <div className="ai-group" key={letter}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="ai-badge">{letter}</span>
                  <span className="ai-name">{name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AskShreeChat />
    </div>
  );
}

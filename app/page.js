'use client';
import { useState, useEffect } from 'react';
import NeuralBackground from '../components/NeuralBackground';
import AskShreeChat from '../components/AskShreeChat';

const TOOL_LINKS = {
  'job postings.ai': '/tools/job-postings-ai',
  'apply.ai': '/tools/apply-ai',
  'smart source.ai': '/tools/smart-source-ai',
  'smart hunt.ai': '/tools/smart-hunt-ai',
  'smart screen.ai': '/tools/smart-screen-ai',
  'voice.ai': '/tools/voice-ai',
};
const TOOL_NAMES = [
  'Job Postings.ai', 'Apply.ai', 'Smart Source.ai', 'Smart hunt.ai', 'Smart screen.ai', 'Voice.ai', 'Interview.ai',
  'Assessment.ai', 'Offer.ai', 'Refer.ai', 'Onboard.ai', 'Induction.ai', 'Campus.ai', 'Analytics.ai', 'Dashboard.ai',
];
export default function HomePage() {
  const [query, setQuery] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [recruitOpen, setRecruitOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [writingsOpen, setWritingsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsCode, setSettingsCode] = useState('');
  const [settingsError, setSettingsError] = useState('');
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
    fetch('/api/homepage/likes', { cache: 'no-store' }).then((r) => r.json()).then((d) => setLikeCount(d.count)).catch(() => setLikeCount(0));
  }, []);

  async function handleLike() {
    setJustLiked(true);
    setTimeout(() => setJustLiked(false), 400);
    setLikeCount((c) => (typeof c === 'number' ? c + 1 : c)); // instant feedback, corrected below
    try {
      const res = await fetch('/api/homepage/likes', { method: 'POST', cache: 'no-store' });
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
          <div className="logo-wrap">
            <div className="logo">Ask <span>Shree</span></div>
            <div className="logo-tooltip">I fall, but I still stand up and show up!</div>
          </div>
          <span className="mic-badge" title="Voice — coming soon">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </span>
          <div style={{ position: 'relative' }}>
            <span className="settings-badge" title="Settings"
              onClick={() => { setSettingsOpen((o) => !o); setSettingsCode(''); setSettingsError(''); }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            {settingsOpen && (
              <div className="settings-pop">
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'var(--slate)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Enter code</div>
                <input type="password" autoFocus value={settingsCode}
                  onChange={(e) => { setSettingsCode(e.target.value); setSettingsError(''); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (settingsCode === 'SN2026') { window.location.href = '/admin'; }
                      else { setSettingsError('Incorrect code.'); setSettingsCode(''); }
                    }
                  }} />
                {settingsError && <div className="err">{settingsError}</div>}
              </div>
            )}
          </div>
        </div>
        <div className="nav-right">
          <div className="links" style={{ position: 'relative', display: 'flex', gap: 40 }}>
            <div style={{ position: 'relative' }}>
              <span onClick={() => { setWritingsOpen((o) => !o); setContactOpen(false); }} style={{ cursor: 'pointer' }}>my writings</span>
              {writingsOpen && (
                <div style={{ position: 'absolute', top: 28, left: 0, background: 'var(--navy-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px 0', fontSize: 12.5, color: 'var(--cream)', minWidth: 200, zIndex: 10 }}>
                  <a href="/writings/purpose" style={{ display: 'block', padding: '8px 18px', color: 'inherit', textDecoration: 'none' }}>&#9679; Purpose</a>
                  <a href="/writings/leadership" style={{ display: 'block', padding: '8px 18px', color: 'inherit', textDecoration: 'none' }}>&#9679; Leadership</a>
                  <a href="/writings/strategy" style={{ display: 'block', padding: '8px 18px', color: 'inherit', textDecoration: 'none' }}>&#9679; Strategy</a>
                  <a href="/writings/artificial-intelligence" style={{ display: 'block', padding: '8px 18px', color: 'inherit', textDecoration: 'none' }}>&#9679; Artificial Intelligence</a>
                  <a href="/writings/spirituality" style={{ display: 'block', padding: '8px 18px', color: 'inherit', textDecoration: 'none' }}>&#9679; Spirituality</a>
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
            <span onClick={() => { setContactOpen((o) => !o); setWritingsOpen(false); }} style={{ cursor: 'pointer' }}>my contact</span>
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
              <div className="tool-grid">
                <a className="live" href="/tools/job-postings-ai">Job Postings.ai</a>
                <a className="live" href="/tools/apply-ai">Apply.ai</a>
                <a className="live" href="/tools/smart-source-ai">Smart Source.ai</a>
                <a className="live" href="/tools/smart-hunt-ai">Smart hunt.ai</a>
                <a className="live" href="/tools/smart-screen-ai">Smart screen.ai</a>
                <a className="live" href="/tools/assessment-ai">Assessment.ai</a>
                <a className="live" href="/tools/offer-ai">Offer.ai</a>
                <a className="live" href="/tools/voice-ai">Voice.ai</a>
                <span className="soon">Interview.ai</span>
                <span className="soon">Refer.ai</span>
                <span className="soon">Onboard.ai</span>
                <span className="soon">Induction.ai</span>
                <span className="soon">Campus.ai</span>
                <span className="soon">Analytics.ai</span>
                <span className="soon">Dashboard.ai</span>
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

          <div className="ai-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setFinanceOpen((o) => !o)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="ai-badge">G</span>
                <span className="ai-name">Finance.ai</span>
              </div>
              <span style={{ color: 'var(--slate)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>{financeOpen ? '▾' : '▸'}</span>
            </div>
            {financeOpen && (
              <div style={{ marginTop: 16, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--slate)', lineHeight: 2.2 }}>
                <span style={{ color: 'var(--cream)', cursor: 'pointer', marginRight: 16 }} onClick={() => window.location.href = '/tools/margin-ai'}>Margin.ai</span>
              </div>
            )}
          </div>

          {[
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

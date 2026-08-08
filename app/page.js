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
  'Assessment.ai', 'Offer.ai', 'Refer.ai', 'Onboard.ai', 'Analytics.ai', 'Dashboard.ai',
];
export default function HomePage() {
  const [query, setQuery] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [recruitOpen, setRecruitOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

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
        <div>
          <div className="logo">Ask <span>Shree</span></div>
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
          <div style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', color: 'var(--amber)', fontSize: 14, marginBottom: 10 }}>
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
        </div>
      </div>

      <div className="section">
        <div className="eyebrow">AI SYSTEMS</div>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }} onClick={() => setRecruitOpen((o) => !o)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--amber-dim)', color: 'var(--amber-dim)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A</span>
              <span style={{ fontFamily: 'Fraunces, serif', fontSize: 15, color: 'var(--cream)' }}>Recruit.ai</span>
            </div>
            <span style={{ color: 'var(--slate)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>{recruitOpen ? '▾' : '▸'}</span>
          </div>
          {recruitOpen && (
            <div style={{ marginTop: 16, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--slate)', lineHeight: 2.2 }}>
              <span style={{ color: 'var(--cream)', cursor: 'pointer', marginRight: 16 }} onClick={() => window.location.href = '/tools/job-posting-ai'}>Job posting.ai</span>
              <span style={{ cursor: 'pointer', marginRight: 16 }} onClick={() => window.location.href = '/tools/smart-source-ai'}>Smart Source.ai</span>
              <span style={{ cursor: 'pointer', marginRight: 16 }} onClick={() => window.location.href = '/tools/smart-screen-ai'}>Smart screen.ai</span>
              <span style={{ opacity: 0.45, marginRight: 16 }}>Interview.ai</span>
              <span style={{ opacity: 0.45, marginRight: 16 }}>Assessment.ai</span>
              <span style={{ opacity: 0.45, marginRight: 16 }}>Offer.ai</span>
              <span style={{ opacity: 0.45, marginRight: 16 }}>Refer.ai</span>
              <span style={{ opacity: 0.45, marginRight: 16 }}>Onboard.ai</span>
              <span style={{ opacity: 0.45, marginRight: 16 }}>Analytics.ai</span>
              <span style={{ opacity: 0.45 }}>Dashboard.ai</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--amber-dim)', color: 'var(--amber-dim)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>B</span>
              <span style={{ fontFamily: 'Fraunces, serif', fontSize: 15, color: 'var(--cream)' }}>Talent.ai</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }} onClick={() => setMarketOpen((o) => !o)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--amber-dim)', color: 'var(--amber-dim)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>C</span>
              <span style={{ fontFamily: 'Fraunces, serif', fontSize: 15, color: 'var(--cream)' }}>Market.ai</span>
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
      </div>

      <AskShreeChat />
    </div>
  );
}

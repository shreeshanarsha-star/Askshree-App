'use client';
import { useState, useEffect } from 'react';
import AskShreeChat from '../../components/AskShreeChat';
import AppLauncher from '../../components/AppLauncher';
import ThemeBackground from '../../components/ThemeBackground';
import { OrbitalStage, FeatureNavPanel, DEPARTMENTS } from '../../components/OrbitalSystems';
import FeatureWorkspace from '../../components/FeatureWorkspace';
import { useTheme } from '../../lib/useTheme';
import { getThemeAccentStyle } from '../../lib/themes';

const TOOL_LINKS = {
  'gauri.ai': '/gauri',
  'job postings.ai': '/tools/job-postings-ai',
  'apply.ai': '/tools/apply-ai',
  'smart source.ai': '/tools/smart-source-ai',
  'smart hunt.ai': '/tools/smart-hunt-ai',
  'smart screen.ai': '/tools/smart-screen-ai',
};
const TOOL_NAMES = [
  'Gauri.ai', 'Job Postings.ai', 'Apply.ai', 'Smart Source.ai', 'Smart hunt.ai', 'Smart screen.ai', 'Interview.ai',
  'Assessment.ai', 'Offer.ai', 'Refer.ai', 'Onboard.ai', 'Induction.ai', 'Campus.ai', 'Analytics.ai', 'Dashboard.ai',
];

export default function Home2Page() {
  const [query, setQuery] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const { themeId, ready: themeReady } = useTheme();
  const [justLiked, setJustLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(null);
  const [shareNote, setShareNote] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const selected = DEPARTMENTS.find((d) => d.id === selectedId) || null;
  const SHARE_URL = 'https://askshree.com/home2';
  const SHARE_TEXT = 'AI-native recruiting tools by Shreesha Narsha';

  useEffect(() => {
    fetch('/api/homepage/likes', { cache: 'no-store' }).then((r) => r.json()).then((d) => setLikeCount(d.count)).catch(() => setLikeCount(0));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setHintIndex((i) => (i + 1) % TOOL_NAMES.length), 2200);
    return () => clearInterval(id);
  }, []);

  async function handleLike() {
    setJustLiked(true);
    setTimeout(() => setJustLiked(false), 400);
    setLikeCount((c) => (typeof c === 'number' ? c + 1 : c));
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

  function openFeature(feature) {
    setActiveFeature(feature);
    setWorkspaceExpanded(false);
  }

  function closeFeature() {
    setActiveFeature(null);
    setWorkspaceExpanded(false);
  }

  function wakeReactor() {
    const el = document.getElementById('reactor-core');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('orb2-awake');
    setTimeout(() => el.classList.remove('orb2-awake'), 1200);
  }

  function runQuery() {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const match = Object.keys(TOOL_LINKS).find((name) => name.includes(q) || q.includes(name));
    if (match) window.location.href = TOOL_LINKS[match];
    else document.querySelector('.chat-launcher')?.click();
  }

  return (
    <div className="home2-shell" style={{ position: 'relative', ...(themeReady ? getThemeAccentStyle(themeId) : {}) }}>
      <div className="home2-full">
      {themeReady && <ThemeBackground themeId={themeId} />}

      <div className="home2-topbar">
        <h1 className="home2-topbar-h1">
          Tell me what you need. <em>AI systems will get you there.</em>
        </h1>
        <div className="engage-row" style={{ marginTop: 12 }}>
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
          {shareNote && <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, fontSize: 11, color: 'var(--amber-dim)' }}>{shareNote}</span>}
        </div>
      </div>

      <div className="home2-triptych" id="ai-systems">
        <div className="home2-col">
          <div className="home2-col-label">TACTICAL DISPLAY</div>
          {activeFeature ? (
            <FeatureWorkspace
              feature={activeFeature}
              expanded={workspaceExpanded}
              onToggleExpand={() => setWorkspaceExpanded((e) => !e)}
              onClose={closeFeature}
            />
          ) : (
            <div className="home2-workspace">
              <div className="orb2-panel-empty">
                Select a feature from Feature Display to open it here.
              </div>
            </div>
          )}
        </div>

        <div className="home2-col">
          <div className="home2-col-label">AI SYSTEMS</div>
          <OrbitalStage selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <div className="home2-col">
          <div className="home2-col-label">FEATURE DISPLAY</div>
          <FeatureNavPanel selected={selected} onOpenFeature={openFeature} />
        </div>
      </div>

      <div className="terminal" style={{ marginTop: 32 }}>
        <span className="chev">&gt;</span>
        <button type="button" className="terminal-icon-btn" onClick={wakeReactor} aria-label="Wake HeyShree">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><line x1="12" y1="18" x2="12" y2="22" />
          </svg>
        </button>
        <button type="button" className="terminal-icon-btn" onClick={() => setQuery('')} aria-label="Clear">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
        <input
          type="text"
          placeholder={`Try a tool name... ${TOOL_NAMES[hintIndex]}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runQuery()}
        />
        <button className="run" onClick={runQuery}>run query</button>
      </div>

      <AskShreeChat />
      <AppLauncher />
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import AskShreeChat from '../../components/AskShreeChat';
import AppLauncher from '../../components/AppLauncher';
import ThemeBackground from '../../components/ThemeBackground';
import { OrbitalStage, FeatureNavPanel, DEPARTMENTS } from '../../components/OrbitalSystems';
import FeatureWorkspace from '../../components/FeatureWorkspace';
import { useTheme } from '../../lib/useTheme';
import { getThemeAccentStyle } from '../../lib/themes';

// Flat, searchable index built from the real department/tool data — every
// department and every tool (live or soon) is reachable from the terminal.
const SEARCH_INDEX = DEPARTMENTS.flatMap((d) => [
  { name: d.name, deptId: d.id, kind: 'dept', href: d.href, status: d.status },
  ...d.tools.map((t) => ({ name: t.name, deptId: d.id, kind: 'tool', href: t.href, status: t.status, widget: t.widget })),
]);
const LIVE_COUNT = DEPARTMENTS.filter((d) => d.status === 'live').length;
const TOOL_NAMES = SEARCH_INDEX.filter((e) => e.status === 'live').map((e) => e.name);
const LAST_DEPT_KEY = 'askshree_home2_last_dept';

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
  const [waffleOpen, setWaffleOpen] = useState(false);

  const selected = DEPARTMENTS.find((d) => d.id === selectedId) || null;
  const leftFilled = !!activeFeature;
  const rightFilled = !!selected;
  const triptychCols = leftFilled && rightFilled
    ? '1fr 1.15fr 1fr'
    : leftFilled
      ? '1.1fr 1.15fr 0.55fr'
      : rightFilled
        ? '0.55fr 1.15fr 1.1fr'
        : '0.62fr 1.5fr 0.62fr';
  const SHARE_URL = 'https://askshree.com/home2';
  const SHARE_TEXT = 'AI-native recruiting tools by Shreesha Narsha';

  useEffect(() => {
    fetch('/api/homepage/likes', { cache: 'no-store' }).then((r) => r.json()).then((d) => setLikeCount(d.count)).catch(() => setLikeCount(0));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setHintIndex((i) => (i + 1) % TOOL_NAMES.length), 2200);
    return () => clearInterval(id);
  }, []);

  // Remember the last department the person had open, so a return visit
  // picks up where they left off instead of resetting to a blank console.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LAST_DEPT_KEY);
      if (saved && DEPARTMENTS.some((d) => d.id === saved)) setSelectedId(saved);
    } catch (e) { /* localStorage unavailable — fine, just start blank */ }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    try { window.localStorage.setItem(LAST_DEPT_KEY, selectedId); } catch (e) { /* ignore */ }
  }, [selectedId]);

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
    const match =
      SEARCH_INDEX.find((e) => e.name.toLowerCase() === q) ||
      SEARCH_INDEX.find((e) => e.name.toLowerCase().includes(q) || q.includes(e.name.toLowerCase()));

    if (!match) {
      document.querySelector('.chat-launcher')?.click();
      return;
    }
    if (match.deptId) setSelectedId(match.deptId);
    if (match.widget) { openFeature({ id: match.widget, title: match.name }); return; }
    if (match.href) { window.location.href = match.href; return; }
    if (match.kind === 'tool') { openFeature({ id: 'soon', title: match.name }); return; }
    // department with no href and no tools yet — just leave it selected on the reactor
  }

  return (
    <div className="home2-shell" style={{ position: 'relative', ...(themeReady ? getThemeAccentStyle(themeId) : {}) }}>
      <div className="home2-full">
      {themeReady && <ThemeBackground themeId={themeId} />}

      <div className="home2-topbar">
        <h1 className="home2-topbar-h1">
          Tell me what you need. <em>AI systems will get you there.</em>
        </h1>
      </div>

      <div className="home2-engage-fixed">
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
            <div style={{ position: 'absolute', top: 40, right: 0, background: 'var(--navy-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 0', fontSize: 12.5, color: 'var(--cream)', minWidth: 170, zIndex: 10 }}>
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


      <div className="home2-triptych" id="ai-systems" style={{ gridTemplateColumns: triptychCols }}>
        <span className="orb2-corner orb2-corner-tl" />
        <span className="orb2-corner orb2-corner-tr" />
        <span className="orb2-corner orb2-corner-bl" />
        <span className="orb2-corner orb2-corner-br" />
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
            <div className="home2-empty-panel">
              <div className="orb2-panel-empty">
                Ask Hey Shree to open a tool — try &ldquo;open calculator&rdquo; or pick one from Feature Display — and it&rsquo;ll appear here.
              </div>
            </div>
          )}
        </div>

        <div className="home2-col">
          <div className="home2-col-label">
            AI SYSTEMS
            <span className="orb2-status-line">
              <i className="orb2-status-dot" />
              {LIVE_COUNT} live &middot; {DEPARTMENTS.length} systems
            </span>
          </div>
          <OrbitalStage selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <div className="home2-col">
          <div className="home2-col-label">FEATURE DISPLAY</div>
          <FeatureNavPanel selected={selected} onOpenFeature={openFeature} />
        </div>
      </div>

      <div className="home2-command-grid" style={{ gridTemplateColumns: triptychCols }}>
        <div className="home2-social-bar">
          <button type="button" className="terminal-icon-btn" onClick={() => setWaffleOpen((o) => !o)} aria-label="Open menu" aria-expanded={waffleOpen}>
            <span className="terminal-dots terminal-dots-9">
              {Array.from({ length: 9 }).map((_, i) => <i key={i} />)}
            </span>
          </button>
          <a className="terminal-icon-btn" href="https://www.linkedin.com/in/shreesha09/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" stroke="none">
              <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.6c0-1.34-.02-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V21H9z" />
            </svg>
          </a>
          <a className="terminal-icon-btn" href="#" aria-label="X / Twitter (coming soon)" title="X / Twitter — coming soon" onClick={(e) => e.preventDefault()} style={{ opacity: 0.4, cursor: 'not-allowed' }}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" stroke="none">
              <path d="M18.9 2H22l-7.6 8.7L23.3 22H16.7l-5.2-6.8L5.6 22H2.4l8.1-9.3L1.7 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.7L7.4 3.9H5.6L17.7 20z" />
            </svg>
          </a>
          <a className="terminal-icon-btn" href="https://www.instagram.com/shreesha.narsha/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
            </svg>
          </a>
        </div>

        <div className="terminal">
          <span className="chev">&gt;&gt;</span>
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

      <AskShreeChat />
      <AppLauncher open={waffleOpen} onClose={() => setWaffleOpen(false)} />
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect, useLayoutEffect } from 'react';
import AskShreeChat from './AskShreeChat';
import AppLauncher from './AppLauncher';
import HeyShreeReactor from './HeyShreeReactor';
import GestureControl from './GestureControl';
import { OrbitalStage, OrbitalStageDial, FeatureNavPanel, DEPARTMENTS } from './OrbitalSystems';
import FeatureWorkspace from './FeatureWorkspace';
import { useTheme } from '../lib/useTheme';
import { getThemeAccentStyle } from '../lib/themes';

// Flat, searchable index built from the real department/tool data — every
// department and every tool (live or soon) is reachable from the terminal.
const SEARCH_INDEX = DEPARTMENTS.flatMap((d) => [
  { name: d.name, deptId: d.id, kind: 'dept', href: d.href, status: d.status },
  ...d.tools.map((t) => ({ name: t.name, deptId: d.id, kind: 'tool', href: t.href, status: t.status, widget: t.widget })),
]);
const LIVE_COUNT = DEPARTMENTS.filter((d) => d.status === 'live').length;
const TOOL_NAMES = SEARCH_INDEX.filter((e) => e.status === 'live').map((e) => e.name);
const LAST_DEPT_KEY = 'askshree_home2_last_dept';

// Shared by the typed search bar AND the voice router -- one matcher, two
// input methods. Voice phrasing carries lead verbs typed search doesn't
// ("open calculator" vs "calculator"), so strip those before matching.
const VOICE_LEAD_VERBS = /^(please\s+)?(open|launch|go to|show me|start|pull up|bring up)\s+/i;
function matchToolByText(raw) {
  const q = (raw || '').trim().toLowerCase();
  if (!q) return null;
  const stripped = q.replace(VOICE_LEAD_VERBS, '').trim();
  for (const candidate of [q, stripped]) {
    if (!candidate) continue;
    const exact = SEARCH_INDEX.find((e) => e.name.toLowerCase() === candidate);
    if (exact) return exact;
  }
  for (const candidate of [q, stripped]) {
    if (!candidate) continue;
    const fuzzy = SEARCH_INDEX.find((e) => e.name.toLowerCase().includes(candidate) || candidate.includes(e.name.toLowerCase()));
    if (fuzzy) return fuzzy;
  }
  return null;
}

// Phase 2: media commands. The roadmap's stated scope is "open/embed, not
// remote-control a separate app" -- so "play <x>" opens YouTube's public,
// no-API-key search-embed (listType=search) inside the workspace panel, and
// a bare "open youtube" opens youtube.com in a new tab (its homepage can't
// be iframed -- YouTube sends X-Frame-Options -- so a new tab is the honest
// version of "open" for that case).
const MEDIA_PLAY_PATTERN = /^(please\s+)?(play|put on|listen to)\s+(.+?)[.!?]?$/i;
const MEDIA_OPEN_YT_PATTERN = /^(please\s+)?open\s+youtube\s*(?:and\s+(?:play|search(?:\s+for)?)\s+(.+?))?[.!?]?$/i;
function matchMediaCommand(raw) {
  const q = (raw || '').trim();
  if (!q) return null;
  let m = q.match(MEDIA_PLAY_PATTERN);
  if (m && m[3] && m[3].trim()) return { query: m[3].trim() };
  m = q.match(MEDIA_OPEN_YT_PATTERN);
  if (m) return { query: (m[2] || '').trim() || null };
  return null;
}

// Phase 3: "what's the news" / "news about X". A single, specific trigger
// word ("news" or "headlines") keeps this fast-path free of false positives
// against tool names and general questions -- everything else routes to the
// server-side /api/hey-shree/news route (see that file for why this can't
// be called directly from the browser).
function matchNewsCommand(raw) {
  const q = (raw || '').trim();
  if (!q) return null;
  if (!/\bnews\b|\bheadlines\b/i.test(q)) return null;
  const topicMatch = q.match(/\b(?:news|headlines)\s+(?:about|on|for)\s+(.+?)[.!?]?$/i);
  return { query: topicMatch ? topicMatch[1].trim() : null };
}

export default function ReactorHome() {
  const [query, setQuery] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const { themeId, ready: themeReady } = useTheme();
  const [activeFeature, setActiveFeature] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [waffleOpen, setWaffleOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  // Reading localStorage inside this initializer used to mismatch the
  // server render (which has no localStorage and always renders
  // 'sunburst'), tripping React hydration errors #418/#423 on every
  // returning visit -- and worse than useTheme's version of this bug,
  // this one swaps the ENTIRE reactor component tree (OrbitalStage vs
  // OrbitalStageDial), so the whole reactor got torn down and rebuilt
  // client-side right after load. Always start SSR-safe at 'sunburst';
  // the cached value (if any) is applied in a useLayoutEffect below,
  // synchronously before paint, so there's still no visible flash.
  const [reactorStyle, setReactorStyle] = useState('sunburst');

  useLayoutEffect(() => {
    try {
      const cached = window.localStorage.getItem('askshree_reactor_style_cache');
      if (cached === 'dial' || cached === 'sunburst') setReactorStyle(cached);
    } catch (e) { /* ignore */ }
  }, []);

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

  useEffect(() => {
    const id = setInterval(() => setHintIndex((i) => (i + 1) % TOOL_NAMES.length), 2200);
    return () => clearInterval(id);
  }, []);

  // Which reactor visual (sunburst vs dial) to render -- an admin-wide
  // setting, same read pattern as the site theme.
  useEffect(() => {
    fetch('/api/reactor-style').then((r) => r.json()).then((d) => {
      const style = d.style === 'dial' ? 'dial' : 'sunburst';
      setReactorStyle(style);
      try { window.localStorage.setItem('askshree_reactor_style_cache', style); } catch (e) { /* ignore */ }
    }).catch(() => {});
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

  function openFeature(feature) {
    setActiveFeature(feature);
  }

  function closeFeature() {
    setActiveFeature(null);
  }

  function wakeReactor() {
    const el = document.getElementById('reactor-core');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('orb2-awake');
    setTimeout(() => el.classList.remove('orb2-awake'), 1200);
  }

  function runQuery() {
    const q = query.trim();
    if (!q) return;
    const match = matchToolByText(q);

    if (!match) {
      document.querySelector('.chat-launcher')?.click();
      return;
    }
    if (match.deptId) setSelectedId(match.deptId);
    if (match.widget) { openFeature({ id: match.widget, title: match.name }); return; }
    if (match.href) { openFeature({ id: 'iframe', title: match.name, href: match.href }); return; }
    if (match.kind === 'tool') { openFeature({ id: 'soon', title: match.name }); return; }
    // department with no href and no tools yet — just leave it selected on the reactor
  }

  // The reactor mic's brain. Three tiers, cheapest/fastest first:
  //  1. Direct tool/widget name match (instant, free, same matcher the
  //     typed search bar uses) -- "open calculator", "smart source".
  //  2. A tiny classifier call: is this a candidate-search request? If so,
  //     open Smart Source.ai with the raw spoken sentence pre-filled into
  //     its existing AI job-description parser -- reuses the real search
  //     pipeline instead of re-inventing NLU here.
  //  3. Otherwise, the existing Ask Shree knowledge-base brain answers it
  //     as a general question about the site.
  // Returns the string HeyShreeReactor should speak back.
  async function handleVoiceCommand(text) {
    const raw = (text || '').trim();
    if (!raw) return "I didn't catch that — try again.";

    const match = matchToolByText(raw);
    if (match) {
      if (match.deptId) setSelectedId(match.deptId);
      if (match.widget) { openFeature({ id: match.widget, title: match.name }); return `Opening ${match.name}.`; }
      if (match.href) { openFeature({ id: 'iframe', title: match.name, href: match.href }); return `Opening ${match.name}.`; }
      if (match.kind === 'tool') return `${match.name} is on the roadmap — not live yet.`;
      return `Showing ${match.name}.`;
    }

    const media = matchMediaCommand(raw);
    if (media) {
      // YouTube's old listType=search embed is deprecated (confirmed live:
      // it renders "video unavailable"), and YouTube's own pages refuse to
      // be iframed (X-Frame-Options) -- so a new tab is the only honest way
      // to actually play something. But window.open() called from an async
      // voice-transcript callback loses the browser's "user gesture" token
      // by the time speech recognition resolves (confirmed: popup blocked
      // in testing), so firing it programmatically here would silently do
      // nothing. Instead, open a workspace card with a real link the person
      // clicks themselves -- that's a guaranteed-real gesture, so it always
      // works, with no popup-blocker roulette.
      const url = media.query
        ? `https://www.youtube.com/results?search_query=${encodeURIComponent(media.query)}`
        : 'https://www.youtube.com/';
      openFeature({
        id: 'external-link',
        title: media.query ? `YouTube — ${media.query}` : 'YouTube',
        subtitle: media.query
          ? `Your browser blocks auto-opened tabs from voice, so tap below to play "${media.query}" on YouTube.`
          : 'Your browser blocks auto-opened tabs from voice, so tap below to open YouTube.',
        href: url,
      });
      return media.query
        ? `Here's a link to play ${media.query} on YouTube — tap it in the workspace panel.`
        : "Here's a link to YouTube — tap it in the workspace panel.";
    }

    const news = matchNewsCommand(raw);
    if (news) {
      try {
        const res = await fetch('/api/hey-shree/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: news.query }),
        });
        const data = await res.json();
        if (data.error) return data.error;
        const items = data.items || [];
        if (!items.length) return "I couldn't find any headlines right now.";
        openFeature({ id: 'news', title: news.query ? `News — ${news.query}` : 'Top Headlines', items });
        const spoken = items.slice(0, 3).map((it, i) => `${i + 1}. ${it.title}`).join('. ');
        return `Here are the top headlines. ${spoken}. More in the workspace panel.`;
      } catch (e) {
        return "I couldn't reach the news service — try again in a bit.";
      }
    }

    try {
      const intentRes = await fetch('/api/hey-shree/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: raw }),
      });
      const intentData = await intentRes.json();
      if (intentData.intent === 'search') {
        const title = 'Smart Source.ai';
        const href = `/tools/smart-source-ai?voice_q=${encodeURIComponent(raw)}`;
        openFeature({ id: 'iframe', title, href });
        return `Opening Smart Source.ai with your search — ${raw}. Hit search when you're ready.`;
      }
    } catch (e) { /* fall through to general Q&A below */ }

    try {
      const res = await fetch('/api/ask-shree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: raw, page: 'home2-voice' }),
      });
      const data = await res.json();
      return data.reply || data.error || "I couldn't find an answer for that.";
    } catch (e) {
      return 'Network error — try again.';
    }
  }

  return (
    <div className="home2-shell" style={{ position: 'relative', ...(themeReady ? getThemeAccentStyle(themeId) : {}) }}>
      <div className="home2-full">
      {/* No animated particle background on the reactor page -- it read as
          visual clutter behind the reactor's own glow/sunburst, not premium.
          A plain dark surface (with a subtle static glow via CSS, see
          .home2-full in globals.css) matches the approved mockup instead. */}
      <GestureControl />

      <div className="home2-topbar">
        <h1 className="home2-topbar-h1">
          Tell me what you need. <em>AI systems will get you there.</em>
        </h1>
      </div>

      <div className="home2-triptych" id="ai-systems" style={{ gridTemplateColumns: triptychCols }}>
        <div className="home2-col">
          <div className="home2-col-label">YOUR WORKSPACE</div>
          {activeFeature ? (
            <FeatureWorkspace
              feature={activeFeature}
              onClose={closeFeature}
            />
          ) : (
            <div className="home2-empty-panel">
              <div className="orb2-panel-empty">
                Ask Hey Shree to open a tool — try &ldquo;open calculator&rdquo; or pick one from Tools — and it&rsquo;ll appear here.
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
          {reactorStyle === 'dial' ? (
            <OrbitalStageDial selectedId={selectedId} onSelect={setSelectedId} onMicClick={() => setVoiceOpen(true)} voiceActive={voiceOpen} />
          ) : (
            <OrbitalStage selectedId={selectedId} onSelect={setSelectedId} onMicClick={() => setVoiceOpen(true)} voiceActive={voiceOpen} />
          )}
        </div>

        <div className="home2-col">
          <div className="home2-col-label">TOOLS</div>
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
      <HeyShreeReactor open={voiceOpen} onClose={() => setVoiceOpen(false)} onTranscript={handleVoiceCommand} />
      </div>
    </div>
  );
}

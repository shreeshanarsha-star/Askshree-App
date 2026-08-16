'use client';
import { useState, useEffect } from 'react';

const ICONS = {
  heartbeat: 'M3 12h4l2-7 4 14 2-7h6',
  briefcase: 'M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8zM8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 13h16',
  users: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a2.6 2.6 0 1 0 0-5.2M2.5 19c.6-3 3-5 5.5-5s4.9 2 5.5 5M15 14.3c2.3.4 4.2 2.2 4.7 4.7',
  award: 'M12 3l2.2 4.6 5 .7-3.6 3.6.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.6 5-.7L12 3z',
  megaphone: 'M3 10v4a1 1 0 0 0 1 1h2l7 4V5L6 9H4a1 1 0 0 0-1 1zM17 8a5 5 0 0 1 0 8M20 5a9 9 0 0 1 0 14',
  school: 'M12 3 2 8l10 5 10-5-10-5zM6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5',
  gift: 'M4 9h16v11H4zM4 9V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3M20 9V6a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v3M12 4v16',
  dollar: 'M12 2v20M17 6.5c0-1.9-2.2-3.5-5-3.5S7 4.6 7 6.5s2.2 3 5 3.5 5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z',
  chart: 'M4 19h16M7 16v-4M12 16V8M17 16v-7',
  flask: 'M9 3h6M10 3v6l-5.5 9.5A1 1 0 0 0 5.4 20h13.2a1 1 0 0 0 .9-1.5L14 9V3M8 15h8',
  mic: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6',
  widgets: 'M3 3h7v18H3zM14 3h7v8h-7zM14 13h3v8h-3zM18 13h3v8h-3z',
  chevron: 'M6 9l6 6 6-6',
};

function Icon({ name, size = 18 }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const DEPARTMENTS = [
  { id: 'gauri', letter: 'A', name: 'Gauri.ai', icon: 'heartbeat', status: 'live', href: '/gauri', tools: [] },
  { id: 'csuite', letter: 'B', name: 'C suite.ai', icon: 'briefcase', status: 'soon', tools: [] },
  {
    id: 'recruit', letter: 'C', name: 'Recruit.ai', icon: 'users', status: 'live',
    tools: [
      { name: 'Job Postings.ai', href: '/tools/job-postings-ai', status: 'live' },
      { name: 'Apply.ai', href: '/tools/apply-ai', status: 'live' },
      { name: 'Smart Source.ai', href: '/tools/smart-source-ai', status: 'live' },
      { name: 'Smart hunt.ai', href: '/tools/smart-hunt-ai', status: 'live' },
      { name: 'Smart screen.ai', href: '/tools/smart-screen-ai', status: 'live' },
      { name: 'Assessment.ai', href: '/tools/assessment-ai', status: 'live' },
      { name: 'Offer.ai', href: '/tools/offer-ai', status: 'live' },
      { name: 'Interview.ai', status: 'soon' },
      { name: 'Refer.ai', status: 'soon' },
      { name: 'Onboard.ai', status: 'soon' },
      { name: 'Induction.ai', status: 'soon' },
      { name: 'Campus.ai', status: 'soon' },
      { name: 'Analytics.ai', status: 'soon' },
      { name: 'Dashboard.ai', status: 'soon' },
    ],
  },
  { id: 'talent', letter: 'D', name: 'Talent.ai', icon: 'award', status: 'soon', tools: [] },
  {
    id: 'market', letter: 'E', name: 'Market.ai', icon: 'megaphone', status: 'soon',
    tools: [
      { name: 'Leads.ai', status: 'soon' },
      { name: 'Research.ai', status: 'soon' },
    ],
  },
  { id: 'learn', letter: 'F', name: 'Learn.ai', icon: 'school', status: 'soon', tools: [] },
  { id: 'rewards', letter: 'G', name: 'Rewards.ai', icon: 'gift', status: 'soon', tools: [] },
  {
    id: 'finance', letter: 'H', name: 'Finance.ai', icon: 'dollar', status: 'live',
    tools: [{ name: 'Margin.ai', href: '/tools/margin-ai', status: 'live' }],
  },
  { id: 'brand', letter: 'I', name: 'Brand.ai', icon: 'sparkle', status: 'soon', tools: [] },
  { id: 'sales', letter: 'J', name: 'Sales.ai', icon: 'chart', status: 'soon', tools: [] },
  { id: 'research', letter: 'K', name: 'Research.ai', icon: 'flask', status: 'soon', tools: [] },
  {
    id: 'widgets', letter: 'L', name: 'Widgets.ai', icon: 'widgets', status: 'live',
    tools: [
      { name: 'Calculator', status: 'live', widget: 'calculator' },
      { name: 'Quick Notes', status: 'live', widget: 'notes' },
      { name: 'Calendar', status: 'live', widget: 'calendar' },
      { name: 'Clock', status: 'live', widget: 'clock' },
      { name: 'Timer / Stopwatch', status: 'live', widget: 'timer' },
      { name: 'To-Do List', status: 'live', widget: 'todo' },
      { name: 'Reminders', status: 'live', widget: 'reminders' },
      { name: 'Clipboard / Saved Items', status: 'live', widget: 'clipboard' },
      { name: 'Expense Calculator', status: 'live', widget: 'expense' },
      { name: 'Simple Charts', status: 'live', widget: 'charts' },
      { name: 'Unit Converter', status: 'live', widget: 'unit-converter' },
      { name: 'World Time', status: 'live', widget: 'world-time' },
      { name: 'Moon Phase', status: 'live', widget: 'moon-phase' },
      { name: 'Sunrise / Sunset', status: 'live', widget: 'sunrise-sunset' },
      { name: 'Weather', status: 'soon' },
      { name: 'Maps / Location', status: 'soon' },
      { name: 'What\'s Around Me?', status: 'soon' },
      { name: 'PDF / Document Reader', status: 'soon' },
      { name: 'Image Analyzer', status: 'soon' },
      { name: 'Voice Recorder', status: 'soon' },
      { name: 'Text-to-Speech', status: 'soon' },
      { name: 'Web Search', status: 'soon' },
      { name: 'Email Writer', status: 'soon' },
      { name: 'Email Summarizer', status: 'soon' },
      { name: 'Data Analyzer', status: 'soon' },
      { name: 'Document Summarizer', status: 'soon' },
      { name: 'Idea Generator', status: 'soon' },
      { name: 'Code Assistant', status: 'soon' },
      { name: 'Universe Explorer', status: 'soon' },
      { name: 'Country Explorer', status: 'soon' },
      { name: 'Daily Insight', status: 'soon' },
    ],
  },
];

export function OrbitalStage({ selectedId, onSelect, onMicClick, voiceActive }) {
  const n = DEPARTMENTS.length;
  const R = 39;
  const [hintOn, setHintOn] = useState(true);

  useEffect(() => {
    if (selectedId) setHintOn(false);
  }, [selectedId]);

  function onNodeKeyDown(e, id) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id);
    }
  }

  return (
    <div className="orb2-stage-card">
      <div className="orb2-stage">
        {DEPARTMENTS.map((d, i) => {
          const angle = -90 + (360 / n) * i;
          const rad = (angle * Math.PI) / 180;
          const left = 50 + R * Math.cos(rad);
          const top = 50 + R * Math.sin(rad);
          // Labels live OUTSIDE the circle, never inside it (that's what was
          // causing text to spill past the node edge). Push the label to
          // whichever side points away from the core, so it never crosses
          // the connecting line or crowds the ring.
          const labelAbove = Math.sin(rad) < -0.15;
          return (
            <div key={d.id}>
              <div
                className={`orb2-line ${d.status === 'live' ? 'orb2-live' : ''} ${selectedId === d.id ? 'orb2-line-active' : ''}`}
                style={{ width: `${R}%`, transform: `rotate(${angle}deg)` }}
              />
              <div
                role="button"
                tabIndex={0}
                aria-label={d.name}
                className={`orb2-node-wrap orb2-${d.status} ${selectedId === d.id ? 'orb2-selected' : ''} ${labelAbove ? 'orb2-label-above' : 'orb2-label-below'}`}
                style={{ left: `${left}%`, top: `${top}%` }}
                onClick={() => onSelect(d.id)}
                onKeyDown={(e) => onNodeKeyDown(e, d.id)}
              >
                <div className="orb2-node">
                  <Icon name={d.icon} />
                </div>
                <span className="orb2-nm">{d.name}</span>
              </div>
            </div>
          );
        })}

        <div className="orb2-glow-halo" />
        <div className="orb2-sunburst" />
        <div className="orb2-ring-accent" />
        <div className="orb2-ring orb2-ring-outer" />
        <div className="orb2-ring orb2-ring-mid" />
        {/* A single unmistakable bright point traveling the node ring, on
            top of everything else. Gradient-texture rotation (the sunburst,
            the dashed rings) is real motion but reads as "static" to a
            quick glance -- a discrete dot with a hard-edged glow is the one
            thing nobody can miss, and it doubles as visible proof the
            reactor is alive even at a standstill screenshot cadence. */}
        <div className="orb2-orbit-track"><div className="orb2-orbit-dot" /></div>
        <div
          className={`orb2-core${voiceActive ? ' orb2-awake' : ''}`}
          id="reactor-core"
          role="button"
          tabIndex={0}
          aria-label="Talk to Hey Shree"
          title="Talk to Hey Shree"
          onClick={() => onMicClick && onMicClick()}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onMicClick) { e.preventDefault(); onMicClick(); } }}
        >
          <Icon name="mic" size={24} />
        </div>
      </div>
      {!selectedId && (
        <div className={`orb2-hint ${hintOn ? 'orb2-hint-on' : 'orb2-hint-off'}`}>
          Tap a system to begin
        </div>
      )}
    </div>
  );
}

// ---- Alternate reactor style: "Dial" -----------------------------------
// Same DEPARTMENTS data, same click/keyboard/selection contract as
// OrbitalStage (selectedId, onSelect, onMicClick, voiceActive) so
// ReactorHome can swap between the two styles with no other code changes.
// Visual language is a rotary dial instead of a center-radiating sunburst:
// a solid outer ring, short clock-style tick marks around it, a slow
// counter-rotating dashed ring just inside, and one bright, dominant core.
// No lines connect the nodes to the core -- each node sits directly on the
// ring. This also reads naturally as a "things sit on a ring you could
// rotate" layout, which is the shape a future gesture-rotate-to-select
// interaction would want.
export function OrbitalStageDial({ selectedId, onSelect, onMicClick, voiceActive }) {
  const n = DEPARTMENTS.length;
  const R = 39;
  const [hintOn, setHintOn] = useState(true);
  const selectedDept = DEPARTMENTS.find((d) => d.id === selectedId) || null;

  useEffect(() => {
    if (selectedId) setHintOn(false);
  }, [selectedId]);

  function onNodeKeyDown(e, id) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id);
    }
  }

  return (
    <div className="dial-stage-card">
      {selectedDept && (
        <div className="dial-tag">
          {selectedDept.name}
          <span className={`dial-tag-badge ${selectedDept.status === 'live' ? 'dial-live' : 'dial-soon'}`}>
            {selectedDept.status === 'live' ? 'LIVE' : 'SOON'}
          </span>
        </div>
      )}
      <div className="dial-stage">
        <div className="dial-ticks" />
        <div className="dial-ring-dashed" />
        <div className="dial-ring-outer" />
        <div className="dial-orbit-track"><div className="dial-orbit-dot" /></div>
        {DEPARTMENTS.map((d, i) => {
          const angle = -90 + (360 / n) * i;
          const rad = (angle * Math.PI) / 180;
          const left = 50 + R * Math.cos(rad);
          const top = 50 + R * Math.sin(rad);
          const labelAbove = Math.sin(rad) < -0.15;
          return (
            <div
              key={d.id}
              role="button"
              tabIndex={0}
              aria-label={d.name}
              className={`dial-node-wrap dial-${d.status} ${selectedId === d.id ? 'dial-selected' : ''} ${labelAbove ? 'dial-label-above' : 'dial-label-below'}`}
              style={{ left: `${left}%`, top: `${top}%` }}
              onClick={() => onSelect(d.id)}
              onKeyDown={(e) => onNodeKeyDown(e, d.id)}
            >
              <div className="dial-node">
                <Icon name={d.icon} />
              </div>
              <span className="dial-nm">{d.name}</span>
            </div>
          );
        })}

        <div
          className={`dial-core${voiceActive ? ' dial-awake' : ''}`}
          id="reactor-core-dial"
          role="button"
          tabIndex={0}
          aria-label="Talk to Hey Shree"
          title="Talk to Hey Shree"
          onClick={() => onMicClick && onMicClick()}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onMicClick) { e.preventDefault(); onMicClick(); } }}
        >
          <Icon name="mic" size={22} />
        </div>
      </div>
      {!selectedId && (
        <div className={`dial-hint ${hintOn ? 'dial-hint-on' : 'dial-hint-off'}`}>
          Tap a system to begin
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 6;

export function FeatureNavPanel({ selected, onOpenFeature }) {
  const [showAllSoon, setShowAllSoon] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setShowAllSoon(false);
    setPage(0);
  }, [selected && selected.id]);

  useEffect(() => { setPage(0); }, [showAllSoon]);

  const liveTools = selected ? selected.tools.filter((t) => t.status === 'live') : [];
  const soonTools = selected ? selected.tools.filter((t) => t.status !== 'live') : [];
  const SOON_PREVIEW = 4;
  const visibleSoon = showAllSoon ? soonTools : soonTools.slice(0, SOON_PREVIEW);
  const rows = [...liveTools, ...visibleSoon];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function renderTool(t) {
    return (
      <div key={t.name} className={`orb2-tool-row ${t.status === 'soon' ? 'orb2-tool-soon' : ''}`}>
        {t.widget ? (
          <span
            className="orb2-tool-link"
            role="button"
            tabIndex={0}
            onClick={() => onOpenFeature && onOpenFeature({ id: t.widget, title: t.name })}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onOpenFeature) { e.preventDefault(); onOpenFeature({ id: t.widget, title: t.name }); } }}
          >
            {t.name}
          </span>
        ) : t.status === 'live' ? (
          <span
            className="orb2-tool-link"
            role="button"
            tabIndex={0}
            onClick={() => onOpenFeature && onOpenFeature({ id: 'iframe', title: t.name, href: t.href })}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onOpenFeature) { e.preventDefault(); onOpenFeature({ id: 'iframe', title: t.name, href: t.href }); } }}
          >
            {t.name}
          </span>
        ) : (
          <span
            className="orb2-tool-link"
            role="button"
            tabIndex={0}
            onClick={() => onOpenFeature && onOpenFeature({ id: 'soon', title: t.name })}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onOpenFeature) { e.preventDefault(); onOpenFeature({ id: 'soon', title: t.name }); } }}
          >
            {t.name}
          </span>
        )}
        <span className={`orb2-pill ${t.status === 'soon' ? 'orb2-pill-soon' : ''}`}>
          {t.status === 'live' ? 'LIVE' : 'SOON'}
        </span>
      </div>
    );
  }

  return (
    <div className={selected ? "orb2-panel" : "home2-empty-panel"}>
      {!selected && (
        <div className="orb2-panel-empty">
          Pick a system on the reactor and I&rsquo;ll surface its tools right here.
          <br />
          Hey Shree is listening at the center — wake it any time.
        </div>
      )}
      {selected && (
        <div className="orb2-panel-in" key={selected.id}>
          <div className="orb2-panel-head">
            <div>
              <div className="orb2-panel-title">{selected.name}</div>
              <div className={`orb2-panel-status ${selected.status === 'soon' ? 'orb2-status-soon' : ''}`}>
                {selected.status === 'live' ? 'LIVE' : 'COMING SOON'}
              </div>
            </div>
          </div>

          {selected.tools.length === 0 && selected.href && (
            <span
              className="orb2-open-link"
              role="button"
              tabIndex={0}
              onClick={() => onOpenFeature && onOpenFeature({ id: 'iframe', title: selected.name, href: selected.href })}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onOpenFeature) { e.preventDefault(); onOpenFeature({ id: 'iframe', title: selected.name, href: selected.href }); } }}
            >
              Open {selected.name} &rarr;
            </span>
          )}
          {selected.tools.length === 0 && !selected.href && (
            <div className="orb2-panel-empty">{selected.name} is being built — check back soon.</div>
          )}

          <div className="orb2-tool-rows">
            {pageRows.map(renderTool)}
          </div>

          {!showAllSoon && soonTools.length > SOON_PREVIEW && (
            <button type="button" className="orb2-soon-more" onClick={() => setShowAllSoon(true)}>
              <Icon name="chevron" size={13} />
              {soonTools.length - SOON_PREVIEW} more on the roadmap
            </button>
          )}

          {totalPages > 1 && (
            <div className="orb2-page-nav">
              <button
                type="button" className="orb2-page-btn"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-label="Previous"
              >^</button>
              <span className="orb2-page-indicator">{page + 1} / {totalPages}</span>
              <button
                type="button" className="orb2-page-btn orb2-page-btn-down"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                aria-label="Next"
              >^</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { DEPARTMENTS };

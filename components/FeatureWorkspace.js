'use client';
import { useEffect, useRef, useState } from 'react';
import CalculatorWidget from './widgets/CalculatorWidget';
import NotesWidget from './widgets/NotesWidget';
import CalendarWidget from './widgets/CalendarWidget';
import ClockWidget from './widgets/ClockWidget';
import TimerWidget from './widgets/TimerWidget';
import TodoWidget from './widgets/TodoWidget';
import RemindersWidget from './widgets/RemindersWidget';
import ClipboardWidget from './widgets/ClipboardWidget';
import ExpenseWidget from './widgets/ExpenseWidget';
import ChartsWidget from './widgets/ChartsWidget';
import UnitConverterWidget from './widgets/UnitConverterWidget';
import WorldTimeWidget from './widgets/WorldTimeWidget';
import MoonPhaseWidget from './widgets/MoonPhaseWidget';
import SunriseSunsetWidget from './widgets/SunriseSunsetWidget';

export default function FeatureWorkspace({ feature, onClose }) {
  const wsRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Keep the button label/state in sync with real browser fullscreen state,
  // including when the person exits via Esc instead of our own button.
  useEffect(() => {
    function onFsChange() {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      setFullscreen(!!fsEl && fsEl === wsRef.current);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // If the open tool changes (or closes) while fullscreen, don't leave the
  // person stuck in a fullscreen box pointed at a widget that's gone.
  useEffect(() => {
    return () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl && fsEl === wsRef.current) {
        (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature && feature.id, feature && feature.href]);

  function toggleFullscreen() {
    const el = wsRef.current;
    if (!el) return;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) {
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    }
  }

  if (!feature) return null;

  return (
    <div ref={wsRef} className={`home2-workspace orb2-panel-in ${fullscreen ? 'home2-workspace-fullscreen' : ''}`} key={feature.id + (feature.href || '')}>
      <div className="home2-workspace-head">
        <div className="home2-workspace-title">{feature.title}</div>
        <div className="home2-workspace-actions">
          {feature.href && (
            <a
              className="orb2-fs-icon-btn"
              href={feature.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in new tab"
              title="Open in new tab"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
              </svg>
            </a>
          )}
          <button
            type="button"
            className="orb2-fs-icon-btn"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? (
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3v4a2 2 0 0 1-2 2H3M15 3v4a2 2 0 0 0 2 2h4M21 15h-4a2 2 0 0 0-2 2v4M3 15h4a2 2 0 0 1 2 2v4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9V5a2 2 0 0 1 2-2h4M15 3h4a2 2 0 0 1 2 2v4M21 15v4a2 2 0 0 1-2 2h-4M9 21H5a2 2 0 0 1-2-2v-4" />
              </svg>
            )}
          </button>
          <button type="button" className="home2-workspace-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
      </div>
      <div className="home2-workspace-body">
        {feature.id === 'calculator' && <CalculatorWidget />}
        {feature.id === 'notes' && <NotesWidget />}
        {feature.id === 'calendar' && <CalendarWidget />}
        {feature.id === 'clock' && <ClockWidget />}
        {feature.id === 'timer' && <TimerWidget />}
        {feature.id === 'todo' && <TodoWidget />}
        {feature.id === 'reminders' && <RemindersWidget />}
        {feature.id === 'clipboard' && <ClipboardWidget />}
        {feature.id === 'expense' && <ExpenseWidget />}
        {feature.id === 'charts' && <ChartsWidget />}
        {feature.id === 'unit-converter' && <UnitConverterWidget />}
        {feature.id === 'world-time' && <WorldTimeWidget />}
        {feature.id === 'moon-phase' && <MoonPhaseWidget />}
        {feature.id === 'sunrise-sunset' && <SunriseSunsetWidget />}
        {feature.id === 'iframe' && feature.href && (
          <iframe
            src={feature.href}
            className="home2-workspace-iframe"
            title={feature.title}
            loading="lazy"
          />
        )}
        {feature.id === 'soon' && (
          <div className="home2-workspace-soon">
            <div className="home2-workspace-soon-title">{feature.title}</div>
            <p>This one&rsquo;s on the roadmap — not built yet. Ask Hey Shree again once it&rsquo;s live.</p>
          </div>
        )}
      </div>
    </div>
  );
}

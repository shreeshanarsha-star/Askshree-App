'use client';
import { useMemo } from 'react';

// Known new moon reference: 2000-01-06 18:14 UTC
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);
const SYNODIC_MONTH = 29.530588853; // days

const PHASES = [
  { max: 0.03, name: 'New Moon', emoji: '🌑' },
  { max: 0.22, name: 'Waxing Crescent', emoji: '🌒' },
  { max: 0.28, name: 'First Quarter', emoji: '🌓' },
  { max: 0.47, name: 'Waxing Gibbous', emoji: '🌔' },
  { max: 0.53, name: 'Full Moon', emoji: '🌕' },
  { max: 0.72, name: 'Waning Gibbous', emoji: '🌖' },
  { max: 0.78, name: 'Last Quarter', emoji: '🌗' },
  { max: 0.97, name: 'Waning Crescent', emoji: '🌘' },
  { max: 1.01, name: 'New Moon', emoji: '🌑' },
];

export default function MoonPhaseWidget() {
  const info = useMemo(() => {
    const now = Date.now();
    const daysSince = (now - REF_NEW_MOON) / 86400000;
    const cycles = daysSince / SYNODIC_MONTH;
    const frac = cycles - Math.floor(cycles);
    const ageDays = frac * SYNODIC_MONTH;
    const illumination = (1 - Math.cos(frac * 2 * Math.PI)) / 2;
    const phase = PHASES.find((p) => frac <= p.max) || PHASES[PHASES.length - 1];
    return { phase, ageDays, illumination };
  }, []);

  return (
    <div className="widget-box">
      <div className="widget-big-display">
        <div className="widget-moon-emoji">{info.phase.emoji}</div>
        <div className="widget-moon-phase-name">{info.phase.name}</div>
      </div>
      <div className="widget-sun-row">
        <div className="widget-sun-stat">
          <div className="widget-sun-stat-val">{Math.round(info.illumination * 100)}%</div>
          <div className="widget-sun-stat-label">Illuminated</div>
        </div>
        <div className="widget-sun-stat">
          <div className="widget-sun-stat-val">{info.ageDays.toFixed(1)}</div>
          <div className="widget-sun-stat-label">Days old</div>
        </div>
      </div>
    </div>
  );
}

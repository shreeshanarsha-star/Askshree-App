'use client';
import { useState, useEffect } from 'react';

const ALL_CITIES = [
  { name: 'Bengaluru', tz: 'Asia/Kolkata' },
  { name: 'New York', tz: 'America/New_York' },
  { name: 'London', tz: 'Europe/London' },
  { name: 'Dubai', tz: 'Asia/Dubai' },
  { name: 'Singapore', tz: 'Asia/Singapore' },
  { name: 'Tokyo', tz: 'Asia/Tokyo' },
  { name: 'Sydney', tz: 'Australia/Sydney' },
  { name: 'San Francisco', tz: 'America/Los_Angeles' },
  { name: 'Berlin', tz: 'Europe/Berlin' },
];

const DEFAULT_SELECTION = ['Bengaluru', 'New York', 'London', 'Singapore'];

export default function WorldTimeWidget() {
  const [now, setNow] = useState(null);
  const [selected, setSelected] = useState(DEFAULT_SELECTION);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  function toggle(name) {
    setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));
  }

  if (!now) return null;

  return (
    <div className="widget-box">
      <div className="widget-list" style={{ maxHeight: 'none', marginTop: 0 }}>
        {ALL_CITIES.filter((c) => selected.includes(c.name)).map((c) => (
          <div key={c.name} className="widget-list-item widget-city-row">
            <span className="widget-city-name">{c.name}</span>
            <span className="widget-city-time">{now.toLocaleTimeString(undefined, { timeZone: c.tz, hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
      </div>
      <div className="widget-label" style={{ marginTop: 16 }}>Add / remove cities</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ALL_CITIES.map((c) => (
          <button
            key={c.name} type="button"
            className={`widget-btn-ghost ${selected.includes(c.name) ? 'active' : ''}`}
            style={{ fontSize: 11.5, padding: '6px 10px' }}
            onClick={() => toggle(c.name)}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

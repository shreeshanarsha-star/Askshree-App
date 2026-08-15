'use client';
import { useState, useEffect } from 'react';

export default function ClockWidget() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="widget-box">
      <div className="widget-big-display">
        <div className="widget-clock-time">{time}</div>
        <div className="widget-clock-date">{date}</div>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarWidget() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, muted: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, muted: false });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length, muted: true });

  function isToday(day, muted) {
    return !muted && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  }

  return (
    <div className="widget-box">
      <div className="widget-cal-head">
        <button type="button" className="widget-cal-nav" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month">&lsaquo;</button>
        <div className="widget-cal-title">{MONTHS[month]} {year}</div>
        <button type="button" className="widget-cal-nav" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">&rsaquo;</button>
      </div>
      <div className="widget-cal-grid">
        {DOW.map((d, i) => <div key={i} className="widget-cal-dow">{d}</div>)}
        {cells.map((c, i) => (
          <div key={i} className={`widget-cal-day ${c.muted ? 'muted' : ''} ${isToday(c.day, c.muted) ? 'today' : ''}`}>{c.day}</div>
        ))}
      </div>
      <div className="widget-hint">Today is {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}.</div>
    </div>
  );
}

'use client';
import { useState, useEffect, useRef } from 'react';

function fmt(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function TimerWidget() {
  const [mode, setMode] = useState('timer');

  // Countdown timer
  const [inputMin, setInputMin] = useState('5');
  const [remainingMs, setRemainingMs] = useState(5 * 60 * 1000);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerEndRef = useRef(null);

  // Stopwatch
  const [swMs, setSwMs] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  const swStartRef = useRef(null);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      const left = timerEndRef.current - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        setTimerRunning(false);
        clearInterval(id);
      } else {
        setRemainingMs(left);
      }
    }, 250);
    return () => clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (!swRunning) return;
    const id = setInterval(() => setSwMs(Date.now() - swStartRef.current), 100);
    return () => clearInterval(id);
  }, [swRunning]);

  function startTimer() {
    const mins = parseFloat(inputMin) || 0;
    const ms = mins * 60 * 1000;
    timerEndRef.current = Date.now() + ms;
    setRemainingMs(ms);
    setTimerRunning(true);
  }
  function pauseTimer() {
    setTimerRunning(false);
  }
  function resetTimer() {
    setTimerRunning(false);
    const mins = parseFloat(inputMin) || 0;
    setRemainingMs(mins * 60 * 1000);
  }

  function startStopwatch() {
    swStartRef.current = Date.now() - swMs;
    setSwRunning(true);
  }
  function pauseStopwatch() {
    setSwRunning(false);
  }
  function resetStopwatch() {
    setSwRunning(false);
    setSwMs(0);
  }

  return (
    <div className="widget-box">
      <div className="widget-tabs">
        <div className={`widget-tab ${mode === 'timer' ? 'active' : ''}`} onClick={() => setMode('timer')}>Countdown</div>
        <div className={`widget-tab ${mode === 'stopwatch' ? 'active' : ''}`} onClick={() => setMode('stopwatch')}>Stopwatch</div>
      </div>

      {mode === 'timer' ? (
        <>
          <div className="widget-big-display">
            <div className="widget-timer-display">{fmt(remainingMs)}</div>
          </div>
          <div className="widget-row" style={{ marginTop: 12 }}>
            <input
              type="number" min="0" step="0.5" className="widget-input" value={inputMin}
              onChange={(e) => { setInputMin(e.target.value); if (!timerRunning) setRemainingMs((parseFloat(e.target.value) || 0) * 60 * 1000); }}
              disabled={timerRunning}
            />
            <span className="widget-label" style={{ marginBottom: 0 }}>minutes</span>
          </div>
          <div className="widget-timer-controls">
            {!timerRunning ? (
              <button type="button" className="widget-btn" onClick={startTimer} disabled={remainingMs <= 0 && !inputMin}>Start</button>
            ) : (
              <button type="button" className="widget-btn" onClick={pauseTimer}>Pause</button>
            )}
            <button type="button" className="widget-btn-ghost" onClick={resetTimer}>Reset</button>
          </div>
          {remainingMs === 0 && !timerRunning && <div className="widget-hint">Time&rsquo;s up.</div>}
        </>
      ) : (
        <>
          <div className="widget-big-display">
            <div className="widget-timer-display">{fmt(swMs)}</div>
          </div>
          <div className="widget-timer-controls">
            {!swRunning ? (
              <button type="button" className="widget-btn" onClick={startStopwatch}>Start</button>
            ) : (
              <button type="button" className="widget-btn" onClick={pauseStopwatch}>Pause</button>
            )}
            <button type="button" className="widget-btn-ghost" onClick={resetStopwatch}>Reset</button>
          </div>
        </>
      )}
    </div>
  );
}

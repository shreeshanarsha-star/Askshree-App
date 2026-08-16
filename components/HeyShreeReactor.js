'use client';
import { useEffect, useRef, useState } from 'react';

const LANG = 'en-IN';

// The reactor mic's voice UI. Deliberately "dumb" about what a transcript
// means -- it only listens, speaks, and shows status; the caller (ReactorHome)
// supplies onTranscript(text) => Promise<string> and owns all the actual
// decision-making (navigate, search, or ask). That keeps this component
// reusable and keeps the "brain" in one place next to the rest of the
// reactor's state (openFeature, setSelectedId, etc.).
export default function HeyShreeReactor({ open, onClose, onTranscript }) {
  const [mode, setMode] = useState('idle'); // idle | listening | thinking | speaking
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [micBlocked, setMicBlocked] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  const openRef = useRef(false);
  const micBlockedRef = useRef(false);
  const recognitionRef = useRef(null);
  const startedOnceRef = useRef(false);

  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { micBlockedRef.current = micBlocked; }, [micBlocked]);

  useEffect(() => {
    if (open && !startedOnceRef.current) {
      startedOnceRef.current = true;
      greet();
    }
    if (!open) {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort?.();
      startedOnceRef.current = false;
      setMode('idle');
      setTranscript('');
      setReply('');
      setNeedsTap(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function speak(text, onDone) {
    window.speechSynthesis?.cancel();
    if (!window.speechSynthesis) { onDone?.(); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((v) => v.lang === LANG) || voices.find((v) => v.lang?.startsWith('en'));
    if (v) u.voice = v;
    let started = false;
    u.onstart = () => { started = true; setNeedsTap(false); setMode('speaking'); };
    u.onend = () => { setMode('idle'); onDone?.(); };
    u.onerror = () => { setMode('idle'); onDone?.(); };
    window.speechSynthesis.speak(u);
    setTimeout(() => { if (!started) setNeedsTap(true); }, 1200);
  }

  function greet() {
    const text = "Hey, I'm Shree. Try “open calculator”, “find a sales candidate in Mexico”, “play some lofi music”, or ask me anything about this site.";
    setReply(text);
    speak(text, autoListen);
  }

  function tapToBegin() {
    setNeedsTap(false);
    if (reply) speak(reply, autoListen);
    else greet();
  }

  function autoListen() {
    if (!openRef.current || micBlockedRef.current) return;
    startListening();
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicBlocked(true); return; }
    const r = new SR();
    r.lang = LANG;
    r.continuous = false;
    r.interimResults = true;
    let finalText = '';
    r.onstart = () => setMode('listening');
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setTranscript(finalText || interim);
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setMicBlocked(true);
    };
    r.onend = () => {
      if (finalText.trim()) resolveTranscript(finalText.trim());
      else setMode('idle');
    };
    recognitionRef.current = r;
    try { r.start(); } catch (e) { setMode('idle'); }
  }

  async function resolveTranscript(text) {
    setMode('thinking');
    try {
      const spoken = (await onTranscript(text)) || "Sorry, I didn't catch that.";
      setReply(spoken);
      speak(spoken, autoListen);
    } catch (e) {
      const text2 = 'Something went wrong — try again.';
      setReply(text2);
      speak(text2, autoListen);
    }
  }

  if (!open) return null;

  return (
    <div className="hs-panel open">
      <div className="hs-head">
        <span>Hey Shree</span>
        <span className="x" onClick={onClose}>&times;</span>
      </div>

      <div className="hs-body">
        <div className={`hs-orb ${mode}`}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="8" y1="22" x2="16" y2="22" />
          </svg>
        </div>

        <div className="hs-status">
          {micBlocked ? 'Mic blocked — allow microphone access and reopen.' :
            mode === 'listening' ? 'Listening…' :
            mode === 'thinking' ? 'Thinking…' :
            mode === 'speaking' ? 'Speaking…' : 'Ready'}
        </div>

        {transcript && mode === 'listening' && (
          <div className="hs-line hs-user">&#8220;{transcript}&#8221;</div>
        )}
        {reply && mode !== 'listening' && (
          <div className="hs-line hs-reply">{reply}</div>
        )}

        {needsTap && (
          <button className="hs-tap-btn" onClick={tapToBegin}>Tap to speak</button>
        )}
        {micBlocked && (
          <button className="hs-tap-btn" onClick={() => { setMicBlocked(false); startListening(); }}>Try mic again</button>
        )}
      </div>
    </div>
  );
}

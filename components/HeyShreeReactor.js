'use client';
import { useEffect, useRef, useState } from 'react';

const LANG = 'en-IN';

// Web Speech API's SpeechRecognition times out silently after a few
// seconds of no detected speech (fires a 'no-speech' error, then 'onend'
// with an empty transcript). The mic loop was only re-arming itself on a
// SUCCESSFUL turn -- any pause longer than that timeout just died with no
// explanation, which is exactly what "stops after one task" looks like
// from the outside. Retry a couple of times before actually giving up.
const MAX_NO_SPEECH_RETRIES = 2;

// Explicit ways to end the conversation by voice, so a real back-and-forth
// session (not just one command) has a clean way to close instead of
// relying on the person to notice and tap the X.
const STOP_PATTERN = /^(stop( listening)?|that'?s all|that'?ll be all|goodbye|bye( bye)?|close( this)?|end( conversation)?|i'?m done|we'?re done|nothing else|no more questions?|thanks?,? that'?s it)\.?!?$/i;

// The reactor mic's voice UI. Deliberately "dumb" about what a transcript
// means -- it only listens, speaks, and shows status; the caller (ReactorHome)
// supplies onTranscript(text) => Promise<string> and owns all the actual
// decision-making (navigate, search, or ask). That keeps this component
// reusable and keeps the "brain" in one place next to the rest of the
// reactor's state (openFeature, setSelectedId, etc.).
export default function HeyShreeReactor({ open, onClose, onTranscript, greeting }) {
  const [mode, setMode] = useState('idle'); // idle | listening | thinking | speaking
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [micBlocked, setMicBlocked] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);

  const openRef = useRef(false);
  const micBlockedRef = useRef(false);
  const recognitionRef = useRef(null);
  const startedOnceRef = useRef(false);
  const noSpeechRetriesRef = useRef(0);
  const audioRef = useRef(null);
  // If a call to the ElevenLabs route ever fails (not configured, quota,
  // network), stop trying it for the rest of this session and just use the
  // browser voice -- avoids a failed fetch + fallback round-trip delay
  // before every single line once we already know it's unavailable.
  const elevenLabsDownRef = useRef(false);

  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { micBlockedRef.current = micBlocked; }, [micBlocked]);

  useEffect(() => {
    if (open && !startedOnceRef.current) {
      startedOnceRef.current = true;
      greet();
    }
    if (!open) {
      window.speechSynthesis?.cancel();
      if (audioRef.current) { try { audioRef.current.pause(); } catch (e) {} audioRef.current = null; }
      recognitionRef.current?.abort?.();
      startedOnceRef.current = false;
      noSpeechRetriesRef.current = 0;
      setMode('idle');
      setTranscript('');
      setReply('');
      setNeedsTap(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function speakBrowser(text, onDone) {
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

  // Real, natural voice via ElevenLabs when it's configured; the free
  // browser voice (speakBrowser, above) is the automatic fallback -- on a
  // missing/failed key, a network error, or simply not being open anymore
  // by the time the audio would be ready. The caller never needs to know
  // which one actually spoke.
  async function speak(text, onDone) {
    if (audioRef.current) { try { audioRef.current.pause(); } catch (e) {} audioRef.current = null; }
    window.speechSynthesis?.cancel();

    if (elevenLabsDownRef.current) { speakBrowser(text, onDone); return; }

    try {
      const res = await fetch('/api/hey-shree/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('tts_unavailable');
      if (!openRef.current) return; // panel was closed while we were waiting on the network

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      let started = false;
      audio.onplay = () => { started = true; setNeedsTap(false); setMode('speaking'); };
      audio.onended = () => { URL.revokeObjectURL(url); if (audioRef.current === audio) audioRef.current = null; setMode('idle'); onDone?.(); };
      audio.onerror = () => { URL.revokeObjectURL(url); if (audioRef.current === audio) audioRef.current = null; setMode('idle'); onDone?.(); };
      audio.play().catch(() => { setNeedsTap(true); });
      setTimeout(() => { if (!started) setNeedsTap(true); }, 1200);
    } catch (e) {
      // Not configured, quota exceeded, or a network hiccup -- don't make
      // the person sit through a failed request every single turn.
      elevenLabsDownRef.current = true;
      speakBrowser(text, onDone);
    }
  }

  function greet() {
    const text = greeting || "Hey, I'm Shree. Try “open calculator”, “find a sales candidate in Mexico”, “play some lofi music”, or ask me anything about this site.";
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
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch (e) { /* already stopped */ } }
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
      // Only a real permission problem should stop the loop and show the
      // "mic blocked" state. Everything else ('no-speech', 'aborted',
      // 'network', ...) is recoverable -- onend below decides what to do.
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setMicBlocked(true);
    };
    r.onend = () => {
      recognitionRef.current = null;
      const text = finalText.trim();
      if (text) {
        noSpeechRetriesRef.current = 0;
        resolveTranscript(text);
        return;
      }
      if (!openRef.current || micBlockedRef.current) { setMode('idle'); return; }
      if (noSpeechRetriesRef.current < MAX_NO_SPEECH_RETRIES) {
        noSpeechRetriesRef.current += 1;
        setTimeout(() => { if (openRef.current) startListening(); }, 250);
        return;
      }
      // Gave it a couple of quiet retries -- rather than silently dying,
      // say so and offer a tap to pick the conversation back up.
      noSpeechRetriesRef.current = 0;
      const nudge = "Still there? Tap the mic whenever you'd like to continue.";
      setReply(nudge);
      speak(nudge, () => setNeedsTap(true));
    };
    recognitionRef.current = r;
    try { r.start(); } catch (e) { setMode('idle'); }
  }

  async function resolveTranscript(text) {
    if (STOP_PATTERN.test(text.trim())) {
      const bye = 'Got it — talk soon.';
      setTranscript('');
      setReply(bye);
      speak(bye, () => onClose && onClose());
      return;
    }
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

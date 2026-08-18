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
  const announcedMicBlockedRef = useRef(false);

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
      announcedMicBlockedRef.current = false;
      micBlockedRef.current = false;
      setMicBlocked(false);
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
    // Short voice-only greeting now that there's no panel to show example
    // commands in -- "Yes Boss." for an explicit reactor click, "Hi Boss."
    // for the wake-word trigger (passed in via the greeting prop from
    // ReactorHome). Either way it starts listening right after.
    const text = greeting || 'Yes Boss.';
    setReply(text);
    speak(text, autoListen);
  }

  function tapToBegin() {
    setNeedsTap(false);
    if (reply) speak(reply, autoListen);
    else greet();
  }

  function autoListen() {
    if (!openRef.current) return;
    if (micBlockedRef.current) { announceMicBlocked(); return; }
    startListening();
  }

  // With the panel gone, "mic blocked" and "couldn't start listening" used
  // to be silent-except-for-a-text-box failures -- now that voice is the
  // only channel, they need to actually be SPOKEN, or a real failure looks
  // identical to "said the greeting and just stopped" from the outside.
  function announceMicBlocked() {
    if (announcedMicBlockedRef.current) return;
    announcedMicBlockedRef.current = true;
    const msg = "I can't hear you -- please allow microphone access and try again.";
    setReply(msg);
    speak(msg, () => { onClose && onClose(); });
  }

  function startListening(startAttempt = 0) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicBlocked(true); micBlockedRef.current = true; announceMicBlocked(); return; }
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
      // Only a real permission problem should stop the loop and speak the
      // "mic blocked" message. Everything else ('no-speech', 'aborted',
      // 'network', ...) is recoverable -- onend below decides what to do.
      // Set the ref directly (not just via setState) so the onend handler
      // that fires right after sees it immediately, not after the next
      // render -- state updates alone aren't fast enough here.
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setMicBlocked(true);
        micBlockedRef.current = true;
      }
    };
    r.onend = () => {
      recognitionRef.current = null;
      if (micBlockedRef.current) { announceMicBlocked(); return; }
      const text = finalText.trim();
      if (text) {
        noSpeechRetriesRef.current = 0;
        resolveTranscript(text);
        return;
      }
      if (!openRef.current) { setMode('idle'); return; }
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
    try {
      r.start();
    } catch (e) {
      // Starting a new recognizer while a previous one (e.g. the
      // always-on wake-word listener) hasn't fully released the mic yet
      // can throw synchronously. Retry a couple of times with a short
      // delay before actually giving up out loud.
      recognitionRef.current = null;
      if (startAttempt < 2) {
        setTimeout(() => { if (openRef.current) startListening(startAttempt + 1); }, 300);
        return;
      }
      setMode('idle');
      const msg = "Something went wrong starting the mic -- tap the reactor to try again.";
      setReply(msg);
      speak(msg, () => { onClose && onClose(); });
    }
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

  // No visible chat box per request -- this is voice-only now. All the
  // state above (mode, transcript, reply, needsTap, micBlocked) still
  // drives the conversation logic internally; it just isn't rendered.
  // The reactor's own glow (the voiceActive prop passed to
  // OrbitalStage/OrbitalStageDial in ReactorHome, driven by the same
  // `open`/voiceOpen state) is the only visual feedback now.
  return null;
}

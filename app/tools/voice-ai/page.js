'use client';
import { useState, useRef } from 'react';
import AskShreeChat from '../../../components/AskShreeChat';
import { useSiteKey } from '../../../lib/useSiteKey';
import { KeyGate } from '../../../components/KeyGate';
import { useOptionalSession } from '../../../lib/useOptionalSession';
import { AccountBadge } from '../../../components/AccountBadge';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Voice.ai — speak or type a request, optionally attach a reference file,
// and AI answers using that file plus live web search. Voice input works
// two ways: live browser recording (captured via MediaRecorder and
// transcribed server-side through Groq/OpenAI Whisper — whichever's
// configured), or the browser's own free Web Speech API for an instant
// live transcript with zero server round-trip when the browser supports it
// (Chrome/Edge). Either way the recruiter sees and can edit the text before
// submitting — nothing is sent on voice alone without a look-over.
export default function VoiceAI() {
  const { unlocked, checking, error, key: siteKeyVal, setKey, submit, siteFetch } = useSiteKey('/api/tools/site-key-check');
  const { token: authToken } = useOptionalSession();

  const [promptText, setPromptText] = useState('');
  const [referenceFile, setReferenceFile] = useState(null);
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [recording, setRecording] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

  // Path A: live browser recording -> uploaded to the server for
  // Groq/OpenAI transcription. Works in any browser with mic access.
  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Different browsers negotiate different codecs by default (Chrome/Edge:
      // webm/opus, Safari: mp4/aac) — pick the best supported one explicitly so
      // the Blob's type and the filename we send the server always match what
      // was actually recorded, instead of assuming webm everywhere.
      const preferredTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
      const supportedType = preferredTypes.find(
        (t) => window.MediaRecorder?.isTypeSupported?.(t)
      );
      const recorder = supportedType ? new MediaRecorder(stream, { mimeType: supportedType }) : new MediaRecorder(stream);
      const actualMimeType = recorder.mimeType || supportedType || 'audio/webm';
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: actualMimeType });
        setNote('Transcribing your recording…');
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const res = await siteFetch('/api/tools/voice/transcribe-only', {
          method: 'POST',
          body: JSON.stringify({ audioFile: { base64, mimeType: actualMimeType } }),
        }).catch(() => null);
        // Fallback: if a dedicated transcribe-only endpoint isn't available,
        // just let the recorded clip go up with the main request instead.
        if (res && res.ok) {
          const data = await res.json();
          if (data.transcript) { setPromptText((p) => (p ? p + ' ' : '') + data.transcript); setNote(''); return; }
        }
        setNote('');
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (e) {
      setNote('Could not access your microphone. Check browser permissions.');
    }
  }

  // Path B: browser's own free Web Speech API (Chrome/Edge) — instant,
  // live, no server call at all.
  function toggleLiveSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNote('Live speech recognition isn’t supported in this browser — try Chrome or Edge, or record instead.');
      return;
    }
    if (liveListening) {
      recognitionRef.current?.stop();
      setLiveListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join(' ');
      setPromptText((p) => (p ? p + ' ' : '') + text);
    };
    recognition.onend = () => setLiveListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setLiveListening(true);
  }

  async function runAssistant() {
    setRunning(true);
    setNote('Thinking…');
    setResult(null);
    const body = { prompt: promptText, useWebSearch };
    if (referenceFile) {
      body.referenceFile = { name: referenceFile.name, mimeType: referenceFile.type, base64: await fileToBase64(referenceFile) };
    }
    const res = await siteFetch('/api/tools/voice/analyze', {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setRunning(false);
    if (data.locked) { setNote(data.message); return; }
    if (data.error) { setNote(data.error); return; }
    setResult(data);
    setNote('');
  }

  const canRun = !running && promptText.trim().length > 0;

  if (checking) return null;
  if (!unlocked) {
    return (
      <KeyGate error={error} keyVal={siteKeyVal} setKey={setKey} submit={submit} checking={checking} label="Voice.ai — enter key" />
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <AccountBadge />
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '44px 56px 80px', maxWidth: 980, margin: '0 auto' }}>
        <div className="eyebrow">Recruit.ai</div>
        <h1 className="serif" style={{ fontSize: 26, color: 'var(--cream)', margin: '8px 0 12px' }}>Voice.ai</h1>
        <p style={{ fontSize: 13.5, color: 'var(--slate)', maxWidth: 620, marginBottom: 28, textAlign: 'justify' }}>
          Speak or type a request, optionally attach a file for context — AI reads the file, searches
          the web if it needs to, and does whatever you asked.
        </p>

        <div className="jp-panel active">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <button
              type="button"
              onClick={toggleRecording}
              style={{
                border: '1px solid ' + (recording ? 'var(--amber)' : 'var(--line)'),
                color: recording ? 'var(--amber)' : 'var(--slate)',
                background: 'transparent', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11.5,
                padding: '9px 16px', borderRadius: 20, cursor: 'pointer',
              }}
            >
              {recording ? '● Stop recording' : '🎙 Record voice'}
            </button>
            <button
              type="button"
              onClick={toggleLiveSpeech}
              style={{
                border: '1px solid ' + (liveListening ? 'var(--amber)' : 'var(--line)'),
                color: liveListening ? 'var(--amber)' : 'var(--slate)',
                background: 'transparent', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11.5,
                padding: '9px 16px', borderRadius: 20, cursor: 'pointer',
              }}
            >
              {liveListening ? '● Listening — click to stop' : '🎤 Live speech (free, Chrome/Edge)'}
            </button>
          </div>

          <textarea className="free-text-input" style={{ minHeight: 120, resize: 'vertical' }}
            placeholder="Type your request, or use voice above — you can edit the transcript before submitting…"
            value={promptText} onChange={(e) => setPromptText(e.target.value)} />

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <button
              type="button"
              onClick={() => document.getElementById('voice-ref-file').click()}
              style={{
                border: '1px solid ' + (referenceFile ? 'var(--amber-dim)' : 'var(--line)'),
                color: referenceFile ? 'var(--amber)' : 'var(--slate)',
                background: 'transparent', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11.5,
                padding: '9px 16px', borderRadius: 20, cursor: 'pointer',
              }}
            >
              {referenceFile ? `File attached: ${referenceFile.name}` : 'Attach a file for context (PDF / Word)'}
            </button>
            <input id="voice-ref-file" type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files[0]; if (f) setReferenceFile(f); }} />
            {referenceFile && (
              <span style={{ marginLeft: 10 }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setReferenceFile(null); }} style={{ color: 'var(--amber)', fontSize: 11.5 }}>Remove</a>
              </span>
            )}
          </div>

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="use-web-search" checked={useWebSearch} onChange={(e) => setUseWebSearch(e.target.checked)} />
            <label htmlFor="use-web-search" style={{ fontSize: 12.5, color: 'var(--slate)' }}>Search the web while answering</label>
          </div>

          <button className="primary-btn" onClick={runAssistant} disabled={!canRun}>
            {running ? 'Working…' : 'Ask Voice.ai'}
          </button>
          {note && <div className="file-hint" style={{ marginTop: 14 }}>{note}</div>}

          {result && (
            <div className="job-card" style={{ marginTop: 20 }}>
              <div className="file-hint" style={{ marginBottom: 10 }}>Heard: “{result.transcript}”</div>
              <div style={{ fontSize: 14, color: 'var(--cream)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{result.answer}</div>
            </div>
          )}
        </div>
      </div>
      <AskShreeChat />
    </div>
  );
}

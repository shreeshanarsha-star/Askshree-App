'use client';
import { useState, useRef } from 'react';

// Farmer intake — the front door of the cattle-health module. No login:
// farmers never get an account. Describe the cow's issue by voice or text,
// optionally give a name/phone/cow details, submit, get a case link to
// check back on. AI drafts a triage note behind the scenes for a vet to
// review — the farmer never sees it until a vet has approved it.
export default function GauriFarmerIntake() {
  const [farmerName, setFarmerName] = useState('');
  const [farmerPhone, setFarmerPhone] = useState('');
  const [cowDetails, setCowDetails] = useState('');
  const [issueText, setIssueText] = useState('');
  const [recording, setRecording] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');
  const [caseId, setCaseId] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
      const supportedType = preferredTypes.find((t) => window.MediaRecorder?.isTypeSupported?.(t));
      const recorder = supportedType ? new MediaRecorder(stream, { mimeType: supportedType }) : new MediaRecorder(stream);
      const actualMimeType = recorder.mimeType || supportedType || 'audio/webm';
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: actualMimeType });
        setNote('Transcribing…');
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const res = await fetch('/api/gauri/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioFile: { base64, mimeType: actualMimeType } }),
        }).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data.transcript) { setIssueText((p) => (p ? p + ' ' : '') + data.transcript); setNote(''); return; }
        }
        setNote('');
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (e) {
      setNote('Could not access your microphone. Check permissions, or type instead.');
    }
  }

  function toggleLiveSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNote('Live speech isn’t supported in this browser — try Chrome, or type instead.');
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
      setIssueText((p) => (p ? p + ' ' : '') + text);
    };
    recognition.onend = () => setLiveListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setLiveListening(true);
  }

  async function submitCase() {
    if (!issueText.trim()) { setNote('Describe the issue first, by voice or text.'); return; }
    setSubmitting(true);
    setNote('Submitting…');
    const res = await fetch('/api/gauri/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerName, farmerPhone, cowDetails, issueText }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.ok) {
      setCaseId(data.caseId);
      setNote('');
    } else {
      setNote(data.error || 'Could not submit. Try again.');
    }
  }

  if (caseId) {
    return (
      <div style={{ padding: '60px 24px', maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <h1 className="serif" style={{ fontSize: 24, color: 'var(--cream)' }}>Submitted</h1>
        <p style={{ color: 'var(--slate)', fontSize: 14, lineHeight: 1.7, marginTop: 12 }}>
          A vet will review your case and you'll get a recommendation soon. Save this link to check back:
        </p>
        <div className="file-hint" style={{ marginTop: 16, wordBreak: 'break-all' }}>
          <a href={`/gauri/status/${caseId}`} style={{ color: 'var(--amber)' }}>askshree.com/gauri/status/{caseId}</a>
        </div>
        <button className="primary-btn" style={{ marginTop: 24 }} onClick={() => { setCaseId(null); setIssueText(''); setFarmerName(''); setFarmerPhone(''); setCowDetails(''); }}>
          Report another issue
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '44px 24px 80px', maxWidth: 640, margin: '0 auto' }}>
      <div className="eyebrow">Gauri.ai</div>
      <h1 className="serif" style={{ fontSize: 26, color: 'var(--cream)', margin: '8px 0 12px' }}>Tell us what's wrong with your cow</h1>
      <p style={{ fontSize: 13.5, color: 'var(--slate)', marginBottom: 28, lineHeight: 1.7 }}>
        Speak or type what's happening — a vet will review and get back to you with what to do next.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <button type="button" onClick={toggleRecording}
          style={{
            border: '1px solid ' + (recording ? 'var(--amber)' : 'var(--line)'), color: recording ? 'var(--amber)' : 'var(--slate)',
            background: 'transparent', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11.5, padding: '9px 16px', borderRadius: 20, cursor: 'pointer',
          }}>
          {recording ? '● Stop recording' : '🎙 Record voice'}
        </button>
        <button type="button" onClick={toggleLiveSpeech}
          style={{
            border: '1px solid ' + (liveListening ? 'var(--amber)' : 'var(--line)'), color: liveListening ? 'var(--amber)' : 'var(--slate)',
            background: 'transparent', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11.5, padding: '9px 16px', borderRadius: 20, cursor: 'pointer',
          }}>
          {liveListening ? '● Listening — tap to stop' : '🎤 Speak live'}
        </button>
      </div>

      <textarea className="free-text-input" style={{ minHeight: 120, resize: 'vertical' }}
        placeholder="What's going on with your cow? You can edit this before submitting…"
        value={issueText} onChange={(e) => setIssueText(e.target.value)} />

      <input className="free-text-input" style={{ marginTop: 10 }} type="text" placeholder="Cow details — breed, age, how long has this been going on"
        value={cowDetails} onChange={(e) => setCowDetails(e.target.value)} />
      <input className="free-text-input" style={{ marginTop: 10 }} type="text" placeholder="Your name"
        value={farmerName} onChange={(e) => setFarmerName(e.target.value)} />
      <input className="free-text-input" style={{ marginTop: 10 }} type="text" placeholder="Phone number"
        value={farmerPhone} onChange={(e) => setFarmerPhone(e.target.value)} />

      <button className="primary-btn" onClick={submitCase} disabled={submitting || !issueText.trim()}>
        {submitting ? 'Submitting…' : 'Submit to a vet'}
      </button>
      {note && <div className="file-hint" style={{ marginTop: 14 }}>{note}</div>}
    </div>
  );
}

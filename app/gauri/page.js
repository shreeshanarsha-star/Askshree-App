'use client';
import { useState, useRef, useEffect } from 'react';

// The Gauri.ai expressive avatar — farmer intake, reimagined as a
// conversation instead of a form. Greets the farmer, listens, asks
// clarifying questions until confident, then gives a plain-language
// surface-level read + a suggested product and asks permission to have a
// vet call. Only on explicit "yes" does a case actually get created — the
// conversation itself never claims to be a diagnosis, and the vet still
// reviews and can correct everything before any product ships.
const LANGUAGES = [
  { code: 'English', speechLang: 'en-IN', label: 'English' },
  { code: 'Hindi', speechLang: 'hi-IN', label: 'हिंदी' },
  { code: 'Kannada', speechLang: 'kn-IN', label: 'ಕನ್ನಡ' },
];
const GREETING = {
  English: "Namaste. I am Gauri. Please tell me what's happening with your cow — I'm listening.",
  Hindi: 'नमस्ते। मैं गौरी हूँ। कृपया बताइए आपकी गाय को क्या हुआ है — मैं सुन रही हूँ।',
  Kannada: 'ನಮಸ್ತೆ. ನಾನು ಗೌರಿ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹಸುವಿಗೆ ಏನಾಗಿದೆ ಎಂದು ಹೇಳಿ — ನಾನು ಕೇಳುತ್ತಿದ್ದೇನೆ.',
};

export default function GauriAvatarPage() {
  const [language, setLanguage] = useState('English');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState(''); // '', 'listening', 'speaking'
  const [busy, setBusy] = useState(false);
  const [confirmData, setConfirmData] = useState(null); // {surfaceDiagnosis, suggestedProductName, urgency}
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [farmerName, setFarmerName] = useState('');
  const [farmerPhone, setFarmerPhone] = useState('');
  const [farmerAddress, setFarmerAddress] = useState('');
  const [cowDetails, setCowDetails] = useState('');
  const [note, setNote] = useState('');
  const [caseCreated, setCaseCreated] = useState(null); // caseId
  const [started, setStarted] = useState(false);

  const blinkTimer = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    blinkTimer.current = setTimeout(function loop() {
      setMode((m) => m); // no-op state touch not needed; blink handled via class toggle below
      blinkNow();
      blinkTimer.current = setTimeout(loop, 2800 + Math.random() * 4500);
    }, 1800);
    return () => clearTimeout(blinkTimer.current);
  }, []);

  function blinkNow() {
    const stage = document.getElementById('gav-stage');
    if (!stage) return;
    stage.classList.add('gav-blink');
    setTimeout(() => stage.classList.remove('gav-blink'), 145);
  }

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const langInfo = LANGUAGES.find((l) => l.code === language);
    const vs = window.speechSynthesis.getVoices();
    const langPrefix = langInfo.speechLang.split('-')[0];
    u.voice = vs.find((v) => v.lang?.toLowerCase().startsWith(langPrefix)) || vs.find((v) => /female|samantha|zira/i.test(v.name)) || vs[0];
    u.lang = langInfo.speechLang;
    u.rate = 0.88; u.pitch = 0.98; u.volume = 1;
    u.onstart = () => setMode('speaking');
    u.onend = () => setMode('');
    window.speechSynthesis.speak(u);
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setNote('Voice isn’t supported in this browser — type instead.'); return; }
    const langInfo = LANGUAGES.find((l) => l.code === language);
    const r = new SR();
    r.lang = langInfo.speechLang;
    r.interimResults = true;
    r.onstart = () => setMode('listening');
    r.onresult = (e) => {
      let s = '';
      for (let i = e.resultIndex; i < e.results.length; i++) s += e.results[i][0].transcript;
      setInput(s);
    };
    r.onend = () => setMode('');
    r.start();
  }

  async function beginConversation() {
    setStarted(true);
    const greetMsg = { role: 'gauri', text: GREETING[language] };
    setMessages([greetMsg]);
    speak(greetMsg.text);
  }

  async function sendMessage(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text || busy) return;
    const newMessages = [...messages, { role: 'farmer', text }];
    setMessages(newMessages);
    setInput('');
    setBusy(true);
    setNote('');

    const res = await fetch('/api/gauri/converse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: newMessages, cowDetails, language }),
    }).catch(() => null);

    setBusy(false);
    if (!res || !res.ok) {
      setNote('Gauri couldn’t respond just now — please try again.');
      return;
    }
    const data = await res.json();
    const gauriMsg = { role: 'gauri', text: data.reply };
    setMessages((m) => [...m, gauriMsg]);
    speak(data.reply);

    if (data.ready) {
      setConfirmData({
        surfaceDiagnosis: data.surfaceDiagnosis,
        suggestedProductName: data.suggestedProductName,
        suggestedProductId: data.suggestedProductId,
        urgency: data.urgency,
      });
      setShowConfirmForm(true);
    }
  }

  async function confirmYes() {
    if (!farmerPhone.trim()) { setNote('A phone number is needed so the vet can call you.'); return; }
    setBusy(true);
    setNote('');
    const res = await fetch('/api/gauri/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationTranscript: messages,
        farmerName, farmerPhone, farmerAddress, cowDetails,
        surfaceDiagnosis: confirmData?.surfaceDiagnosis,
        suggestedProductId: confirmData?.suggestedProductId,
        urgency: confirmData?.urgency,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setCaseCreated(data.caseId);
      const bye = `Thank you. A vet will call you at ${farmerPhone} shortly. You can also check this link anytime for updates.`;
      setMessages((m) => [...m, { role: 'gauri', text: bye }]);
      speak(bye);
    } else {
      setNote(data.error || 'Could not submit that. Try again.');
    }
  }

  function confirmNo() {
    setShowConfirmForm(false);
    setConfirmData(null);
    const bye = 'No problem. Feel free to tell me more, or come back anytime.';
    setMessages((m) => [...m, { role: 'gauri', text: bye }]);
    speak(bye);
  }

  if (caseCreated) {
    return (
      <div style={{ padding: '44px 24px 80px', maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <div className="eyebrow">Gauri.ai</div>
        <h1 className="serif" style={{ fontSize: 24, color: 'var(--cream)', margin: '8px 0 12px' }}>A vet will call you shortly</h1>
        <p style={{ color: 'var(--slate)', fontSize: 14, lineHeight: 1.7, marginTop: 12 }}>
          Save this link to check status and see what's happening with your delivery:
        </p>
        <div className="file-hint" style={{ marginTop: 16, wordBreak: 'break-all' }}>
          <a href={`/gauri/status/${caseCreated}`} style={{ color: 'var(--amber)' }}>askshree.com/gauri/status/{caseCreated}</a>
        </div>
        <button className="primary-btn" style={{ marginTop: 24 }} onClick={() => window.location.reload()}>
          Report another issue
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '36px 24px 80px', maxWidth: 640, margin: '0 auto' }}>
      <div className="eyebrow" style={{ textAlign: 'center' }}>Gauri.ai</div>
      <h1 className="serif" style={{ fontSize: 24, color: 'var(--cream)', margin: '8px 0 6px', textAlign: 'center' }}>Talk to Gauri about your cow</h1>

      {!started && (
        <div className="gav-lang-row">
          {LANGUAGES.map((l) => (
            <button key={l.code} className={`gav-lang-btn ${language === l.code ? 'active' : ''}`} onClick={() => setLanguage(l.code)}>{l.label}</button>
          ))}
        </div>
      )}

      <div id="gav-stage" className={`gav-stage ${mode === 'speaking' ? 'gav-speaking' : ''} ${mode === 'listening' ? 'gav-listening' : ''}`}>
        <img className="gav-face" src="/gauri/avatar-face.jpg" alt="Gauri" />
        <div className="gav-fx">
          <div className="gav-eyeL"></div><div className="gav-eyeR"></div>
          <div className="gav-eyeGlowL"></div><div className="gav-eyeGlowR"></div>
          <div className="gav-mouth"></div><div className="gav-smile"></div>
        </div>
        <div className="gav-status">{mode === 'speaking' ? 'Gauri is speaking…' : mode === 'listening' ? 'Listening…' : 'Ready'}</div>
      </div>

      {!started ? (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="primary-btn" onClick={beginConversation}>Start talking to Gauri</button>
        </div>
      ) : (
        <>
          <div className="gav-chat" ref={chatRef}>
            {messages.map((m, i) => (
              <div key={i} className={`gav-bubble ${m.role}`}>{m.text}</div>
            ))}
            {busy && <div className="gav-bubble gauri" style={{ opacity: 0.6 }}>…</div>}
          </div>

          {!showConfirmForm && (
            <div className="gav-controls">
              <input className="free-text-input" placeholder="Type or speak your answer…" value={input}
                onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} />
              <button className="primary-btn" style={{ marginTop: 0 }} onClick={() => sendMessage()} disabled={busy}>Send</button>
              <button className="primary-btn" style={{ marginTop: 0, background: 'transparent', color: 'var(--amber)' }} onClick={startListening} disabled={busy}>🎙</button>
            </div>
          )}

          {showConfirmForm && confirmData && (
            <div className="gav-confirm">
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--amber)', textTransform: 'uppercase', marginBottom: 8 }}>
                Confirm to get a vet callback
              </div>
              <div style={{ fontSize: 13, color: 'var(--cream)', marginBottom: 4 }}><b>At a surface level:</b> {confirmData.surfaceDiagnosis}</div>
              {confirmData.suggestedProductName && (
                <div style={{ fontSize: 13, color: 'var(--cream)' }}><b>May help:</b> {confirmData.suggestedProductName}</div>
              )}
              <div className="row">
                <input className="free-text-input" placeholder="Your name" value={farmerName} onChange={(e) => setFarmerName(e.target.value)} />
                <input className="free-text-input" placeholder="Phone number (required)" value={farmerPhone} onChange={(e) => setFarmerPhone(e.target.value)} />
              </div>
              <div className="row">
                <input className="free-text-input" placeholder="Village / address (for delivery)" value={farmerAddress} onChange={(e) => setFarmerAddress(e.target.value)} />
                <input className="free-text-input" placeholder="Cow details — breed, age" value={cowDetails} onChange={(e) => setCowDetails(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button className="primary-btn" style={{ marginTop: 0 }} onClick={confirmYes} disabled={busy}>Yes, have a vet call me</button>
                <button className="primary-btn" style={{ marginTop: 0, background: 'transparent', color: 'var(--slate)', borderColor: 'var(--line)' }} onClick={confirmNo} disabled={busy}>Not now</button>
              </div>
            </div>
          )}
        </>
      )}

      {note && <div className="file-hint" style={{ textAlign: 'center', marginTop: 14 }}>{note}</div>}
    </div>
  );
}

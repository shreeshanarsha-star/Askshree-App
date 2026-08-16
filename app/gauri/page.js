'use client';
import { useState, useRef, useEffect } from 'react';
import GauriFace3D from '../../components/GauriFace3D';

// The Gauri.ai expressive avatar — farmer intake, reimagined as a hands-free
// conversation. Greets automatically, guesses the farmer's language from
// their location, listens without needing a tap, and adapts language turn
// by turn based on what the farmer actually says. Only on explicit "yes"
// does a case get created — the conversation itself never claims to be a
// diagnosis, and the vet still reviews and can correct everything before
// any product ships.
const LANGUAGES = [
  { code: 'English', speechLang: 'en-IN', label: 'English' },
  { code: 'Hindi', speechLang: 'hi-IN', label: 'हिंदी' },
  { code: 'Kannada', speechLang: 'kn-IN', label: 'ಕನ್ನಡ' },
  { code: 'Tamil', speechLang: 'ta-IN', label: 'தமிழ்' },
  { code: 'Telugu', speechLang: 'te-IN', label: 'తెలుగు' },
  { code: 'Marathi', speechLang: 'mr-IN', label: 'मराठी' },
  { code: 'Bengali', speechLang: 'bn-IN', label: 'বাংলা' },
  { code: 'Gujarati', speechLang: 'gu-IN', label: 'ગુજરાતી' },
  { code: 'Punjabi', speechLang: 'pa-IN', label: 'ਪੰਜਾਬੀ' },
  { code: 'Malayalam', speechLang: 'ml-IN', label: 'മലയാളം' },
];
const GREETING = {
  English: "Namaste. I am Gauri. Please tell me what's happening with your cow — I'm listening.",
  Hindi: 'नमस्ते। मैं गौरी हूँ। कृपया बताइए आपकी गाय को क्या हुआ है — मैं सुन रही हूँ।',
  Kannada: 'ನಮಸ್ತೆ. ನಾನು ಗೌರಿ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹಸುವಿಗೆ ಏನಾಗಿದೆ ಎಂದು ಹೇಳಿ — ನಾನು ಕೇಳುತ್ತಿದ್ದೇನೆ.',
  Tamil: 'வணக்கம். நான் கௌரி. உங்கள் பசுவுக்கு என்ன ஆனது என்று சொல்லுங்கள் — நான் கேட்டுக்கொண்டிருக்கிறேன்.',
  Telugu: 'నమస్తే. నేను గౌరి. మీ ఆవుకు ఏమైందో దయచేసి చెప్పండి — నేను వింటున్నాను.',
  Marathi: 'नमस्कार. मी गौरी आहे. कृपया सांगा तुमच्या गायीला काय झाले आहे — मी ऐकत आहे.',
  Bengali: 'নমস্কার। আমি গৌরী। দয়া করে বলুন আপনার গরুর কী হয়েছে — আমি শুনছি।',
  Gujarati: 'નમસ્તે. હું ગૌરી છું. કૃપા કરી કહો તમારી ગાયને શું થયું છે — હું સાંભળી રહી છું.',
  Punjabi: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ। ਮੈਂ ਗੌਰੀ ਹਾਂ। ਕਿਰਪਾ ਕਰਕੇ ਦੱਸੋ ਤੁਹਾਡੀ ਗਾਂ ਨੂੰ ਕੀ ਹੋਇਆ ਹੈ — ਮੈਂ ਸੁਣ ਰਹੀ ਹਾਂ।',
  Malayalam: 'നമസ്തേ. ഞാൻ ഗൗരി. നിങ്ങളുടെ പശുവിന് എന്ത് സംഭവിച്ചു എന്ന് ദയവായി പറയൂ — ഞാൻ കേൾക്കുന്നു.',
};
// Best-effort Indian state -> local language mapping for the geolocation
// guess. Anything Indian but unmapped falls back to Hindi; anything outside
// India (or if geolocation fails/denied) falls back to English.
const STATE_LANGUAGE = {
  'Karnataka': 'Kannada',
  'Tamil Nadu': 'Tamil',
  'Andhra Pradesh': 'Telugu',
  'Telangana': 'Telugu',
  'Maharashtra': 'Marathi',
  'West Bengal': 'Bengali',
  'Gujarat': 'Gujarati',
  'Punjab': 'Punjabi',
  'Kerala': 'Malayalam',
};

export default function GauriAvatarPage() {
  const [language, setLanguage] = useState('Hindi');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState(''); // '', 'listening', 'speaking'
  const [busy, setBusy] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [farmerName, setFarmerName] = useState('');
  const [farmerPhone, setFarmerPhone] = useState('');
  const [farmerAddress, setFarmerAddress] = useState('');
  const [cowDetails, setCowDetails] = useState('');
  const [note, setNote] = useState('');
  const [caseCreated, setCaseCreated] = useState(null);
  const [started, setStarted] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);
  const [viseme, setViseme] = useState('closed');

  const visemeTimer = useRef(null);
  const boundaryFired = useRef(false);
  const wordIndex = useRef(0);
  const chatRef = useRef(null);
  const languageRef = useRef(language);
  const showConfirmFormRef = useRef(false);
  const caseCreatedRef = useRef(null);
  const micBlockedRef = useRef(false);
  const startedOnceRef = useRef(false);

  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { showConfirmFormRef.current = showConfirmForm; }, [showConfirmForm]);
  useEffect(() => { caseCreatedRef.current = caseCreated; }, [caseCreated]);
  useEffect(() => { micBlockedRef.current = micBlocked; }, [micBlocked]);

  // Blink is now handled inside GauriFace3D's own animation loop (real 3D
  // eye geometry scaled through an eased curve), so the page no longer
  // needs to drive a separate 2D blink class. Just make sure the viseme
  // fallback interval doesn't leak across unmounts.
  useEffect(() => () => stopVisemeFallback(), []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // Guess the farmer's language from their location, then auto-greet —
  // no button required. Falls back to Hindi quickly if geolocation is
  // denied, unsupported, or slow, so the greeting never waits too long.
  useEffect(() => {
    if (startedOnceRef.current) return;
    startedOnceRef.current = true;
    let settled = false;
    const fallback = setTimeout(() => { if (!settled) { settled = true; beginConversation('Hindi'); } }, 3500);

    if (!navigator.geolocation) { return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (settled) return;
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          const geo = await res.json();
          let guess = 'English';
          if ((geo.countryCode || '').toUpperCase() === 'IN') {
            guess = STATE_LANGUAGE[geo.principalSubdivision] || 'Hindi';
          }
          if (!settled) { settled = true; clearTimeout(fallback); beginConversation(guess); }
        } catch {
          if (!settled) { settled = true; clearTimeout(fallback); beginConversation('Hindi'); }
        }
      },
      () => { if (!settled) { settled = true; clearTimeout(fallback); beginConversation('Hindi'); } },
      { timeout: 3000, maximumAge: 600000 }
    );
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Picks which mouth shape Gauri's face should move toward for a given
  // spoken word. Uses a light vowel heuristic for Latin script (English
  // voice fallback, romanized fragments); for non-Latin scripts (Hindi,
  // Kannada, etc. -- the actual common case here) there's no "vowel" regex
  // that applies, so it cycles through shapes deterministically by word
  // position/length instead of freezing on one static mouth shape for the
  // entire sentence.
  function pickViseme(word, index) {
    const w = (word || '').toLowerCase();
    if (/[oôöòóõu]/.test(w)) return 'round';
    if (/[aáàâäeéèêë]/.test(w)) return 'wide';
    if (/[a-z]/.test(w)) return 'narrow';
    const cycle = ['narrow', 'wide', 'round', 'wide'];
    return cycle[(index + w.length) % cycle.length];
  }

  function stopVisemeFallback() {
    if (visemeTimer.current) { clearInterval(visemeTimer.current); visemeTimer.current = null; }
  }

  function speak(text, onDone) {
    stopVisemeFallback();
    if (!window.speechSynthesis) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const langInfo = LANGUAGES.find((l) => l.code === languageRef.current) || LANGUAGES[0];
    const vs = window.speechSynthesis.getVoices();
    const langPrefix = langInfo.speechLang.split('-')[0];
    u.voice = vs.find((v) => v.lang?.toLowerCase().startsWith(langPrefix)) || vs.find((v) => /female|samantha|zira/i.test(v.name)) || vs[0];
    u.lang = langInfo.speechLang;
    u.rate = 0.88; u.pitch = 0.98; u.volume = 1;
    let started = false;
    boundaryFired.current = false;
    wordIndex.current = 0;
    // Real lip-sync timing: each word-boundary event from the speech engine
    // reshapes the mouth toward a viseme for that word. Chrome fires this
    // reliably; some browsers/voices never do, so a fallback cycle (below)
    // covers those cases instead of leaving the mouth frozen shut.
    u.onboundary = (e) => {
      boundaryFired.current = true;
      const word = text.substr(e.charIndex, e.charLength || 6);
      setViseme(pickViseme(word, wordIndex.current++));
    };
    u.onstart = () => {
      started = true; setNeedsTap(false); setMode('speaking');
      setTimeout(() => {
        if (!boundaryFired.current && window.speechSynthesis.speaking) {
          const cycle = ['narrow', 'wide', 'round', 'wide', 'narrow'];
          let i = 0;
          visemeTimer.current = setInterval(() => { setViseme(cycle[i++ % cycle.length]); }, 200);
        }
      }, 450);
    };
    u.onend = () => { stopVisemeFallback(); setViseme('closed'); setMode(''); onDone?.(); };
    u.onerror = () => { stopVisemeFallback(); setViseme('closed'); setMode(''); onDone?.(); };
    window.speechSynthesis.speak(u);
    // Some mobile browsers silently block speechSynthesis without a prior
    // user gesture. If it hasn't actually started shortly after we asked
    // it to, surface a one-tap "start" overlay instead of staying silent.
    setTimeout(() => { if (!started) setNeedsTap(true); }, 1200);
  }

  function tapToBegin() {
    setNeedsTap(false);
    const last = messages[messages.length - 1];
    if (last && last.role === 'gauri') {
      speak(last.text, autoListenAfterSpeak);
    } else {
      beginConversation(languageRef.current);
    }
  }

  // After Gauri finishes talking, automatically listen for the farmer's
  // reply — no mic tap needed, unless the mic has already been denied or
  // we're in the confirm-details step (a form, not a spoken turn).
  function autoListenAfterSpeak() {
    if (showConfirmFormRef.current || caseCreatedRef.current || micBlockedRef.current) return;
    startListening();
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setNote('Voice isn’t supported in this browser — please type instead.'); return; }
    const langInfo = LANGUAGES.find((l) => l.code === languageRef.current) || LANGUAGES[0];
    const r = new SR();
    r.lang = langInfo.speechLang;
    r.interimResults = true;
    r.continuous = false;
    let finalText = '';
    r.onstart = () => setMode('listening');
    r.onresult = (e) => {
      let s = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        s += e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText = s;
      }
      setInput(s);
    };
    r.onerror = (e) => {
      setMode('');
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setMicBlocked(true);
        setNote('Microphone access is blocked — please type your answer instead.');
      }
    };
    r.onend = () => {
      setMode('');
      const text = (finalText || '').trim();
      if (text) sendMessage(text);
    };
    try { r.start(); } catch { /* already running */ }
  }

  async function beginConversation(lang) {
    if (lang) setLanguage(lang);
    setStarted(true);
    const greetText = GREETING[lang] || GREETING.Hindi;
    const greetMsg = { role: 'gauri', text: greetText };
    setMessages([greetMsg]);
    speak(greetText, autoListenAfterSpeak);
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
      body: JSON.stringify({ transcript: newMessages, cowDetails, language: languageRef.current }),
    }).catch(() => null);

    setBusy(false);
    if (!res || !res.ok) {
      setNote('Gauri couldn’t respond just now — please try again.');
      return;
    }
    const data = await res.json();

    // Adapt to whatever language the farmer actually just used, so the
    // next listen + speak cycle matches them instead of the original guess.
    if (data.detectedLanguage && LANGUAGES.some((l) => l.code === data.detectedLanguage)) {
      setLanguage(data.detectedLanguage);
      languageRef.current = data.detectedLanguage;
    }

    const gauriMsg = { role: 'gauri', text: data.reply };
    setMessages((m) => [...m, gauriMsg]);

    if (data.ready) {
      setConfirmData({
        surfaceDiagnosis: data.surfaceDiagnosis,
        suggestedProductName: data.suggestedProductName,
        suggestedProductId: data.suggestedProductId,
        urgency: data.urgency,
      });
      setShowConfirmForm(true);
      speak(data.reply); // don't auto-listen — the confirm form is next
    } else {
      speak(data.reply, autoListenAfterSpeak);
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
      caseCreatedRef.current = data.caseId;
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
    speak(bye, autoListenAfterSpeak);
  }

  function changeLanguage(code) {
    setLanguage(code);
    languageRef.current = code;
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

      <div className="gav-lang-row">
        {LANGUAGES.map((l) => (
          <button key={l.code} className={`gav-lang-btn ${language === l.code ? 'active' : ''}`} onClick={() => changeLanguage(l.code)}>{l.label}</button>
        ))}
      </div>

      <div id="gav-stage" className={`gav-stage ${mode === 'speaking' ? 'gav-speaking' : ''} ${mode === 'listening' ? 'gav-listening' : ''}`}>
        <GauriFace3D mode={mode} viseme={viseme} />
        <div className="gav-status">{mode === 'speaking' ? 'Gauri is speaking…' : mode === 'listening' ? 'Listening…' : started ? 'Ready' : 'Getting ready…'}</div>
        {needsTap && (
          <div className="gav-tap-overlay" onClick={tapToBegin}>
            <div className="gav-tap-card">Tap to start</div>
          </div>
        )}
      </div>

      {started && (
        <>
          <div className="gav-chat" ref={chatRef}>
            {messages.map((m, i) => (
              <div key={i} className={`gav-bubble ${m.role}`}>{m.text}</div>
            ))}
            {busy && <div className="gav-bubble gauri" style={{ opacity: 0.6 }}>…</div>}
          </div>

          {!showConfirmForm && (
            <div className="gav-controls">
              <input className="free-text-input" placeholder="Just speak — or type here…" value={input}
                onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} />
              <button className="primary-btn" style={{ marginTop: 0 }} onClick={() => sendMessage()} disabled={busy}>Send</button>
              <button className="primary-btn" style={{ marginTop: 0, background: 'transparent', color: 'var(--amber)' }} onClick={startListening} disabled={busy || micBlocked}>🎙</button>
            </div>
          )}

          {showConfirmForm && confirmData && (
            <div className="gav-confirm">
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, fontSize: 11, color: 'var(--amber)', textTransform: 'uppercase', marginBottom: 8 }}>
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

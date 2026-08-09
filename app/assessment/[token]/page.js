'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Candidate registration screen. Details are pre-filled from the CV the
// recruiter uploaded but stay editable — the candidate is the authority on
// their own contact details. Consent is required and unchecked by default.
export default function AssessmentRegister() {
  const { token } = useParams();
  const router = useRouter();

  const [info, setInfo] = useState(null);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/tools/assessment/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setErr(d.error); return; }
        setInfo(d);
        setName(d.prefill.name || '');
        setEmail(d.prefill.email || '');
        setContact(d.prefill.contact || '');
      })
      .catch(() => setErr('Could not load this assessment.'));
  }, [token]);

  async function start() {
    setBusy(true);
    setErr('');
    const res = await fetch(`/api/tools/assessment/${token}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, contact, consent }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.error) { setErr(data.error); return; }
    // Hand the (already randomized, stably seeded) question set to the take
    // screen rather than refetching it there.
    sessionStorage.setItem(`assessment:${token}`, JSON.stringify({ assessment: data.assessment, questions: data.questions }));
    router.push(`/assessment/${token}/take`);
  }

  const canStart = name.trim() && email.includes('@') && consent && !busy;

  return (
    <div style={{ position: 'relative' }}>
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '44px 32px 80px', maxWidth: 640, margin: '0 auto' }}>
        <div className="eyebrow">Assessment.ai</div>

        {err && !info && <p style={{ color: 'var(--slate)', fontSize: 13.5, marginTop: 20 }}>{err}</p>}
        {!err && !info && <p style={{ color: 'var(--slate)', fontSize: 13.5, marginTop: 20 }}>Loading…</p>}

        {info && (
          <>
            <h1 className="serif" style={{ fontSize: 25, color: 'var(--cream)', margin: '8px 0 12px' }}>
              {info.assessment.fullName}
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--slate)', marginBottom: 24, lineHeight: 1.7, textAlign: 'justify' }}>
              {info.assessment.questionCount} questions, on a five-point scale. It's untimed and self-paced —
              there's no countdown and nothing submits on its own, so take as long as you like. {info.assessment.stem}
            </p>

            <div className="as-field">
              <div className="as-field-head"><label>Full name</label></div>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="as-field">
              <div className="as-field-head"><label>Email</label></div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="as-field">
              <div className="as-field-head"><label>Phone</label></div>
              <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11.5, color: 'var(--slate)', marginTop: 16, cursor: 'pointer', lineHeight: 1.7 }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
              <span>
                I consent to Ask Shree storing my CV and the details above, and to my assessment responses being
                processed and shared with the recruiter who invited me. I can ask for my data to be deleted at any
                time by emailing shreesha.narsha@gmail.com. See the <a href="/terms" target="_blank" style={{ color: 'var(--amber-dim)' }}>Terms &amp; Conditions</a>.
              </span>
            </label>

            {err && <div className="file-hint" style={{ marginTop: 12 }}>{err}</div>}

            <button className="primary-btn" onClick={start} disabled={!canStart}>
              {busy ? 'Starting…' : 'Register & start assessment'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

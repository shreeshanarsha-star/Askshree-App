'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

// The assessment itself. One question at a time, prev/next, progress dots,
// untimed — nothing auto-submits. Answers are kept in sessionStorage as they go,
// so a refresh or a closed tab doesn't cost the candidate their progress.
// Question order was randomized server-side per assignment (seeded), so it's the
// same order every time they come back.
export default function TakeAssessment() {
  const { token } = useParams();
  const router = useRouter();

  const [spec, setSpec] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!token) return;
    const raw = sessionStorage.getItem(`assessment:${token}`);
    if (!raw) { router.replace(`/assessment/${token}`); return; }
    try {
      const parsed = JSON.parse(raw);
      setSpec(parsed.assessment);
      setQuestions(parsed.questions || []);
    } catch (e) {
      router.replace(`/assessment/${token}`);
      return;
    }
    const saved = sessionStorage.getItem(`assessment:${token}:answers`);
    if (saved) { try { setAnswers(JSON.parse(saved)); } catch (e) { /* ignore */ } }
  }, [token, router]);

  function answer(qid, value) {
    const next = { ...answers, [qid]: value };
    setAnswers(next);
    sessionStorage.setItem(`assessment:${token}:answers`, JSON.stringify(next));
    if (idx < questions.length - 1) setTimeout(() => setIdx((i) => Math.min(i + 1, questions.length - 1)), 140);
  }

  async function submit() {
    setBusy(true);
    setErr('');
    const res = await fetch(`/api/tools/assessment/${token}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses: answers }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.error) { setErr(data.error); return; }
    sessionStorage.removeItem(`assessment:${token}:answers`);
    sessionStorage.removeItem(`assessment:${token}`);
    setSummary(data);
  }

  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const q = questions[idx];

  return (
    <div style={{ position: 'relative' }}>
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '40px 32px 80px', maxWidth: 640, margin: '0 auto' }}>
        <div className="eyebrow">Assessment.ai{spec ? ` · ${spec.name}` : ''}</div>

        {summary ? (
          <>
            <h1 className="serif" style={{ fontSize: 25, color: 'var(--cream)', margin: '8px 0 14px' }}>Submitted — thank you.</h1>
            {summary.evaluative ? (
              <div className="overall-card">
                <div className="eyebrow" style={{ marginBottom: 10 }}>Your overall score</div>
                <div className="overall-score">{summary.overallScore}<span style={{ fontSize: 18, color: 'var(--slate)' }}>/100</span></div>
                <div className="overall-band">{summary.bandLabel}</div>
              </div>
            ) : (
              <div className="overall-card" style={{ borderColor: 'var(--line)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Your profile</div>
                <div className="overall-band" style={{ marginTop: 0 }}>
                  The Big Five is a trait profile, not a test — there's no overall score and nothing to pass or fail.
                  Your full profile has gone to the recruiter who invited you.
                </div>
              </div>
            )}
            <p style={{ fontSize: 12.5, color: 'var(--slate)', lineHeight: 1.75 }}>
              Your detailed breakdown goes to the recruiter who invited you — they'll be in touch. This link is now
              closed and can't be used again.
            </p>
          </>
        ) : !spec ? (
          <p style={{ color: 'var(--slate)', fontSize: 13.5, marginTop: 20 }}>Loading…</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 }}>
              <span className="progress-meter">{answeredCount} of {questions.length} answered</span>
              <span className="progress-meter">Untimed · answer at your own pace</span>
            </div>

            {q && (
              <div className="q-card">
                <div className="q-num">Question {idx + 1} of {questions.length}</div>
                <div className="q-text">{q.text}</div>
                <div className="likert">
                  {(spec.scale || []).map((s) => (
                    <button key={s.value} type="button"
                      className={`likert-opt ${answers[q.id] === s.value ? 'selected' : ''}`}
                      onClick={() => answer(q.id, s.value)}>
                      <span className="n">{s.value}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
                <div className="q-nav">
                  <button className="q-nav-btn" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>← Previous</button>
                  <button className="q-nav-btn" onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))} disabled={idx >= questions.length - 1}>Next →</button>
                </div>
              </div>
            )}

            <div className="progress-dots">
              {questions.map((qq, i) => (
                <button key={qq.id} type="button" aria-label={`Question ${i + 1}`}
                  className={`progress-dot ${i === idx ? 'current' : answers[qq.id] ? 'answered' : ''}`}
                  onClick={() => setIdx(i)} />
              ))}
            </div>

            {err && <div className="file-hint" style={{ marginTop: 16 }}>{err}</div>}

            <button className="primary-btn" onClick={submit} disabled={!allAnswered || busy}>
              {busy ? 'Submitting…' : allAnswered ? 'Submit assessment' : `${questions.length - answeredCount} question(s) left`}
            </button>
            <div className="file-hint" style={{ marginTop: 10 }}>
              Nothing submits automatically — you decide when you're done. You can only submit once.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

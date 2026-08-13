'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

// Candidate-facing questionnaire — reached via a link emailed after their CV
// clears the initial AI screen. Answers here get verified against the JD
// (see the submit route); only a pass reaches the job poster. No site-key
// gate: this is an external, token-secured link, same as the assessment
// take-link and offer approval link.
export default function ApplyQuestionnaire() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null); // null | { passed }
  const [busy, setBusy] = useState(false);

  const [techAnswers, setTechAnswers] = useState({});
  const [goodAnswers, setGoodAnswers] = useState({});
  const [location, setLocation] = useState('');
  const [ctc, setCtc] = useState('');
  const [totalExperience, setTotalExperience] = useState('');
  const [qualification, setQualification] = useState('');
  const [currentIndustry, setCurrentIndustry] = useState('');
  const [openToRelocation, setOpenToRelocation] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/apply-questionnaire/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setErr(d.error); if (d.completed) setDone({ passed: null }); return; }
        setInfo(d);
        setLocation(d.job.location || '');
        setQualification(d.job.qualification || '');
      })
      .catch(() => setErr('Could not load this questionnaire.'));
  }, [token]);

  async function submit() {
    setBusy(true);
    setErr('');
    const res = await fetch(`/api/apply-questionnaire/${token}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        technicalSkillAnswers: (info.job.mustHaveSkills || []).map((skill) => ({ skill, has_it: !!techAnswers[skill] })),
        goodToHaveAnswers: (info.job.goodToHaveSkills || []).map((skill) => ({ skill, has_it: !!goodAnswers[skill] })),
        location, ctc, totalExperience, qualification, currentIndustry, openToRelocation,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.error) { setErr(data.error); return; }
    setDone({ passed: data.passed });
  }

  const canSubmit = info
    && (info.job.mustHaveSkills || []).every((s) => techAnswers[s] !== undefined)
    && location.trim() && totalExperience !== '' && qualification.trim() && currentIndustry.trim()
    && !busy;

  return (
    <div style={{ position: 'relative' }}>
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '44px 32px 80px', maxWidth: 640, margin: '0 auto' }}>
        <div className="eyebrow">Apply.ai</div>

        {err && !info && <p style={{ color: 'var(--slate)', fontSize: 13.5, marginTop: 20 }}>{err}</p>}
        {!err && !info && !done && <p style={{ color: 'var(--slate)', fontSize: 13.5, marginTop: 20 }}>Loading…</p>}

        {done && (
          <div className="coming-soon-card">
            <h2>{done.passed === null ? 'Already submitted' : done.passed ? "You're through" : 'Thanks for your time'}</h2>
            <p>
              {done.passed === null
                ? 'This questionnaire was already completed.'
                : done.passed
                  ? "Your answers confirm you meet the role's requirements — your profile has been shared with the employer."
                  : "Based on your answers, this particular role isn't a match right now. Your CV stays in our passive pool for future roles."}
            </p>
          </div>
        )}

        {info && !done && (
          <>
            <h1 className="serif" style={{ fontSize: 25, color: 'var(--cream)', margin: '8px 0 6px' }}>
              {info.job.title} — {info.job.company}
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--slate)', marginBottom: 26, lineHeight: 1.7, textAlign: 'justify' }}>
              Your CV looks like a strong fit. These few questions confirm you meet the role's actual
              requirements — answer honestly; it's what gets your profile in front of the employer,
              not filtered out.
            </p>

            <div className="field-label" style={{ margin: '0 0 8px' }}>Mandatory technical skills</div>
            {(info.job.mustHaveSkills || []).map((skill) => (
              <div className="as-field" key={skill}>
                <div className="as-field-head"><label>Do you have: {skill}?</label></div>
                <div className="as-toggle">
                  <button type="button" className={techAnswers[skill] === true ? 'active' : ''} onClick={() => setTechAnswers((s) => ({ ...s, [skill]: true }))}>Yes</button>
                  <button type="button" className={techAnswers[skill] === false ? 'active' : ''} onClick={() => setTechAnswers((s) => ({ ...s, [skill]: false }))}>No</button>
                </div>
              </div>
            ))}

            <div className="field-label" style={{ margin: '20px 0 8px' }}>Good-to-have skills</div>
            {(info.job.goodToHaveSkills || []).map((skill) => (
              <div className="as-field" key={skill}>
                <div className="as-field-head"><label>Do you have: {skill}?</label></div>
                <div className="as-toggle">
                  <button type="button" className={goodAnswers[skill] === true ? 'active' : ''} onClick={() => setGoodAnswers((s) => ({ ...s, [skill]: true }))}>Yes</button>
                  <button type="button" className={goodAnswers[skill] === false ? 'active' : ''} onClick={() => setGoodAnswers((s) => ({ ...s, [skill]: false }))}>No</button>
                </div>
              </div>
            ))}

            <div className="as-field">
              <div className="as-field-head"><label>Your current location</label></div>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
              <div className="as-note">Role is based in: {info.job.location || 'not specified'}.</div>
            </div>

            <div className="as-field">
              <div className="as-field-head"><label>Open to relocating for this role?</label></div>
              <div className="as-toggle">
                <button type="button" className={openToRelocation ? 'active' : ''} onClick={() => setOpenToRelocation(true)}>Yes</button>
                <button type="button" className={!openToRelocation ? 'active' : ''} onClick={() => setOpenToRelocation(false)}>No</button>
              </div>
            </div>

            <div className="as-field">
              <div className="as-field-head"><label>Current / expected CTC</label></div>
              <input type="text" placeholder="e.g. 18 LPA" value={ctc} onChange={(e) => setCtc(e.target.value)} />
            </div>

            <div className="as-field">
              <div className="as-field-head"><label>Total years of experience</label></div>
              <input type="number" min="0" step="0.5" value={totalExperience} onChange={(e) => setTotalExperience(e.target.value)} />
            </div>

            <div className="as-field">
              <div className="as-field-head"><label>Highest qualification</label></div>
              <input type="text" value={qualification} onChange={(e) => setQualification(e.target.value)} />
              <div className="as-note">Role requires: {info.job.qualification || 'not specified'}.</div>
            </div>

            <div className="as-field">
              <div className="as-field-head"><label>Current industry</label></div>
              <input type="text" value={currentIndustry} onChange={(e) => setCurrentIndustry(e.target.value)} />
            </div>

            {err && <div className="file-hint" style={{ marginTop: 12 }}>{err}</div>}

            <button className="primary-btn" onClick={submit} disabled={!canSubmit}>
              {busy ? 'Submitting…' : 'Submit'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

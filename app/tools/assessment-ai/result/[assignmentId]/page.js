'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AskShreeChat from '../../../../../components/AskShreeChat';
import { useSiteKey } from '../../../../../lib/useSiteKey';
import { KeyGate } from '../../../../../components/KeyGate';

function DimensionBar({ dim, evaluative }) {
  return (
    <div className="dim-row">
      <div className="dim-row-head">
        <div>
          <span className="dim-name">{dim.label}</span>
          {evaluative && dim.weight != null && <span className="dim-weight">{Math.round(dim.weight * 100)}% weight</span>}
        </div>
        <div>
          <span className="dim-val">{dim.score}/100</span>
          <span className="dim-band">{dim.band}</span>
        </div>
      </div>
      <div className="dim-bar">
        <div className={`dim-fill ${evaluative ? '' : 'neutral'}`} style={{ width: `${Math.max(0, Math.min(100, dim.score))}%` }} />
      </div>
    </div>
  );
}

// Recruiter-only full result: the per-dimension breakdown plus a one-time
// AI narrative. Candidates never see this view — they only get their own
// overall score and band on submit.
export default function AssessmentResult() {
  const { unlocked, checking, error, key: siteKeyVal, setKey, submit, siteFetch } = useSiteKey('/api/tools/site-key-check');
  const { assignmentId } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!assignmentId || !unlocked) return;
    siteFetch(`/api/tools/assessment/result/${assignmentId}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setErr(d.error); else setData(d); })
      .catch(() => setErr('Could not load that result.'));
  }, [assignmentId, unlocked]);

  const evaluative = data?.assessment?.evaluative;

  if (checking) return null;
  if (!unlocked) {
    return (
      <KeyGate error={error} keyVal={siteKeyVal} setKey={setKey} submit={submit} checking={checking} label="Assessment.ai — enter key" />
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '44px 56px 80px', maxWidth: 820, margin: '0 auto' }}>
        <div className="eyebrow">Recruit.ai · Assessment.ai</div>

        {err && <p style={{ color: 'var(--slate)', fontSize: 13.5, marginTop: 20 }}>{err}</p>}
        {!err && !data && <p style={{ color: 'var(--slate)', fontSize: 13.5, marginTop: 20 }}>Loading result…</p>}

        {data && (
          <>
            <h1 className="serif" style={{ fontSize: 25, color: 'var(--cream)', margin: '8px 0 6px' }}>
              {data.candidate.name || data.candidate.email}
            </h1>
            <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 26 }}>
              {data.assessment.fullName}
              {data.candidate.roleLevel ? ` · ${data.candidate.roleLevel}` : ''}
              {data.candidate.jobRole ? ` · ${data.candidate.jobRole}` : ''}
              {data.candidate.contact ? ` · ${data.candidate.contact}` : ''}
            </div>

            {data.pending && (
              <div className="coming-soon-card">
                <h2>Not completed yet</h2>
                <p>{data.status === 'registered' ? 'The candidate has started but not yet submitted.' : "The candidate hasn't opened their link yet."}</p>
              </div>
            )}

            {!data.pending && (
              <>
                {evaluative ? (
                  <div className="overall-card">
                    <div className="eyebrow" style={{ marginBottom: 10 }}>Overall — weighted</div>
                    <div className="overall-score">{data.overallScore}<span style={{ fontSize: 18, color: 'var(--slate)' }}>/100</span></div>
                    <div className="overall-band">{data.bandLabel}</div>
                  </div>
                ) : (
                  <div className="overall-card" style={{ borderColor: 'var(--line)', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="eyebrow" style={{ marginBottom: 10 }}>Trait profile</div>
                    <div className="overall-band" style={{ marginTop: 0 }}>
                      The Big Five is a description of how someone is wired, not a measure of how well they'd do the job.
                      There is no overall score and no pass mark — read each domain on its own, and never as a hiring signal.
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 30 }}>
                  <div className="eyebrow" style={{ marginBottom: 14 }}>{evaluative ? 'Dimensions' : 'Domains'}</div>
                  {(data.dimensionScores || []).map((d) => (
                    <DimensionBar key={d.key} dim={d} evaluative={evaluative} />
                  ))}
                </div>

                {data.narrative && (
                  <>
                    <div className="eyebrow" style={{ marginBottom: 14 }}>AI interpretation</div>
                    <div className="narrative-card">
                      <h4>{evaluative ? 'Strengths' : 'How this profile tends to show up'}</h4>
                      <ul>{(data.narrative.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                    <div className="narrative-card">
                      <h4>{evaluative ? 'Potential risks' : 'Less natural contexts'}</h4>
                      <ul>{(data.narrative.risks || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                    <div className="narrative-card">
                      <h4>Recommended interview focus</h4>
                      <ul>{(data.narrative.interview_focus || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  </>
                )}

                <p style={{ fontSize: 11.5, color: 'var(--slate)', marginTop: 24, lineHeight: 1.7 }}>
                  This is a behavioural self-report, not a skills test or a hiring decision. Use it as one input
                  alongside interviews and evidence of actual work.
                </p>
              </>
            )}

            <p style={{ marginTop: 30 }}>
              <a href="/tools/assessment-ai" style={{ color: 'var(--amber-dim)', fontSize: 12.5 }}>← Back to Assessment.ai</a>
            </p>
          </>
        )}
      </div>
      <AskShreeChat />
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';

// Public status-check page — the link farmers save after submitting a
// case. No login. Shows status only, and the final recommendation once a
// vet has approved it — never the AI draft or vet notes.
const STATUS_TEXT = {
  pending_ai: 'Your case has been received and is being looked at.',
  pending_vet_review: 'A vet is reviewing your case now.',
  approved: 'A vet has reviewed your case.',
  rejected: 'A vet has reviewed your case and could not make a recommendation from the details given. Please submit a new case with more detail, or contact a vet directly.',
};

export default function GauriStatusPage({ params }) {
  const [data, setData] = useState(undefined);

  useEffect(() => {
    fetch(`/api/gauri/cases/${params.id}`)
      .then((r) => r.json())
      .then((d) => setData(d));
  }, [params.id]);

  if (data === undefined) {
    return <div style={{ padding: '60px 24px', maxWidth: 560, margin: '0 auto', textAlign: 'center', color: 'var(--slate)' }}>Loading…</div>;
  }
  if (!data.case) {
    return (
      <div style={{ padding: '60px 24px', maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <h1 className="serif" style={{ fontSize: 22, color: 'var(--cream)' }}>Case not found</h1>
        <p style={{ color: 'var(--slate)', fontSize: 13.5, marginTop: 10 }}>Check the link, or submit a new case.</p>
      </div>
    );
  }

  const c = data.case;
  return (
    <div style={{ padding: '60px 24px', maxWidth: 560, margin: '0 auto' }}>
      <div className="eyebrow">Gauri.ai</div>
      <h1 className="serif" style={{ fontSize: 24, color: 'var(--cream)', margin: '8px 0 16px' }}>Case status</h1>
      <p style={{ color: 'var(--cream)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>{STATUS_TEXT[c.status] || 'Received.'}</p>

      {c.status === 'approved' && c.final_recommendation && (
        <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 16, background: 'rgba(255,255,255,0.015)' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--amber)', marginBottom: 8, textTransform: 'uppercase' }}>Vet's recommendation</div>
          <div style={{ fontSize: 13.5, color: 'var(--cream)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{c.final_recommendation}</div>
        </div>
      )}

      <button className="primary-btn" style={{ marginTop: 24 }} onClick={() => { window.location.href = '/gauri'; }}>
        Report another issue
      </button>
    </div>
  );
}

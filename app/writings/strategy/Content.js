'use client';
import { useWritingsKey } from '../../../lib/useWritingsKey';
import ThemeShell from '../../../components/ThemeShell';
import { WritingsGate } from '../../../components/WritingsGate';

const TOPICS = [
  { label: 'Purpose', href: "/writings/purpose", active: false },
  { label: 'Leadership', href: "/writings/leadership", active: false },
  { label: 'Strategy', href: "/writings/strategy", active: true },
  { label: 'Artificial Intelligence', href: "/writings/artificial-intelligence", active: false },
  { label: 'Spirituality', href: "/writings/spirituality", active: false },
];

function StrategyContent() {
  return (
    <ThemeShell>
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
        <a href="/" style={{ fontSize: 13, color: 'var(--slate)', textDecoration: 'none' }}>&larr; back to home</a>
      </div>

      <div style={{ padding: '56px 24px 80px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, fontSize: 11, letterSpacing: '0.08em', color: 'var(--amber)', marginBottom: 14 }}>WRITINGS</div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: 32, color: 'var(--cream)', margin: '0 0 40px' }}>Strategy</h1>

        <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 32, background: 'rgba(255,255,255,0.015)' }}>
          <p style={{ fontFamily: 'Fraunces, serif', fontSize: 16, color: 'var(--cream)', margin: '0 0 8px' }}>First piece on Strategy &mdash; coming soon</p>
          <p style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.6, margin: 0 }}>Articles published under this topic will appear here, newest first.</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 40, flexWrap: 'wrap' }}>
          {TOPICS.map((t) => (
            <a
              key={t.href}
              href={t.href}
              style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, fontSize: 11, textDecoration: 'none',
                border: '1px solid ' + (t.active ? 'var(--amber-dim)' : 'var(--line)'),
                color: t.active ? 'var(--amber)' : 'var(--slate)',
                borderRadius: 20, padding: '6px 14px',
              }}
            >
              {t.label}
            </a>
          ))}
        </div>
      </div>
    </ThemeShell>
  );
}


export default function StrategyContentWrapper() {
  const { unlocked, checking, error, key: keyVal, setKey, submit } = useWritingsKey();
  if (checking) return null;
  if (!unlocked) return <WritingsGate error={error} keyVal={keyVal} setKey={setKey} submit={submit} checking={checking} />;
  return <StrategyContent />;
}

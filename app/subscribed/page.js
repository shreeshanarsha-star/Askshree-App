import ThemeShell from '../../components/ThemeShell';

export default function SubscribedPage() {
  return (
    <ThemeShell className="section" style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
      <h2>You're subscribed</h2>
      <p className="lead">Your access is active. Head back to the toolkit whenever you're ready.</p>
      <a href="/" style={{ color: 'var(--amber)' }}>Back to Ask Shree →</a>
    </ThemeShell>
  );
}

import AskShreeChat from '../../../components/AskShreeChat';

export default function SmartSourceAI() {
  return (
    <div style={{ position: 'relative' }}>
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '44px 56px 80px', maxWidth: 720, margin: '0 auto' }}>
        <div className="eyebrow">Recruit.ai</div>
        <div className="coming-soon-card">
          <h2>Smart Source.ai is almost here</h2>
          <p>AI-powered candidate sourcing with match scoring and contact reveal — wiring up now. Check back shortly, or ask Ask Shree for updates.</p>
        </div>
      </div>
      <AskShreeChat />
    </div>
  );
}

'use client';
import CalculatorWidget from './widgets/CalculatorWidget';
import NotesWidget from './widgets/NotesWidget';

export default function FeatureWorkspace({ feature, expanded, onToggleExpand, onClose }) {
  if (!feature) return null;
  return (
    <div className={`home2-workspace orb2-panel-in ${expanded ? 'home2-workspace-expanded' : ''}`} key={feature.id}>
      <div className="home2-workspace-head">
        <div className="home2-workspace-title">{feature.title}</div>
        <div className="home2-workspace-actions">
          <button type="button" className="orb2-fs-btn" onClick={onToggleExpand}>
            {expanded ? 'Exit fullscreen' : 'Fullscreen'}
          </button>
          <button type="button" className="home2-workspace-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>
      </div>
      <div className="home2-workspace-body">
        {feature.id === 'calculator' && <CalculatorWidget />}
        {feature.id === 'notes' && <NotesWidget />}
        {feature.id === 'soon' && (
          <div className="home2-workspace-soon">
            <div className="home2-workspace-soon-title">{feature.title}</div>
            <p>This one&rsquo;s on the roadmap — not built yet. Ask Hey Shree again once it&rsquo;s live.</p>
          </div>
        )}
      </div>
    </div>
  );
}

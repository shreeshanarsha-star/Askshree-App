'use client';
import CalculatorWidget from './widgets/CalculatorWidget';
import NotesWidget from './widgets/NotesWidget';
import CalendarWidget from './widgets/CalendarWidget';
import ClockWidget from './widgets/ClockWidget';
import TimerWidget from './widgets/TimerWidget';
import TodoWidget from './widgets/TodoWidget';
import RemindersWidget from './widgets/RemindersWidget';
import ClipboardWidget from './widgets/ClipboardWidget';
import ExpenseWidget from './widgets/ExpenseWidget';
import ChartsWidget from './widgets/ChartsWidget';
import UnitConverterWidget from './widgets/UnitConverterWidget';
import WorldTimeWidget from './widgets/WorldTimeWidget';
import MoonPhaseWidget from './widgets/MoonPhaseWidget';
import SunriseSunsetWidget from './widgets/SunriseSunsetWidget';

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
        {feature.id === 'calendar' && <CalendarWidget />}
        {feature.id === 'clock' && <ClockWidget />}
        {feature.id === 'timer' && <TimerWidget />}
        {feature.id === 'todo' && <TodoWidget />}
        {feature.id === 'reminders' && <RemindersWidget />}
        {feature.id === 'clipboard' && <ClipboardWidget />}
        {feature.id === 'expense' && <ExpenseWidget />}
        {feature.id === 'charts' && <ChartsWidget />}
        {feature.id === 'unit-converter' && <UnitConverterWidget />}
        {feature.id === 'world-time' && <WorldTimeWidget />}
        {feature.id === 'moon-phase' && <MoonPhaseWidget />}
        {feature.id === 'sunrise-sunset' && <SunriseSunsetWidget />}
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

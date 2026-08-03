'use client';
import ToolRunner from '../../../components/ToolRunner';

export default function GenerateLeadPage() {
  return (
    <ToolRunner
      title="Generate Lead"
      tag="Sourcing"
      endpoint="/api/tools/generate-lead"
      fields={[
        { name: 'role', label: 'Role / focus', type: 'text', placeholder: 'BD Manager candidates, or client leads' },
        { name: 'industry', label: 'Industry', type: 'text', placeholder: 'Nutraceuticals' },
        { name: 'region', label: 'Region', type: 'text', placeholder: 'Europe' },
      ]}
      renderResult={(result) => (
        <div style={{ display: 'grid', gap: 12 }}>
          {result.leads?.map((l, i) => (
            <div key={i} className="tool-card">
              <h3>{l.company}</h3>
              <p><strong style={{ color: 'var(--cream)' }}>Why now:</strong> {l.why_now}</p>
              <p><strong style={{ color: 'var(--cream)' }}>Angle:</strong> {l.angle}</p>
            </div>
          ))}
        </div>
      )}
    />
  );
}

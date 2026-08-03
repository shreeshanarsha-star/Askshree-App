'use client';
import ToolRunner from '../../../components/ToolRunner';

export default function SmartHuntPage() {
  return (
    <ToolRunner
      title="Smart Hunt"
      tag="Sourcing"
      endpoint="/api/tools/smart-hunt"
      fields={[{ name: 'criteria', label: 'Search criteria', type: 'textarea', rows: 5, placeholder: 'e.g. Senior backend engineer, Go + Kubernetes, Bengaluru' }]}
      renderResult={(result) => (
        <div className="tool-card">
          <h3>X-ray queries</h3>
          <ul style={{ fontSize: 13, color: 'var(--slate)', paddingLeft: 18 }}>
            {result.queries?.map((q, i) => <li key={i} style={{ marginBottom: 6, fontFamily: 'IBM Plex Mono, monospace' }}>{q}</li>)}
          </ul>
          {result.notes && <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 10 }}>{result.notes}</p>}
        </div>
      )}
    />
  );
}

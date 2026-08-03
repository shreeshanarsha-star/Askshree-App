'use client';
import ToolRunner from '../../../components/ToolRunner';

export default function SmartSourcePage() {
  return (
    <ToolRunner
      title="Smart Source"
      tag="Sourcing"
      endpoint="/api/tools/smart-source"
      fields={[{ name: 'jobDescription', label: 'Job description', type: 'textarea', rows: 8, placeholder: 'Paste the JD here...' }]}
      renderResult={(result) => (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="tool-card">
            <h3>Search strings</h3>
            <ul style={{ fontSize: 13, color: 'var(--slate)', paddingLeft: 18 }}>
              {result.search_strings?.map((s, i) => <li key={i} style={{ marginBottom: 6 }}>{s}</li>)}
            </ul>
          </div>
          <div className="tool-card">
            <h3>Target companies</h3>
            {result.target_companies?.map((c, i) => (
              <p key={i} style={{ fontSize: 13, color: 'var(--slate)' }}><strong style={{ color: 'var(--cream)' }}>{c.name}</strong> — {c.why}</p>
            ))}
          </div>
          <div className="tool-card">
            <h3>Adjacent titles</h3>
            <p style={{ fontSize: 13, color: 'var(--slate)' }}>{result.adjacent_titles?.join(', ')}</p>
          </div>
        </div>
      )}
    />
  );
}

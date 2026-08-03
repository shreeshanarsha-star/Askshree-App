'use client';
import ToolRunner from '../../../components/ToolRunner';

export default function GetJdPage() {
  return (
    <ToolRunner
      title="Get JD"
      tag="Drafting"
      endpoint="/api/tools/get-jd"
      fields={[
        { name: 'role', label: 'Role title', type: 'text', placeholder: 'Nutraceutical BD & Sales Manager' },
        { name: 'seniority', label: 'Seniority', type: 'text', placeholder: 'Senior / Manager / Director' },
        { name: 'industry', label: 'Industry', type: 'text', placeholder: 'Nutraceuticals' },
        { name: 'location', label: 'Location', type: 'text', placeholder: 'Bengaluru' },
      ]}
      renderResult={(result) => (
        <div className="tool-card">
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif', fontSize: 13.5, color: 'var(--cream)' }}>{result.jd}</pre>
        </div>
      )}
    />
  );
}

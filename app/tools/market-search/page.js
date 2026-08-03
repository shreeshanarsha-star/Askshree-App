'use client';
import ToolRunner from '../../../components/ToolRunner';

export default function MarketSearchPage() {
  return (
    <ToolRunner
      title="Run Market Search"
      tag="Research"
      endpoint="/api/tools/market-search"
      fields={[
        { name: 'role', label: 'Role', type: 'text', placeholder: 'Head of Talent Acquisition' },
        { name: 'industry', label: 'Industry', type: 'text', placeholder: 'Nutraceuticals / Animal health' },
        { name: 'location', label: 'Location', type: 'text', placeholder: 'Bengaluru' },
      ]}
      renderResult={(result) => (
        <div className="tool-card">
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif', fontSize: 13.5, color: 'var(--cream)' }}>{result.summary}</pre>
        </div>
      )}
    />
  );
}

'use client';
import ToolRunner from '../../../components/ToolRunner';

export default function WelcomeFlyerPage() {
  return (
    <ToolRunner
      title="Welcome Flyer"
      tag="Branding"
      endpoint="/api/tools/welcome-flyer"
      fields={[
        { name: 'name', label: "New hire's name", type: 'text', placeholder: 'Priya Menon' },
        { name: 'role', label: 'Role', type: 'text', placeholder: 'Regional Sales Manager' },
        { name: 'detail', label: 'One welcoming detail', type: 'text', placeholder: 'Loves marathon running' },
      ]}
      renderResult={(result) => (
        <div className="tool-card">
          <h3>Flyer copy ({result.template} template)</h3>
          <p>{result.copy}</p>
        </div>
      )}
    />
  );
}

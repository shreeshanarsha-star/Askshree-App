'use client';
import ToolRunner from '../../../components/ToolRunner';

export default function GetAtsResumePage() {
  return (
    <ToolRunner
      title="Get ATS Friendly Resume"
      tag="Candidate side"
      endpoint="/api/tools/get-ats-resume"
      fields={[
        { name: 'resumeText', label: 'Paste the resume text', type: 'textarea', rows: 10, placeholder: 'Paste raw resume text...' },
        { name: 'targetJd', label: 'Target job description (optional)', type: 'textarea', rows: 5, placeholder: 'Paste the JD to align keywords against...' },
      ]}
      renderResult={(result) => (
        <div className="tool-card">
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif', fontSize: 13.5, color: 'var(--cream)' }}>{result.resume}</pre>
        </div>
      )}
    />
  );
}

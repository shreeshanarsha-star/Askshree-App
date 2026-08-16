'use client';
import { useState } from 'react';

// Shared "Add ticked candidates to a project" control — used by both
// Smart Source.ai and Smart Hunt.ai results toolbars. Lets the recruiter
// pick an existing project or type a new name; either way the selected
// candidates land in project_candidates, viewable later at /tools/projects.
export default function AddToProjectButton({ siteFetch, selectedCount, getSelectedCandidates }) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState(null);
  const [projectId, setProjectId] = useState('');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  // Refetch the project list every time the panel opens rather than caching
  // it for the component's lifetime. The old `if (!projects)` guard treated
  // "already fetched once" and "there are no projects" the same way -- an
  // empty array is truthy in JS, so after the very first open (when the
  // recruiter had zero projects yet) it never fetched again for the rest of
  // that page session. Create a project through this same panel, select a
  // new candidate, reopen it, and the project you just made -- which very
  // much exists on the server -- still wasn't in the dropdown. This is what
  // made "add to existing project" look broken: there was never a second
  // request to find out a project now existed.
  async function openPanel() {
    const next = !open;
    setOpen(next);
    if (next) {
      setProjects(null);
      const res = await siteFetch('/api/tools/projects');
      const data = await res.json().catch(() => null);
      setProjects(data?.projects || []);
    }
  }

  async function addToProject() {
    setBusy(true);
    setNote('');
    try {
      let targetId = projectId;
      if (!targetId) {
        if (!newName.trim()) { setNote('Pick a project or type a new name.'); setBusy(false); return; }
        const createRes = await siteFetch('/api/tools/projects', { method: 'POST', body: JSON.stringify({ name: newName }) });
        const createData = await createRes.json();
        if (!createData.ok) { setNote(createData.error || 'Could not create project.'); setBusy(false); return; }
        targetId = createData.project.id;
      }
      const candidates = getSelectedCandidates();
      const res = await siteFetch(`/api/tools/projects/${targetId}/candidates`, {
        method: 'POST',
        body: JSON.stringify({ candidates }),
      });
      const data = await res.json();
      setBusy(false);
      if (data.ok) {
        setNote(`Added to project.`);
        setNewName('');
        setTimeout(() => { setOpen(false); setNote(''); }, 1400);
      } else {
        setNote(data.error || 'Could not add to project.');
      }
    } catch (e) {
      setBusy(false);
      setNote('Could not add to project.');
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={openPanel}
        disabled={selectedCount === 0}
        style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 500, fontSize: 11.5, color: selectedCount ? 'var(--amber)' : 'var(--slate)',
          border: '1px solid ' + (selectedCount ? 'var(--amber-dim)' : 'var(--line)'), borderRadius: 20, padding: '8px 14px',
          background: 'transparent', cursor: selectedCount ? 'pointer' : 'not-allowed',
        }}
      >
        Add to project
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, zIndex: 20, background: 'var(--navy-2)',
          border: '1px solid var(--line)', borderRadius: 8, padding: 14, width: 260,
        }}>
          {projects === null ? (
            <div className="file-hint" style={{ margin: 0 }}>Loading projects…</div>
          ) : (
            <>
              {projects.length > 0 && (
                <select
                  className="free-text-input"
                  style={{ marginBottom: 8 }}
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">— choose a project —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.candidate_count})</option>
                  ))}
                </select>
              )}
              <input
                className="free-text-input"
                type="text"
                placeholder="or create new project"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); if (e.target.value) setProjectId(''); }}
              />
              <button className="primary-btn" style={{ marginTop: 10, width: '100%' }} onClick={addToProject} disabled={busy}>
                {busy ? 'Adding…' : `Add ${selectedCount} candidate${selectedCount === 1 ? '' : 's'}`}
              </button>
              {note && <div className="file-hint" style={{ marginTop: 8 }}>{note}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

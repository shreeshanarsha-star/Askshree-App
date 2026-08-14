'use client';
import { useEffect, useState } from 'react';
import AskShreeChat from '../../../components/AskShreeChat';
import { useSiteKey } from '../../../lib/useSiteKey';
import { KeyGate } from '../../../components/KeyGate';
import { AccountBadge } from '../../../components/AccountBadge';

// Lists every project the recruiter has saved candidates into from Smart
// Source.ai / Smart Hunt.ai — click through to view, export, or share that
// project's shortlist the same way as a fresh search's results.
export default function ProjectsList() {
  const { unlocked, checking, error, key: siteKeyVal, setKey, submit, siteFetch } = useSiteKey('/api/tools/site-key-check');
  const [projects, setProjects] = useState(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!unlocked) return;
    siteFetch('/api/tools/projects').then((r) => r.json()).then((d) => setProjects(d.projects || []));
  }, [unlocked]);

  async function createProject() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await siteFetch('/api/tools/projects', { method: 'POST', body: JSON.stringify({ name: newName }) });
    const data = await res.json();
    setCreating(false);
    if (data.ok) {
      window.location.href = `/tools/projects/${data.project.id}`;
    }
  }

  if (checking) return null;
  if (!unlocked) {
    return <KeyGate error={error} keyVal={siteKeyVal} setKey={setKey} submit={submit} checking={checking} label="Projects — enter key" />;
  }

  return (
    <div style={{ position: 'relative' }}>
      <AccountBadge />
      <div className="nav">
        <div className="logo"><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Ask <span>Shree</span></a></div>
      </div>
      <div style={{ padding: '44px 56px 80px', maxWidth: 780, margin: '0 auto' }}>
        <div className="eyebrow">Recruit.ai</div>
        <h1 className="serif" style={{ fontSize: 26, color: 'var(--cream)', margin: '8px 0 12px' }}>Projects</h1>
        <p style={{ fontSize: 13.5, color: 'var(--slate)', maxWidth: 620, marginBottom: 28 }}>
          Candidates you've added to a project from Smart Source.ai or Smart Hunt.ai — grouped, saved, and
          ready to view, export, or share again later.
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          <input className="free-text-input" type="text" placeholder="New project name"
            value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="primary-btn" style={{ marginTop: 0, flexShrink: 0 }} onClick={createProject} disabled={creating || !newName.trim()}>
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>

        {projects === null && <div className="file-hint">Loading…</div>}
        {projects && projects.length === 0 && (
          <div className="file-hint">No projects yet — tick candidates on Smart Source.ai or Smart Hunt.ai and add them to a new project.</div>
        )}
        {projects && projects.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projects.map((p) => (
              <a key={p.id} href={`/tools/projects/${p.id}`} className="job-card" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                textDecoration: 'none', color: 'inherit',
              }}>
                <span style={{ fontSize: 14, color: 'var(--cream)' }}>{p.name}</span>
                <span className="file-hint" style={{ margin: 0 }}>{p.candidate_count} candidate{p.candidate_count === 1 ? '' : 's'}</span>
              </a>
            ))}
          </div>
        )}
      </div>
      <AskShreeChat />
    </div>
  );
}

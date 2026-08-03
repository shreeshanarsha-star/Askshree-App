'use client';
import { useState, useRef, useEffect } from 'react';
import NeuralBackground from '../components/NeuralBackground';
import AskShreeChat from '../components/AskShreeChat';

const TOOLS = [
  { slug: 'fit-check', name: 'Fit Check', tag: 'Screening', desc: '8-factor weighted scorecard across up to 20 CVs at once.', flagship: true },
  { slug: 'smart-source', name: 'Smart Source', tag: 'Sourcing', desc: 'Upload a JD, get AI-driven candidate sourcing suggestions.' },
  { slug: 'smart-hunt', name: 'Smart Hunt', tag: 'Sourcing', desc: 'Manual X-ray search across public candidate data.' },
  { slug: 'welcome-flyer', name: 'Welcome Flyer', tag: 'Branding', desc: 'Six branded templates, generated in one click.' },
  { slug: 'get-jd', name: 'Get JD', tag: 'Drafting', desc: 'Pulls comparable roles and market data to help draft a job description.' },
  { slug: 'get-ats-resume', name: 'Get ATS Friendly Resume', tag: 'Candidate side', desc: 'Reformats a resume so it parses cleanly through ATS software.' },
  { slug: 'market-search', name: 'Run Market Search', tag: 'Research', desc: 'Broader compensation and market research beyond a single JD.' },
  { slug: 'generate-lead', name: 'Generate Lead', tag: 'Sourcing', desc: 'Surfaces potential candidate or business leads for outreach.' },
];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const hints = TOOLS.map((t) => t.name.toLowerCase());

  useEffect(() => {
    const id = setInterval(() => setHintIndex((i) => (i + 1) % hints.length), 2200);
    return () => clearInterval(id);
  }, [hints.length]);

  function runQuery() {
    const match = TOOLS.find((t) => query.toLowerCase().includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(query.toLowerCase()));
    if (match) window.location.href = `/tools/${match.slug}`;
  }

  return (
    <div style={{ position: 'relative' }}>
      <NeuralBackground />

      <div className="nav">
        <div>
          <div className="logo">Ask <span>Shree</span></div>
          <div className="pill" style={{ display: 'inline-block', marginTop: 6 }}>&#9679; ai-assisted profile</div>
        </div>
        <div className="links"><span>my projects</span><span>my toolkit</span><span>my writings</span><span>my contact</span></div>
      </div>

      <div className="hero">
        <div>
          <h1>
            A talent acquisition specialist who architected the solution, then coded it with AI to fix
            his own talent acquisition challenges — until <em>delegating tasks to AI became the solution itself.</em>
          </h1>
          <p className="sub">Talent acquisition, based in Bengaluru — building AI-native tools for sourcing and hiring in my own time.</p>

          <div className="terminal">
            <span className="chev">&gt;</span>
            <input
              type="text"
              placeholder="Try a tool name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runQuery()}
            />
            <button className="run" onClick={runQuery}>run query</button>
          </div>
          <div className="try-hint">Try &quot;{hints[hintIndex]}&quot;</div>
        </div>

        <div className="side-card">
          <div className="ring">
            <img src="/profile-photo.jpg" alt="Shreesha Narsha" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          </div>
          <div className="tags">
            <div><span className="dot">&#9679;</span> Head-Global Talent Acquisition</div>
            <div><span className="dot">&#9679;</span> AI Builder</div>
            <div><span className="dot">&#9679;</span> Bengaluru</div>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Built from the actual workflow, not around it</h2>
        <p className="lead">Eight tools, each matching a real step in sourcing, screening, and closing.</p>
        <div className="tool-grid">
          {TOOLS.map((t) => (
            <a key={t.slug} href={`/tools/${t.slug}`} className="tool-card"
              style={{ textDecoration: 'none', display: 'block', border: t.flagship ? '1px solid var(--amber-dim)' : undefined }}>
              <span className="tag">{t.tag}</span>
              <h3>{t.name}</h3>
              <p>{t.desc}</p>
            </a>
          ))}
        </div>
      </div>

      <AskShreeChat />
    </div>
  );
}

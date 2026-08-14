'use client';
import Sidebar from '../../components/Sidebar';
import ThemeBackground from '../../components/ThemeBackground';
import { useTheme } from '../../lib/useTheme';

const CREDITS = [
  { role: 'Built by', name: 'Shreesha Narsha — Head, Global Talent Acquisition & AI Builder, Bengaluru' },
  { role: 'AI systems', name: 'Gauri.ai, Job Postings.ai, Apply.ai, Smart Source.ai, Smart hunt.ai, Smart screen.ai, Assessment.ai, Offer.ai, Margin.ai' },
  { role: 'Engineering', name: 'Designed, coded, and shipped with Claude (Anthropic) as the build partner' },
  { role: 'Infrastructure', name: 'Next.js, Supabase, Vercel' },
];

export default function CreditsPage() {
  const { themeId, ready } = useTheme();
  return (
    <div style={{ position: 'relative' }}>
      <Sidebar active="credits" />
      <div className="side-content">
        {ready && <ThemeBackground themeId={themeId} />}
        <div className="simple-page">
          <div className="eyebrow">Credits</div>
          <h1>Who built this</h1>
          <p className="sub">Ask Shree is a one-person build — talent acquisition experience turned into AI-native tools.</p>
          <div className="credits-list">
            {CREDITS.map((c, i) => (
              <div className="credits-item" key={i}>
                <div className="role">{c.role}</div>
                <div className="name">{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

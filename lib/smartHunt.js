import { supabaseAdmin } from './supabase';

// Deterministic overlap-scoring for candidates already in our own database
// (previously sourced via Smart Screen.ai / Apply.ai) — exact skill-list
// matching against what's already on file, not a judgment call, so no AI
// pass is needed here (unlike LinkedIn snippets or local resumes, where the
// evidence is thin/unstructured and scoring genuinely requires judgment).
export async function searchInternalDatabase(criteria) {
  const skills = (criteria.skills || []).map((s) => String(s).toLowerCase());
  if (skills.length === 0 && !criteria.roleTitle) return [];

  const db = supabaseAdmin();
  const { data: rows } = await db
    .from('candidates')
    .select('id, name, current_designation, current_company, location, skills')
    .limit(300);
  if (!rows) return [];

  return rows
    .map((r) => {
      const candidateSkills = (r.skills || []).map((s) => String(s).toLowerCase());
      const matched = skills.filter((s) => candidateSkills.some((cs) => cs.includes(s) || s.includes(cs)));
      let score = skills.length ? Math.round((matched.length / skills.length) * 100) : 0;
      if (criteria.roleTitle && r.current_designation &&
          r.current_designation.toLowerCase().includes(criteria.roleTitle.toLowerCase())) {
        score = Math.min(100, score + 20);
      }
      if (criteria.location && r.location &&
          r.location.toLowerCase().includes(criteria.location.toLowerCase())) {
        score = Math.min(100, score + 10);
      }
      return {
        name: r.name || null,
        designation: r.current_designation || null,
        company: r.current_company || null,
        location: r.location || null,
        match_score: score,
        profile_url: null,
        source: 'database',
        candidate_id: r.id,
      };
    })
    .filter((c) => c.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 20);
}

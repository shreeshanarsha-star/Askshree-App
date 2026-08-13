import { askClaude } from './anthropic';
import { supabaseAdmin } from './supabase';

// Stage 1 (Auto mode): turn a pasted JD / role description into a short list
// of skills + a location filter, the same way structureJD works for Job
// Postings.ai. Manual mode skips this entirely — the recruiter supplies the
// skills (and optionally a raw boolean string) directly.
const EXTRACT_PROMPT = `Read this job description or role summary and extract, as JSON only:
{
  "role_title": string or null,
  "skills": array of 3-6 short strings — the most important technical/functional skills,
  "location": string or null (city/region if mentioned)
}
Never invent a location that isn't stated.`;

export async function extractSearchCriteria(text) {
  const raw = await askClaude(EXTRACT_PROMPT, text, 500);
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

// Builds a Google search ("dork") string restricted to public LinkedIn
// profile pages — this only ever surfaces what Google has already indexed
// as a public snippet, never scrapes LinkedIn directly.
export function buildSearchQuery({ skills, location, roleTitle, booleanQuery }) {
  if (booleanQuery && booleanQuery.trim()) {
    return `site:linkedin.com/in ${booleanQuery.trim()}${location ? ` "${location}"` : ''}`;
  }
  const parts = ['site:linkedin.com/in'];
  if (roleTitle) parts.push(`"${roleTitle}"`);
  (skills || []).forEach((s) => parts.push(`"${s}"`));
  if (location) parts.push(`"${location}"`);
  return parts.join(' ');
}

export async function searchSerper(query) {
  const key = process.env.SERPER_API_KEY;
  if (!key) return { ok: false, reason: 'no_serper_key_configured', results: [] };

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: 20 }),
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    return { ok: false, reason: 'serper_request_failed', status: res.status, detail: bodyText.slice(0, 300), results: [] };
  }

  const data = await res.json();
  const organic = (data.organic || []).filter((r) => r.link && r.link.includes('linkedin.com/in'));
  return { ok: true, results: organic };
}

// One AI call structures + scores every result at once — cheaper than a
// call per candidate, and scoring against the role's requirements is
// inherently a judgment call (no deterministic formula fits "how good a
// match is this snippet"), same reasoning as screenCandidate in aiScreen.js.
const SCORE_PROMPT = `You're helping a recruiter source candidates from Google search results over
public LinkedIn profile pages. For each result (title + snippet + link), extract what you can and
score how well it matches the target role's skills/location. Be honest — most snippets are thin,
so a low score for insufficient evidence is correct and expected, not a failure.

Respond as JSON only: { "candidates": [
  { "name": string or null, "designation": string or null, "company": string or null,
    "location": string or null, "profile_url": string, "match_score": integer 0-100 }
] }`;

export async function scoreResults(results, criteria) {
  if (!results.length) return [];
  const context = `Target role: ${criteria.roleTitle || 'not specified'}
Target skills: ${(criteria.skills || []).join(', ') || 'not specified'}
Target location: ${criteria.location || 'not specified'}

--- Search results ---
${results.map((r, i) => `${i + 1}. Title: ${r.title}\nSnippet: ${r.snippet || ''}\nLink: ${r.link}`).join('\n\n')}`;

  const raw = await askClaude(SCORE_PROMPT, context, 2000);
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  return (parsed.candidates || []).sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
}

// Task: don't spend a Serper call + AI pass on a near-duplicate search.
// Simple normalized-text match on the same query string within the last
// 14 days — good enough for "someone re-ran the same search," not trying
// to do fuzzy/semantic dedup.
const CACHE_WINDOW_DAYS = 14;

export async function findCachedSearch(queryText) {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - CACHE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await db
    .from('smart_source_searches')
    .select('id, created_at')
    .eq('job_description', queryText)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const { data: candidates } = await db
    .from('smart_source_candidates')
    .select('*')
    .eq('search_id', data.id)
    .order('match_score', { ascending: false });

  return { searchId: data.id, candidates: candidates || [] };
}

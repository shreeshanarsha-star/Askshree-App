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

// Builds a Google X-ray search string restricted to public LinkedIn profile
// pages via the site: operator — this only ever surfaces what Google has
// already indexed as a public snippet, never scrapes LinkedIn directly.
// Same term-shaping rule as the proven Nutrahire implementation: quote a
// term if it's 4 words or fewer (exact phrase), otherwise truncate to the
// first 4 words unquoted (Google ignores extra terms in a long exact phrase
// anyway, so truncating keeps the query tight).
function addTerm(parts, term) {
  if (!term) return;
  const words = String(term).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return;
  if (words.length <= 4) {
    parts.push(`"${words.join(' ')}"`);
  } else {
    parts.push(words.slice(0, 4).join(' '));
  }
}

// Fixed term order per the finalized spec: Company first (the primary
// filter — "AI will first search from the companies on other criteria
// given"), then Role, then Location, then Skills, then free-text Keywords
// last. booleanQuery is kept as an alias for the Keywords field so callers
// that still pass it (older Smart Source.ai code paths) keep working.
export function buildSearchQuery({ company, roleTitle, location, skills, keywords, booleanQuery }) {
  const parts = ['site:linkedin.com/in'];
  addTerm(parts, company);
  addTerm(parts, roleTitle);
  addTerm(parts, location);
  (skills || []).slice(0, 3).forEach((s) => addTerm(parts, s));
  addTerm(parts, keywords || booleanQuery);
  return parts.join(' ');
}

// Broadened fallback queries, tried in order when the previous one returns
// zero linkedin.com/in results. Company is the anchor to keep as long as
// possible (per the same "search from the company first" priority) —
// everything else drops out before it does. Falls back to role/skill as
// the anchor when no company was given.
export function buildFallbackQueries({ company, roleTitle, location, skills, keywords, booleanQuery }) {
  const queries = [];
  const primaryTerm = company || roleTitle || (skills || [])[0];
  if (!primaryTerm) return queries;

  // Drop keywords + skills, keep company + role + location
  const level1 = ['site:linkedin.com/in'];
  addTerm(level1, company);
  addTerm(level1, roleTitle);
  addTerm(level1, location);
  if (level1.length > 1) queries.push(level1.join(' '));

  // Drop location too, keep company + role
  const level2 = ['site:linkedin.com/in'];
  addTerm(level2, company);
  addTerm(level2, roleTitle);
  if (level2.length > 1) queries.push(level2.join(' '));

  // Anchor term only
  const level3 = ['site:linkedin.com/in'];
  addTerm(level3, primaryTerm);
  queries.push(level3.join(' '));

  return queries;
}

// SerpApi is a straight Google-results proxy (no artificial query-pattern
// restriction the way Serper's free tier blocks site: and quoted phrases),
// so the site:linkedin.com/in X-ray query works as-is on their free plan
// (250 searches/month).
//
// `num`/`start` let callers page through results (Google's own pagination,
// proxied as-is by SerpApi) -- num=100 is the practical per-page ceiling
// for the Google engine, start=0/100/200... walks further into the index.
export async function searchSerpApi(query, { num = 100, start = 0 } = {}) {
  const key = process.env.SERPAPI_KEY;
  if (!key) return { ok: false, reason: 'no_serpapi_key_configured', results: [] };

  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=${num}&start=${start}&api_key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    return { ok: false, reason: 'serpapi_request_failed', status: res.status, detail: bodyText.slice(0, 300), results: [] };
  }

  const data = await res.json();
  if (data.error) {
    return { ok: false, reason: 'serpapi_request_failed', status: 200, detail: data.error, results: [] };
  }
  const organicRaw = data.organic_results || [];
  const organic = organicRaw
    .filter((r) => r.link && r.link.includes('linkedin.com/in'))
    .map((r) => ({ title: r.title, snippet: r.snippet || '', link: r.link }));
  return { ok: true, results: organic, rawCount: organicRaw.length };
}

// Target result count for a search. The per-page display selector in
// CandidateResults.js controls how many of these are shown at once -- this
// is the separate, actual fetch ceiling.
const TARGET_RESULT_COUNT = 200;
const PAGE_COUNT = 2; // 2 x num=100 = up to 200 raw results requested per search

// Walks SerpApi pages of the same query (start=0,100,...) in PARALLEL --
// not sequentially -- so the extra pages cost latency roughly once, not
// once per page. Sequential paging risked pushing a search past the
// serverless function's time budget, which would turn "get more results"
// into "the search fails outright" -- worse than the original small-result
// behavior this is meant to fix. De-duplicates by profile link across
// pages. Narrow X-ray queries often only have a handful of indexed matches
// regardless of how many pages are requested -- that's Google's index, not
// a limit this function imposes.
async function searchSerpApiMultiPage(query) {
  const pages = await Promise.all(
    Array.from({ length: PAGE_COUNT }, (_, page) => searchSerpApi(query, { num: 100, start: page * 100 }))
  );
  const firstFailed = pages.find((p) => !p.ok);
  if (firstFailed && !pages.some((p) => p.ok && p.results.length > 0)) return firstFailed;

  const seen = new Map();
  let rawCount = 0;
  for (const p of pages) {
    if (!p.ok) continue;
    rawCount += p.rawCount || 0;
    for (const r of p.results) {
      if (!seen.has(r.link)) seen.set(r.link, r);
    }
  }
  return { ok: true, results: Array.from(seen.values()).slice(0, TARGET_RESULT_COUNT), rawCount };
}

// Runs the primary query, then progressively broadens (per buildFallbackQueries)
// until a query returns at least one linkedin.com/in result or options run out.
// Once a query does return results, pages through it for up to
// TARGET_RESULT_COUNT total.
export async function searchSerpApiWithFallback(criteria, primaryQuery) {
  let result = await searchSerpApiMultiPage(primaryQuery);
  if (!result.ok) return result;
  if (result.results.length > 0) return result;

  for (const q of buildFallbackQueries(criteria)) {
    const attempt = await searchSerpApiMultiPage(q);
    if (!attempt.ok) return attempt;
    if (attempt.results.length > 0) return attempt;
    result = attempt;
  }
  return result;
}

// One AI call structures + scores every result at once — cheaper than a
// call per candidate, and scoring against the role's requirements is
// inherently a judgment call (no deterministic formula fits "how good a
// match is this snippet"), same reasoning as screenCandidate in aiScreen.js.
const SCORE_PROMPT = `You're helping a recruiter source candidates from Google search results over
public LinkedIn profile pages. For each result (title + snippet + link), extract what you can and
score how well it matches the target role's skills/location. Be honest — most snippets are thin,
so a low score for insufficient evidence is correct and expected, not a failure. Search snippets
rarely mention qualification, CTC, or notice period — leave those null rather than guessing; the
recruiter can fill them in by hand when the AI can't find them.

Also include a one-sentence "match_reason" for every candidate — the specific, concrete reason
for the score (e.g. "5 years in talent acquisition at a similar-stage startup, but no Bengaluru signal
in the snippet" or "Title matches exactly; skills unconfirmed from snippet alone"). Keep it honest and
specific to what's actually in the snippet, not generic praise.

Respond as JSON only: { "candidates": [
  { "name": string or null, "designation": string or null, "company": string or null,
    "location": string or null, "profile_url": string, "match_score": integer 0-100,
    "match_reason": string, "qualification": string or null, "current_ctc": string or null,
    "expected_ctc": string or null, "notice_period": string or null }
] }`;

// Scoring 200 results in a single Claude call risks the response getting
// truncated or the model losing attention across that much input/output --
// so this batches into chunks and runs the batches concurrently, then
// merges. Same prompt, same per-result output shape either way.
const SCORE_BATCH_SIZE = 25;

async function scoreBatch(batch, criteria) {
  const context = `Target company: ${criteria.company || 'not specified'}
Target role: ${criteria.roleTitle || 'not specified'}
Target skills: ${(criteria.skills || []).join(', ') || 'not specified'}
Target location: ${criteria.location || 'not specified'}

--- Search results ---
${batch.map((r, i) => `${i + 1}. Title: ${r.title}\nSnippet: ${r.snippet || ''}\nLink: ${r.link}`).join('\n\n')}`;

  const raw = await askClaude(SCORE_PROMPT, context, 6000);
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  return parsed.candidates || [];
}

export async function scoreResults(results, criteria) {
  if (!results.length) return [];
  const batches = [];
  for (let i = 0; i < results.length; i += SCORE_BATCH_SIZE) {
    batches.push(results.slice(i, i + SCORE_BATCH_SIZE));
  }
  const batchResults = await Promise.all(batches.map((b) => scoreBatch(b, criteria)));
  const merged = batchResults.flat();
  return merged.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
}

// Local resumes are full CVs, not thin search snippets, so this gets its own
// prompt (richer context = more confident scoring) rather than reusing
// SCORE_PROMPT. Files never leave this one request unstored — no DB write,
// no Storage upload — matching the "read only for this search" promise
// shown in the UI.
const LOCAL_SCORE_PROMPT = `You're helping a recruiter check local resume files against a target role.
For each resume (full text), extract what you can and score how well it matches the target role's
skills/location/experience. Full resumes give you much more to go on than a search snippet — score
accordingly (a clear skills match should score high, not just "found some evidence"). Resumes often
state qualification and sometimes current CTC/notice period — extract them when actually present in
the text, leave null rather than guessing when they're not.

Also include a one-sentence "match_reason" for every resume — the specific, concrete reason for
the score, grounded in what the resume actually says.

Respond as JSON only: { "candidates": [
  { "name": string or null, "designation": string or null, "company": string or null,
    "location": string or null, "match_score": integer 0-100, "match_reason": string,
    "qualification": string or null, "current_ctc": string or null, "expected_ctc": string or null,
    "notice_period": string or null }
] } — one entry per resume, same order as given.`;

export async function scoreLocalFiles(files, criteria) {
  if (!files.length) return [];
  const context = `Target company: ${criteria.company || 'not specified'}
Target role: ${criteria.roleTitle || 'not specified'}
Target skills: ${(criteria.skills || []).join(', ') || 'not specified'}
Target location: ${criteria.location || 'not specified'}

--- Resumes ---
${files.map((f, i) => `${i + 1}. File: ${f.name}\n${(f.text || '').slice(0, 4000)}`).join('\n\n---\n\n')}`;

  const raw = await askClaude(LOCAL_SCORE_PROMPT, context, 2500);
  const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  const candidates = parsed.candidates || [];
  return files.map((f, i) => ({
    name: candidates[i]?.name || null,
    designation: candidates[i]?.designation || null,
    company: candidates[i]?.company || null,
    location: candidates[i]?.location || null,
    match_score: candidates[i]?.match_score ?? null,
    match_reason: candidates[i]?.match_reason || null,
    profile_url: null,
    source: 'local',
    file_name: f.name,
    qualification: candidates[i]?.qualification || null,
    current_ctc: candidates[i]?.current_ctc || null,
    expected_ctc: candidates[i]?.expected_ctc || null,
    notice_period: candidates[i]?.notice_period || null,
  })).sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
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

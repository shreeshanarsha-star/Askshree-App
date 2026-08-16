import { NextResponse } from 'next/server';

// Multi-page SerpApi fetch + batched Claude scoring for large result sets
// can run past the default serverless timeout -- ask for more budget where
// the hosting plan allows it (Vercel silently caps this at the plan's own
// ceiling if lower, so this is a safe no-op on plans that don't allow 60s).
export const maxDuration = 60;
import { getClientIp, logToolRun } from '../../../../../lib/gating';
import { checkAndRecordSmartSourceUsage } from '../../../../../lib/smartSourceGating';
import { extractSearchCriteria, buildSearchQuery, searchSerpApiWithFallback, scoreResults, findCachedSearch, enrichTopCandidates } from '../../../../../lib/smartSource';
import { extractText } from '../../../../../lib/extractText';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { requireSiteKey } from '../../../../../lib/siteAuth';
import { getAuthedUser } from '../../../../../lib/authedUser';

export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const user = await getAuthedUser(req);
  const ip = getClientIp(req);
  const gate = await checkAndRecordSmartSourceUsage(ip, user?.id);
  if (!gate.allowed) {
    return NextResponse.json({ locked: true, message: gate.message }, { status: 402 });
  }
  await logToolRun(ip, 'smart_source_ai');

  const { mode, jobDescription, jdFile, skills, booleanQuery, location } = await req.json();

  let criteria;
  if (mode === 'manual') {
    if (!Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json({ error: 'Add at least one skill.' }, { status: 400 });
    }
    criteria = { roleTitle: null, skills, location: location || null };
  } else {
    let jdText = jobDescription;
    if (jdFile?.base64) {
      try {
        jdText = await extractText(jdFile.base64, jdFile.mimeType);
      } catch (e) {
        return NextResponse.json({ error: 'Could not read that file. Try a different PDF/Word file, or paste the text instead.' }, { status: 400 });
      }
    }
    if (!jdText || jdText.trim().length < 20) {
      return NextResponse.json({ error: 'Paste a job description or role summary first.' }, { status: 400 });
    }
    try {
      const extracted = await extractSearchCriteria(jdText);
      criteria = { roleTitle: extracted.role_title, skills: extracted.skills || [], location: location || extracted.location };
    } catch (e) {
      return NextResponse.json({ error: 'Could not read that job description. Try rephrasing it.' }, { status: 400 });
    }
  }

  const queryText = buildSearchQuery({ skills: criteria.skills, location: criteria.location, roleTitle: criteria.roleTitle, booleanQuery });

  // Don't spend a Serper call on a search someone already ran recently.
  const cached = await findCachedSearch(queryText);
  if (cached) {
    return NextResponse.json({ ok: true, cached: true, searchId: cached.searchId, candidates: cached.candidates });
  }

  const searchResult = await searchSerpApiWithFallback(criteria, queryText);
  if (!searchResult.ok) {
    return NextResponse.json({
      error: searchResult.reason === 'no_serpapi_key_configured'
        ? 'Search isn’t configured yet — ask the site owner to add a SerpApi key.'
        : 'The search failed. Try again in a moment.',
    }, { status: 503 });
  }
  if (searchResult.results.length === 0) {
    return NextResponse.json({
      ok: true, cached: false, searchId: null, candidates: [],
      note: 'no_linkedin_profiles_found',
    });
  }

  let scored = [];
  let scoreErr = null;
  try {
    scored = await scoreResults(searchResult.results, criteria);
  } catch (e) {
    scoreErr = String(e && e.message || e);
    scored = [];
  }
  if (scoreErr) {
    return NextResponse.json({
      error: 'Could not score the results. Try again in a moment.',
    }, { status: 503 });
  }

  // SignalHire enrichment (Phase 2): real skills/experience/education for the
  // top-scored candidates, at no contact-credit cost. No-ops silently if not
  // configured/enabled -- results are identical to before if this fails.
  const enrichment = await enrichTopCandidates(scored);

  const db = supabaseAdmin();
  const { data: search, error: searchErr } = await db
    .from('smart_source_searches')
    .insert({
      ip_address: ip,
      job_description: queryText,
      extracted_skills: criteria.skills,
      location_filter: criteria.location,
      status: 'completed',
    })
    .select()
    .single();
  if (searchErr) return NextResponse.json({ error: searchErr.message }, { status: 500 });

  const rows = scored
    .filter((c) => c.profile_url)
    .map((c) => {
      const e = enrichment.get(c.profile_url);
      return {
        search_id: search.id,
        name: c.name,
        company: c.company,
        designation: c.designation,
        location: c.location,
        profile_url: c.profile_url,
        match_score: c.match_score,
        match_reason: c.match_reason || null,
        source: 'linkedin',
        // Persisted immediately (Phase 5) so a later cached search, or a
        // later fresh search that resurfaces the same profile, doesn't
        // re-spend SignalHire quota re-fetching what we already have.
        signalhire_skills: e?.verified_skills || null,
        signalhire_experience_years: e?.experience_years ?? null,
        signalhire_industry: e?.current_company_industry || null,
        signalhire_company_size: e?.current_company_size || null,
        signalhire_education: e?.education_summary || null,
        signalhire_headline: e?.headline || null,
      };
    });

  let candidates = [];
  if (rows.length) {
    const { data: inserted } = await db.from('smart_source_candidates').insert(rows).select();
    candidates = inserted || [];
  }
  candidates = candidates.map((c) => ({
    ...c,
    signalhire: (c.signalhire_skills?.length || c.signalhire_experience_years != null || c.signalhire_industry || c.signalhire_company_size)
      ? {
          verified_skills: c.signalhire_skills || [],
          experience_years: c.signalhire_experience_years,
          current_company_industry: c.signalhire_industry,
          current_company_size: c.signalhire_company_size,
        }
      : null,
  }));

  return NextResponse.json({ ok: true, cached: false, searchId: search.id, candidates });
}

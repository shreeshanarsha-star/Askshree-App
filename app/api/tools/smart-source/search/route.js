import { NextResponse } from 'next/server';
import { getClientIp, logToolRun } from '../../../../../lib/gating';
import { checkAndRecordSmartSourceUsage } from '../../../../../lib/smartSourceGating';
import { extractSearchCriteria, buildSearchQuery, searchSerper, scoreResults, findCachedSearch } from '../../../../../lib/smartSource';
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

  const { mode, jobDescription, skills, booleanQuery, location } = await req.json();

  let criteria;
  if (mode === 'manual') {
    if (!Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json({ error: 'Add at least one skill.' }, { status: 400 });
    }
    criteria = { roleTitle: null, skills, location: location || null };
  } else {
    if (!jobDescription || jobDescription.trim().length < 20) {
      return NextResponse.json({ error: 'Paste a job description or role summary first.' }, { status: 400 });
    }
    try {
      const extracted = await extractSearchCriteria(jobDescription);
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

  const searchResult = await searchSerper(queryText);
  if (!searchResult.ok) {
    return NextResponse.json({
      error: searchResult.reason === 'no_serper_key_configured'
        ? 'Search isn’t configured yet — ask the site owner to add a Serper API key.'
        : 'The search failed. Try again in a moment.',
    }, { status: 503 });
  }

  let scored = [];
  try {
    scored = await scoreResults(searchResult.results, criteria);
  } catch (e) {
    scored = [];
  }

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
    .map((c) => ({
      search_id: search.id,
      name: c.name,
      company: c.company,
      designation: c.designation,
      location: c.location,
      profile_url: c.profile_url,
      match_score: c.match_score,
      source: 'linkedin',
    }));

  let candidates = [];
  if (rows.length) {
    const { data: inserted } = await db.from('smart_source_candidates').insert(rows).select();
    candidates = inserted || [];
  }

  return NextResponse.json({ ok: true, cached: false, searchId: search.id, candidates });
}

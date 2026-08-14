import { NextResponse } from 'next/server';
import { getClientIp, logToolRun } from '../../../../../lib/gating';
import { checkAndRecordSmartHuntUsage } from '../../../../../lib/smartHuntGating';
import { buildSearchQuery, searchSerpApiWithFallback, scoreResults } from '../../../../../lib/smartSource';
import { requireSiteKey } from '../../../../../lib/siteAuth';
import { getAuthedUser } from '../../../../../lib/authedUser';

// Smart Hunt.ai — original spec: manual X-ray search across public candidate
// data only. Keywords/location/company in, AI builds the search, scores
// what comes back. No JD upload, no database merge, no local files — that
// scope creep got stripped back out; Smart Source.ai is the JD-driven tool.
export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const user = await getAuthedUser(req);
  const ip = getClientIp(req);
  const gate = await checkAndRecordSmartHuntUsage(ip, user?.id);
  if (!gate.allowed) {
    return NextResponse.json({ locked: true, message: gate.message }, { status: 402 });
  }
  await logToolRun(ip, 'smart_hunt_ai');

  const { skills, booleanQuery, location, company } = await req.json();

  if (!Array.isArray(skills) || skills.length === 0) {
    return NextResponse.json({ error: 'Add at least one keyword.' }, { status: 400 });
  }

  const criteria = { roleTitle: null, skills, location: location || null, company: company || null };

  try {
    const queryText = buildSearchQuery({ skills, location, roleTitle: null, booleanQuery, company });
    const searchResult = await searchSerpApiWithFallback(criteria, queryText);
    if (!searchResult.ok || searchResult.results.length === 0) {
      return NextResponse.json({ ok: true, candidates: [], status: gate.status });
    }
    const scored = await scoreResults(searchResult.results, criteria);
    const candidates = scored
      .filter((c) => c.profile_url && c.match_score != null)
      .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    return NextResponse.json({ ok: true, candidates, status: gate.status });
  } catch (e) {
    return NextResponse.json({ error: 'Could not complete that search. Try again in a moment.' }, { status: 500 });
  }
}

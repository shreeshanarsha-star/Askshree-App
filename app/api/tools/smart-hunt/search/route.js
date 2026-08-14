import { NextResponse } from 'next/server';
import { getClientIp, logToolRun } from '../../../../../lib/gating';
import { checkAndRecordSmartHuntUsage } from '../../../../../lib/smartHuntGating';
import { buildSearchQuery, searchSerpApiWithFallback, scoreResults } from '../../../../../lib/smartSource';
import { requireSiteKey } from '../../../../../lib/siteAuth';
import { getAuthedUser } from '../../../../../lib/authedUser';

// Smart Hunt.ai — manual X-ray search across public candidate data only.
// Fixed field order per the finalized spec: Company first (the primary
// filter — search from the company, then narrow with everything else),
// then Role, Location, Skills, and free-text Keywords last. No JD upload,
// no database merge, no local files — that's Smart Source.ai's job.
export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const user = await getAuthedUser(req);
  const ip = getClientIp(req);
  const gate = await checkAndRecordSmartHuntUsage(ip, user?.id);
  if (!gate.allowed) {
    return NextResponse.json({ locked: true, message: gate.message }, { status: 402 });
  }
  await logToolRun(ip, 'smart_hunt_ai');

  const { company, role, location, skills, keywords } = await req.json();
  const skillList = Array.isArray(skills) ? skills : [];

  if (!company && !role && !location && skillList.length === 0 && !keywords) {
    return NextResponse.json({ error: 'Give at least one field to search on.' }, { status: 400 });
  }

  const criteria = {
    company: company || null,
    roleTitle: role || null,
    location: location || null,
    skills: skillList,
    keywords: keywords || null,
  };

  try {
    const queryText = buildSearchQuery(criteria);
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

import { NextResponse } from 'next/server';
import { getClientIp, logToolRun } from '../../../../../lib/gating';
import { checkAndRecordSmartHuntUsage } from '../../../../../lib/smartHuntGating';
import { extractSearchCriteria, buildSearchQuery, searchSerpApiWithFallback, scoreResults, scoreLocalFiles } from '../../../../../lib/smartSource';
import { searchInternalDatabase } from '../../../../../lib/smartHunt';
import { extractText } from '../../../../../lib/extractText';
import { requireSiteKey } from '../../../../../lib/siteAuth';
import { getAuthedUser } from '../../../../../lib/authedUser';

const MAX_LOCAL_FILES = 25;

// Smart Hunt.ai — the consolidated version of Smart Source.ai: one JD drop
// or keyword search fans out across three sources at once — public LinkedIn
// profiles (SerpApi X-ray search), candidates already in our own database
// (from past Smart Screen.ai / Apply.ai activity), and, if the recruiter
// explicitly grants folder access, local resume files on their own machine.
// Local files are read only for this one request — never uploaded to
// storage or written to any table, matching the "read only for this
// search" promise shown in the UI.
export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const user = await getAuthedUser(req);
  const ip = getClientIp(req);
  const gate = await checkAndRecordSmartHuntUsage(ip, user?.id);
  if (!gate.allowed) {
    return NextResponse.json({ locked: true, message: gate.message }, { status: 402 });
  }
  await logToolRun(ip, 'smart_hunt_ai');

  const { mode, jobDescription, jdFile, skills, booleanQuery, location, localFiles } = await req.json();

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

  const results = [];

  // Source 1: public LinkedIn profiles.
  try {
    const queryText = buildSearchQuery({ skills: criteria.skills, location: criteria.location, roleTitle: criteria.roleTitle, booleanQuery });
    const searchResult = await searchSerpApiWithFallback(criteria, queryText);
    if (searchResult.ok && searchResult.results.length > 0) {
      const scored = await scoreResults(searchResult.results, criteria);
      scored.filter((c) => c.profile_url).forEach((c) => results.push({ ...c, source: 'linkedin' }));
    }
  } catch (e) {
    // A failed LinkedIn pass shouldn't block database/local results.
  }

  // Source 2: candidates already in our own database.
  try {
    const dbMatches = await searchInternalDatabase(criteria);
    results.push(...dbMatches);
  } catch (e) {
    // Non-critical — continue without database matches.
  }

  // Source 3: local files, only if the recruiter picked a folder client-side.
  if (Array.isArray(localFiles) && localFiles.length > 0) {
    try {
      const batch = localFiles.slice(0, MAX_LOCAL_FILES);
      const extracted = [];
      for (const f of batch) {
        try {
          const text = await extractText(f.base64, f.mimeType);
          if (text && text.trim().length > 20) extracted.push({ name: f.name, text });
        } catch (e) {
          continue; // one bad local file shouldn't fail the batch
        }
      }
      const localScored = await scoreLocalFiles(extracted, criteria);
      results.push(...localScored);
    } catch (e) {
      // Non-critical — continue without local results.
    }
  }

  const candidates = results
    .filter((c) => c.match_score != null)
    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

  return NextResponse.json({ ok: true, candidates, status: gate.status });
}

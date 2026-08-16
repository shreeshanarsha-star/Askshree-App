import { NextResponse } from 'next/server';
import { revealContact } from '../../../../../lib/contactEnrich';
import { requireSiteKey } from '../../../../../lib/siteAuth';
import { getCachedContact, persistContact } from '../../../../../lib/contactCache';

// Contact reveal is a lookup against a paid enrichment provider, not part
// of the free-use search gate — no usage counter here, just the site key.
//
// Phase 5: checks smart_source_candidates for a contact we already paid to
// reveal for this exact LinkedIn profile before spending a fresh SignalHire
// credit — a candidate that resurfaces in a later search is free to reveal
// again.
export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const { name, company, profileUrl } = await req.json();
  if (!name) {
    return NextResponse.json({ ok: false, message: 'Missing candidate name.' }, { status: 400 });
  }

  if (profileUrl) {
    const cached = await getCachedContact(profileUrl);
    if (cached) return NextResponse.json(cached);
  }

  const result = await revealContact({ name, company, profileUrl });
  if (result.ok && profileUrl) await persistContact(profileUrl, result);
  return NextResponse.json(result);
}

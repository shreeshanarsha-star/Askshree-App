import { NextResponse } from 'next/server';
import { revealContact } from '../../../../../lib/contactEnrich';
import { requireSiteKey } from '../../../../../lib/siteAuth';
import { getCachedContact, persistContact, getMonthlyRevealCount, logReveal, MONTHLY_REVEAL_CAP, CAP_MESSAGE } from '../../../../../lib/contactCache';

// Contact reveal is a lookup against a paid enrichment provider, not part
// of the free-use search gate — no per-user usage counter here, just the
// site key. It does carry a site-wide monthly cap (below) since every fresh
// reveal spends a real SignalHire credit.
//
// Phase 5: checks smart_source_candidates for a contact we already paid to
// reveal for this exact LinkedIn profile before spending a fresh SignalHire
// credit — a candidate that resurfaces in a later search is free to reveal
// again, and free reveals never count against the monthly cap below.
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

  // Only fresh (uncached) reveals draw against the monthly cap.
  const usedThisMonth = await getMonthlyRevealCount();
  if (usedThisMonth >= MONTHLY_REVEAL_CAP) {
    return NextResponse.json({ ok: false, reason: 'monthly_cap_reached', message: CAP_MESSAGE });
  }

  const result = await revealContact({ name, company, profileUrl });
  if (result.ok && profileUrl) {
    await persistContact(profileUrl, result);
    await logReveal(profileUrl);
  }
  return NextResponse.json(result);
}

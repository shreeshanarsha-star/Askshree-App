import { NextResponse } from 'next/server';
import { revealContactsBatch } from '../../../../../lib/contactEnrich';
import { requireSiteKey } from '../../../../../lib/siteAuth';
import { getCachedContact, persistContact, getMonthlyRevealCount, logReveal, MONTHLY_REVEAL_CAP, CAP_MESSAGE } from '../../../../../lib/contactCache';

// Batched contact reveal for the "Reveal contact (N)" bulk action -- one
// SignalHire call for whichever candidates aren't already cached (Phase 5),
// instead of N sequential requests from the client. Respects the same
// site-wide monthly cap as the single reveal route: cached hits are free
// and unlimited, but only as many *fresh* reveals as remain under the cap
// get sent to SignalHire -- anything past that comes back capped instead
// of silently over-spending.
export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const { candidates } = await req.json();
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json({ ok: false, message: 'No candidates given.' }, { status: 400 });
  }

  const batch = candidates.slice(0, 100);
  const results = {};
  const uncached = [];

  for (const c of batch) {
    const cached = c.profileUrl ? await getCachedContact(c.profileUrl) : null;
    if (cached) results[c.profileUrl] = cached;
    else uncached.push(c);
  }

  if (uncached.length) {
    const usedThisMonth = await getMonthlyRevealCount();
    const remaining = Math.max(0, MONTHLY_REVEAL_CAP - usedThisMonth);
    const toReveal = uncached.slice(0, remaining);
    const capped = uncached.slice(remaining);

    for (const c of capped) {
      results[c.profileUrl || c.name] = { ok: false, reason: 'monthly_cap_reached', message: CAP_MESSAGE };
    }

    if (toReveal.length) {
      const fresh = await revealContactsBatch(toReveal);
      for (const [key, value] of fresh.entries()) {
        results[key] = value;
        if (value.ok && key) {
          await persistContact(key, value);
          await logReveal(key);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}

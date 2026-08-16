import { NextResponse } from 'next/server';
import { revealContactsBatch } from '../../../../../lib/contactEnrich';
import { requireSiteKey } from '../../../../../lib/siteAuth';
import { getCachedContact, persistContact } from '../../../../../lib/contactCache';

// Batched contact reveal for the "Reveal contact (N)" bulk action -- one
// SignalHire call for whichever candidates aren't already cached (Phase 5),
// instead of N sequential requests from the client.
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
    const fresh = await revealContactsBatch(uncached);
    for (const [key, value] of fresh.entries()) {
      results[key] = value;
      if (value.ok && key) await persistContact(key, value);
    }
  }

  return NextResponse.json({ ok: true, results });
}

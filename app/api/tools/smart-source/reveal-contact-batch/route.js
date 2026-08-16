import { NextResponse } from 'next/server';
import { revealContactsBatch } from '../../../../../lib/contactEnrich';
import { requireSiteKey } from '../../../../../lib/siteAuth';

// Batched contact reveal for the "Reveal contact (N)" bulk action -- one
// SignalHire call for up to 100 candidates instead of N sequential requests
// from the client. Same lookup logic as the single reveal-contact route,
// just fanned out server-side.
export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const { candidates } = await req.json();
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return NextResponse.json({ ok: false, message: 'No candidates given.' }, { status: 400 });
  }
  const resultMap = await revealContactsBatch(candidates.slice(0, 100));
  const results = {};
  for (const [key, value] of resultMap.entries()) results[key] = value;
  return NextResponse.json({ ok: true, results });
}

import { NextResponse } from 'next/server';
import { revealContact } from '../../../../../lib/contactEnrich';
import { requireSiteKey } from '../../../../../lib/siteAuth';

// Contact reveal is a lookup against a paid enrichment provider, not part
// of the free-use search gate — no usage counter here, just the site key.
export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const { name, company, profileUrl } = await req.json();
  if (!name) {
    return NextResponse.json({ ok: false, message: 'Missing candidate name.' }, { status: 400 });
  }
  const result = await revealContact({ name, company, profileUrl });
  return NextResponse.json(result);
}

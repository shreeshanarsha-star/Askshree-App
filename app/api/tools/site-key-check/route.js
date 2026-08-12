import { NextResponse } from 'next/server';
import { requireSiteKey } from '../../../../lib/siteAuth';

export async function GET(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { getClientIp } from '../../../../lib/gating';
import { requireSiteKey } from '../../../../lib/siteAuth';
import { getAuthedUser } from '../../../../lib/authedUser';
import { listSavedSearches, createSavedSearch } from '../../../../lib/savedSearches';

const VALID_TOOLS = ['smart_source', 'smart_hunt'];

export async function GET(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const user = await getAuthedUser(req);
  const ip = getClientIp(req);
  const { searchParams } = new URL(req.url);
  const tool = searchParams.get('tool');
  if (!VALID_TOOLS.includes(tool)) {
    return NextResponse.json({ ok: false, error: 'Invalid tool.' }, { status: 400 });
  }
  const searches = await listSavedSearches({ tool, userId: user?.id, ip });
  return NextResponse.json({ ok: true, searches });
}

export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const user = await getAuthedUser(req);
  const ip = getClientIp(req);
  const { tool, name, params } = await req.json();
  if (!VALID_TOOLS.includes(tool)) {
    return NextResponse.json({ ok: false, error: 'Invalid tool.' }, { status: 400 });
  }
  if (!name || !name.trim()) {
    return NextResponse.json({ ok: false, error: 'Give this search a name.' }, { status: 400 });
  }
  const search = await createSavedSearch({ tool, userId: user?.id, ip, name, params: params || {} });
  return NextResponse.json({ ok: true, search });
}

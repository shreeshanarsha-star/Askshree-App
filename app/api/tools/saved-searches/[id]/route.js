import { NextResponse } from 'next/server';
import { getClientIp } from '../../../../../lib/gating';
import { requireSiteKey } from '../../../../../lib/siteAuth';
import { getAuthedUser } from '../../../../../lib/authedUser';
import { deleteSavedSearch } from '../../../../../lib/savedSearches';

export async function DELETE(req, { params }) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const user = await getAuthedUser(req);
  const ip = getClientIp(req);
  await deleteSavedSearch({ id: params.id, userId: user?.id, ip });
  return NextResponse.json({ ok: true });
}

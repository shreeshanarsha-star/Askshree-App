import { NextResponse } from 'next/server';
import { getClientIp } from '../../../../../../../lib/gating';
import { requireSiteKey } from '../../../../../../../lib/siteAuth';
import { getAuthedUser } from '../../../../../../../lib/authedUser';
import { getProjectOwned, removeCandidateFromProject } from '../../../../../../../lib/projects';

export async function DELETE(req, { params }) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const user = await getAuthedUser(req);
  const ip = getClientIp(req);
  const project = await getProjectOwned({ projectId: params.id, userId: user?.id, ip });
  if (!project) {
    return NextResponse.json({ ok: false, error: 'Project not found.' }, { status: 404 });
  }
  await removeCandidateFromProject({ projectId: params.id, candidateId: params.candidateId });
  return NextResponse.json({ ok: true });
}

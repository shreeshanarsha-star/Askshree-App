import { NextResponse } from 'next/server';
import { getClientIp } from '../../../../../../../lib/gating';
import { requireSiteKey } from '../../../../../../../lib/siteAuth';
import { getAuthedUser } from '../../../../../../../lib/authedUser';
import { getProjectOwned, removeCandidateFromProject, updateProjectCandidate } from '../../../../../../../lib/projects';

const VALID_STATUSES = ['shortlisted', 'rejected', 'screen_later'];
const VALID_OUTREACH_STATUSES = ['new', 'contacted', 'responded', 'rejected'];

export async function PATCH(req, { params }) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const user = await getAuthedUser(req);
  const ip = getClientIp(req);
  const project = await getProjectOwned({ projectId: params.id, userId: user?.id, ip });
  if (!project) {
    return NextResponse.json({ ok: false, error: 'Project not found.' }, { status: 404 });
  }
  const body = await req.json();
  if ('status' in body && body.status !== null && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ ok: false, error: 'Invalid status.' }, { status: 400 });
  }
  if ('outreach_status' in body && body.outreach_status !== null && !VALID_OUTREACH_STATUSES.includes(body.outreach_status)) {
    return NextResponse.json({ ok: false, error: 'Invalid outreach status.' }, { status: 400 });
  }
  await updateProjectCandidate({ projectId: params.id, candidateId: params.candidateId, fields: body });
  return NextResponse.json({ ok: true });
}

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

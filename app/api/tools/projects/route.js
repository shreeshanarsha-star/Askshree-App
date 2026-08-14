import { NextResponse } from 'next/server';
import { getClientIp } from '../../../../lib/gating';
import { requireSiteKey } from '../../../../lib/siteAuth';
import { getAuthedUser } from '../../../../lib/authedUser';
import { listProjects, createProject } from '../../../../lib/projects';

export async function GET(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const user = await getAuthedUser(req);
  const ip = getClientIp(req);
  const projects = await listProjects({ userId: user?.id, ip });
  return NextResponse.json({ ok: true, projects });
}

export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const user = await getAuthedUser(req);
  const ip = getClientIp(req);
  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ ok: false, error: 'Give the project a name.' }, { status: 400 });
  }
  const project = await createProject({ userId: user?.id, ip, name });
  return NextResponse.json({ ok: true, project });
}

import { NextResponse } from 'next/server';
import { destroySession, SESSION_COOKIE } from '../../../../lib/gauriAuth';

export async function POST(req) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  await destroySession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { path: '/', expires: new Date(0) });
  return res;
}

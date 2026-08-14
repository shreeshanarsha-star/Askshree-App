import { NextResponse } from 'next/server';
import { verifyLogin, createSession, SESSION_COOKIE } from '../../../../lib/gauriAuth';

export async function POST(req) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ ok: false, error: 'Enter a username and password.' }, { status: 400 });
  }
  const account = await verifyLogin(username.trim(), password);
  if (!account) {
    return NextResponse.json({ ok: false, error: 'Incorrect username or password.' }, { status: 401 });
  }
  const { token, expiresAt } = await createSession(account.id);
  const res = NextResponse.json({ ok: true, account });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', expires: new Date(expiresAt),
  });
  return res;
}

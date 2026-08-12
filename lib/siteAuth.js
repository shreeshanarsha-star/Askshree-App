import { NextResponse } from 'next/server';

export const SITE_KEY = 'Cows@123#';

export function requireSiteKey(req) {
  const key = req.headers.get('x-site-key') || '';
  if (key !== SITE_KEY) {
    return NextResponse.json({ error: 'Incorrect key.' }, { status: 401 });
  }
  return null;
}

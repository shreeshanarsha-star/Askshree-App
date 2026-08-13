import { NextResponse } from 'next/server';

export const WRITINGS_KEY = '4332';

export function requireWritingsKey(req) {
  const key = req.headers.get('x-writings-key') || '';
  if (key !== WRITINGS_KEY) {
    return NextResponse.json({ error: 'Incorrect code.' }, { status: 401 });
  }
  return null;
}

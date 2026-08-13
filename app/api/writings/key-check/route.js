import { NextResponse } from 'next/server';
import { requireWritingsKey } from '../../../../lib/writingsAuth';

export async function GET(req) {
  const _denied = requireWritingsKey(req); if (_denied) return _denied;
  return NextResponse.json({ ok: true });
}

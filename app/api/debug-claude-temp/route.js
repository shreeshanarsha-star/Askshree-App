import { NextResponse } from 'next/server';
import { askClaude } from '../../../lib/anthropic';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reply = await askClaude('Reply with exactly: OK', 'ping', 20);
    return NextResponse.json({ ok: true, reply });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        name: e?.name,
        message: e?.message,
        status: e?.status,
        errorBody: e?.error,
        stack: (e?.stack || '').split('\n').slice(0, 5),
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { askClaude } from '../../../lib/anthropic';

// TEMPORARY diagnostic route -- not linked from any UI, no site-key gate
// (deliberately, so it can be hit directly to surface the raw Anthropic
// SDK error instead of the generic user-facing message every other route
// swallows it into). Delete after diagnosing the "AI calls failing"
// incident.
export async function GET() {
  try {
    const reply = await askClaude('Reply with exactly: OK', 'ping', 20);
    return NextResponse.json({ ok: true, reply });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      name: e?.name,
      message: e?.message,
      status: e?.status,
      errorBody: e?.error,
      stack: (e?.stack || '').split('\n').slice(0, 5),
    }, { status: 500 });
  }
}

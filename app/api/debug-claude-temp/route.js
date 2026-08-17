import { askClaude } from '../../../lib/anthropic';

export const dynamic = 'force-dynamic';

// Returns plain text (not NextResponse.json) so it renders as an ordinary
// page in the browser instead of triggering Chrome's built-in JSON viewer,
// which runs in a context that automation tooling can't read from.
export async function GET() {
  try {
    const reply = await askClaude('Reply with exactly: OK', 'ping', 20);
    return new Response('OK_TRUE\n' + JSON.stringify({ ok: true, reply }), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (e) {
    const body = {
      ok: false,
      name: e?.name,
      message: e?.message,
      status: e?.status,
      errorBody: e?.error,
      stack: (e?.stack || '').split('\n').slice(0, 5),
    };
    return new Response('OK_FALSE\n' + JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

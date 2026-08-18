import { Communicate } from 'edge-tts-universal';

export const dynamic = 'force-dynamic';

// Temporary diagnostic route -- verifies the free Edge TTS path actually
// works from Vercel's real network (the dev sandbox's outbound allowlist
// blocks the WebSocket handshake, so this can only be confirmed live).
export async function GET() {
  const voice = process.env.EDGE_TTS_VOICE || 'en-US-ChristopherNeural';
  try {
    const communicate = new Communicate('Yes Boss.', { voice });
    const chunks = [];
    for await (const chunk of communicate.stream()) {
      if (chunk.type === 'audio' && chunk.data) chunks.push(chunk.data);
    }
    const buf = Buffer.concat(chunks);
    return new Response(`voice=${voice}\nOK true\naudio_bytes=${buf.length}`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (e) {
    return new Response(`voice=${voice}\nERROR\n${e?.message || e}\n${(e?.stack || '').slice(0, 500)}`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

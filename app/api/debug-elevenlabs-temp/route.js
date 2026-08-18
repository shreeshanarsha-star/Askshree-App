export const dynamic = 'force-dynamic';

// Temporary diagnostic route -- checks whether the new default voice
// (Declan Sage, kqVT88a5QfII1HNAEPTJ) actually works on this account's
// current plan before trusting it in production.
export async function GET() {
  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'kqVT88a5QfII1HNAEPTJ';

  if (!key) {
    return new Response('NOT_CONFIGURED', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text: 'Yes Boss.',
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      return new Response(`voiceId=${voiceId}\nupstream_status=${res.status}\nupstream_body=${msg.slice(0, 800)}`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    const buf = await res.arrayBuffer();
    return new Response(`voiceId=${voiceId}\nOK true\naudio_bytes=${buf.byteLength}`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (e) {
    return new Response(`voiceId=${voiceId}\nNETWORK_ERROR\n${e?.message || e}`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

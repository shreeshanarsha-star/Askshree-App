export const dynamic = 'force-dynamic';

// Temporary diagnostic route -- same pattern used earlier to prove the
// Anthropic/NVIDIA billing issue instead of guessing. Reports whether
// ELEVENLABS_API_KEY is actually configured in this deployment and, if so,
// what a real TTS call returns, without exposing the key or the audio.
export async function GET() {
  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

  if (!key) {
    return new Response('NOT_CONFIGURED\nELEVENLABS_API_KEY is not set in this environment.', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: 'Hi Boss.',
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      return new Response(
        `KEY_PRESENT\nvoiceId=${voiceId}\nupstream_status=${res.status}\nupstream_body=${msg.slice(0, 800)}`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }
    const buf = await res.arrayBuffer();
    return new Response(
      `KEY_PRESENT\nvoiceId=${voiceId}\nOK true\naudio_bytes=${buf.byteLength}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  } catch (e) {
    return new Response(`KEY_PRESENT\nvoiceId=${voiceId}\nNETWORK_ERROR\n${e?.message || e}`, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

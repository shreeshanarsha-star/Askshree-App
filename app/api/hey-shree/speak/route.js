import { NextResponse } from 'next/server';

// "Rachel" -- ElevenLabs' clear, professional, general-purpose premade
// voice. Overridable via ELEVENLABS_VOICE_ID once the site owner picks (or
// clones) a different one in their ElevenLabs account, with no code change.
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

// Server-side only, same reason as the news route: keeps the API key out
// of client JS, and ElevenLabs' key isn't meant to be a public/browser key.
export async function POST(req) {
  const { text } = await req.json().catch(() => ({}));
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || !text || !text.trim()) {
    // 501 (not the generic 500) so the client can tell "not configured /
    // nothing to say" apart from a real upstream failure and fall back to
    // the free browser voice silently, without treating it as an error.
    return NextResponse.json({ error: 'not_configured' }, { status: 501 });
  }
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        // ElevenLabs bills per character -- Hey Shree's replies are short
        // spoken sentences already, but cap defensively in case something
        // upstream ever hands this a much longer string.
        text: text.slice(0, 2000),
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      return NextResponse.json({ error: msg || 'elevenlabs_error' }, { status: 502 });
    }
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return NextResponse.json({ error: 'network_error' }, { status: 502 });
  }
}

import { NextResponse } from 'next/server';
import { Communicate } from 'edge-tts-universal';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// PRIMARY: Microsoft Edge's own neural TTS service, used via the
// edge-tts-universal npm package -- no API key, no account, no card, no
// signup. It's the same voice engine behind Edge's "Read Aloud" feature,
// exposed through a stable (if unofficial) WebSocket protocol. Quality is
// genuinely good neural TTS, not the robotic browser fallback.
//
// "Christopher" is a deep, confident male voice -- picked as the closest
// free match to "Declan Sage" (the ElevenLabs voice originally chosen),
// after discovering ElevenLabs' free tier blocks ALL Voice Library voices
// AND newly-created personal voice clones via the API alike. Overridable
// via EDGE_TTS_VOICE with no code change -- e.g. 'en-US-GuyNeural',
// 'en-GB-RyanNeural', 'en-IN-PrabhatNeural', etc.
const DEFAULT_EDGE_VOICE = 'en-US-ChristopherNeural';

// SECONDARY (kept, not required): if ElevenLabs is ever upgraded to a paid
// plan, or a personal clone turns out to work after all, this still runs
// as a second attempt before giving up and letting the client fall back to
// the browser's built-in voice (speakBrowser in HeyShreeReactor.js).
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'kqVT88a5QfII1HNAEPTJ';

async function synthesizeEdgeTTS(text) {
  const voice = process.env.EDGE_TTS_VOICE || DEFAULT_EDGE_VOICE;
  const communicate = new Communicate(text, { voice });
  const chunks = [];
  for await (const chunk of communicate.stream()) {
    if (chunk.type === 'audio' && chunk.data) chunks.push(chunk.data);
  }
  if (!chunks.length) throw new Error('edge_tts_empty_response');
  return Buffer.concat(chunks);
}

async function synthesizeElevenLabs(text) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('elevenlabs_not_configured');
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || 'elevenlabs_error');
  }
  return Buffer.from(await res.arrayBuffer());
}

// Server-side only, same reason as the news route: keeps any keys out of
// client JS, and lets both TTS backends be swapped without a client change.
export async function POST(req) {
  const { text } = await req.json().catch(() => ({}));
  if (!text || !text.trim()) {
    // 501 (not the generic 500) so the client can tell "nothing to say"
    // apart from a real upstream failure and fall back to the free
    // browser voice silently, without treating it as an error.
    return NextResponse.json({ error: 'not_configured' }, { status: 501 });
  }
  // Both backends bill/rate-limit by character count -- cap defensively in
  // case something upstream ever hands this a much longer string, even
  // though Hey Shree's replies are short spoken sentences already.
  const clean = text.slice(0, 2000);

  try {
    const buf = await synthesizeEdgeTTS(clean);
    return new NextResponse(buf, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch (edgeErr) {
    try {
      const buf = await synthesizeElevenLabs(clean);
      return new NextResponse(buf, {
        headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
      });
    } catch (elErr) {
      return NextResponse.json(
        { error: 'tts_unavailable', edge: String(edgeErr?.message || edgeErr), elevenlabs: String(elErr?.message || elErr) },
        { status: 502 }
      );
    }
  }
}

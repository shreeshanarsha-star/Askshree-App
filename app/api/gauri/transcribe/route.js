import { NextResponse } from 'next/server';
import { transcribeAudio } from '../../../../lib/gauriTranscribe';

// Public — farmers have no account, so this can't be gated by login. Reuses
// the same Groq/OpenAI Whisper transcription already built for the
// recruiter-facing Gauri.ai voice assistant.
export async function POST(req) {
  const { audioFile } = await req.json();
  if (!audioFile?.base64) {
    return NextResponse.json({ error: 'No audio provided.' }, { status: 400 });
  }
  const result = await transcribeAudio(audioFile.base64, audioFile.mimeType);
  if (!result.ok) {
    return NextResponse.json({
      error: result.reason === 'no_stt_configured'
        ? 'Voice input isn’t set up yet — please type your answer instead.'
        : 'Could not transcribe that recording. Try again, or type instead.',
    }, { status: 503 });
  }
  return NextResponse.json({ ok: true, transcript: result.text });
}

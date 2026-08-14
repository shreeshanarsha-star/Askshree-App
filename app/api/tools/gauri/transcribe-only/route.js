import { NextResponse } from 'next/server';
import { transcribeAudio } from '../../../../../lib/gauriTranscribe';
import { requireSiteKey } from '../../../../../lib/siteAuth';

// Transcription only, no assistant call — used by the "Record voice" button
// to fill the request textarea so the recruiter can review/edit before
// actually submitting. Doesn't touch the Gauri.ai free-use gate; that's
// charged on the real /analyze call, not on filling in a text box.
export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const { audioFile } = await req.json();
  if (!audioFile?.base64) {
    return NextResponse.json({ error: 'No audio provided.' }, { status: 400 });
  }
  const result = await transcribeAudio(audioFile.base64, audioFile.mimeType);
  if (!result.ok) {
    return NextResponse.json({
      error: result.reason === 'no_stt_configured'
        ? 'Audio transcription isn’t configured yet — ask the site owner to add a Groq or OpenAI API key. Try the live speech button instead, or type your request.'
        : 'Could not transcribe that recording. Try again, or type your request.',
    }, { status: 503 });
  }
  return NextResponse.json({ ok: true, transcript: result.text });
}

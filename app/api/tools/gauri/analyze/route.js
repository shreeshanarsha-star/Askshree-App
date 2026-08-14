import { NextResponse } from 'next/server';
import { getClientIp, logToolRun } from '../../../../../lib/gating';
import { checkAndRecordGauriUsage } from '../../../../../lib/gauriGating';
import { transcribeAudio } from '../../../../../lib/gauriTranscribe';
import { runGauriAssistant } from '../../../../../lib/gauriAssistant';
import { extractText } from '../../../../../lib/extractText';
import { requireSiteKey } from '../../../../../lib/siteAuth';
import { getAuthedUser } from '../../../../../lib/authedUser';

// Gauri.ai — one request, two possible sources of grounding (an uploaded
// file and/or live web search), and an open-ended "do whatever's asked"
// assistant on top. Input can be: an uploaded audio/video clip (transcribed
// server-side via Groq/OpenAI Whisper), a live-recorded clip from the
// browser, or plain typed text (including text the browser's own Web Speech
// API already transcribed client-side, which needs no server transcription
// at all).
export async function POST(req) {
  const _denied = requireSiteKey(req); if (_denied) return _denied;
  const user = await getAuthedUser(req);
  const ip = getClientIp(req);
  const gate = await checkAndRecordGauriUsage(ip, user?.id);
  if (!gate.allowed) {
    return NextResponse.json({ locked: true, message: gate.message }, { status: 402 });
  }

  const { audioFile, prompt, referenceFile, useWebSearch } = await req.json();

  let query = (prompt || '').trim();

  if (audioFile?.base64) {
    const transcribed = await transcribeAudio(audioFile.base64, audioFile.mimeType);
    if (!transcribed.ok) {
      return NextResponse.json({
        error: transcribed.reason === 'no_stt_configured'
          ? 'Audio transcription isn’t configured yet — ask the site owner to add a Groq or OpenAI API key. In the meantime, use live browser recording or type your request.'
          : 'Could not transcribe that audio. Try a different file, or type your request.',
      }, { status: 503 });
    }
    query = transcribed.text.trim();
  }

  if (!query) {
    return NextResponse.json({ error: 'Record, upload audio, or type a request first.' }, { status: 400 });
  }

  let referenceText = null;
  if (referenceFile?.base64) {
    try {
      referenceText = await extractText(referenceFile.base64, referenceFile.mimeType);
    } catch (e) {
      return NextResponse.json({ error: 'Could not read that reference file. Try a different PDF/Word file.' }, { status: 400 });
    }
  }

  let answer;
  try {
    answer = await runGauriAssistant({ query, referenceText, useWebSearch: useWebSearch !== false });
  } catch (e) {
    return NextResponse.json({ error: 'Could not process that request. Try again in a moment.' }, { status: 500 });
  }

  await logToolRun(ip, 'gauri_ai');

  return NextResponse.json({ ok: true, transcript: query, answer, status: gate.status });
}

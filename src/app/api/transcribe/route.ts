import { NextRequest, NextResponse } from 'next/server';
import { transcribe } from 'ai';
import { requireSession } from '@/lib/auth/guard';

export const dynamic = 'force-dynamic';

// A dictated note is seconds to a couple of minutes of audio. Anything larger
// is a mistake or abuse, so refuse it before it is read into memory.
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

// Latvian is requested explicitly: without it the model guesses the language
// per clip and short medical phrases come back in the wrong language.
const LANGUAGE = 'lv';

/**
 * Speech-to-text for the voice-dictation button. Audio is received, sent to
 * the transcription model, and discarded — it is never written to the DB or
 * the filesystem. Only the text goes back to the client.
 */
export async function POST(request: NextRequest) {
  const denied = await requireSession();
  if (denied) return denied;

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Audio too large' }, { status: 413 });
  }

  try {
    const form = await request.formData();
    const file = form.get('audio');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'audio is required' }, { status: 400 });
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio too large' }, { status: 413 });
    }

    const { text } = await transcribe({
      model: 'openai/gpt-4o-transcribe',
      audio: new Uint8Array(await file.arrayBuffer()),
      providerOptions: { openai: { language: LANGUAGE } },
    });

    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    console.error('POST /api/transcribe error:', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
  }
}

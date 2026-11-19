'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Receives the transcript; the caller decides where it goes. */
  onTranscript: (text: string) => void;
  disabled?: boolean;
  /** Shown as the tooltip, e.g. which field the text will land in. */
  title?: string;
}

type State = 'idle' | 'recording' | 'transcribing' | 'error';

const MAX_RECORD_MS = 3 * 60 * 1000;

/**
 * Press once to start dictating, press again to stop. The clip is sent to
 * /api/transcribe and the Latvian transcript is handed back. Nothing is kept
 * on the device after the upload.
 */
export default function VoiceButton({ onTranscript, disabled = false, title }: Props) {
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const releaseMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Never leave the microphone open if the doctor navigates away mid-recording.
  useEffect(() => {
    return () => {
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      releaseMic();
    };
  }, []);

  const fail = (msg: string) => {
    releaseMic();
    setMessage(msg);
    setState('error');
  };

  const upload = async (blob: Blob) => {
    setState('transcribing');
    try {
      const form = new FormData();
      form.append('audio', blob, 'dictation.webm');
      const res = await fetch('/api/transcribe', { method: 'POST', body: form });
      if (!res.ok) throw new Error(String(res.status));
      const data: { text?: string } = await res.json();
      const text = (data.text ?? '').trim();
      if (!text) {
        fail('Nekas nav atpazīts');
        return;
      }
      onTranscript(text);
      setState('idle');
    } catch {
      fail('Neizdevās transkribēt');
    }
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      fail('Ierīce neatbalsta balss ierakstu');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      fail('Nav piekļuves mikrofonam');
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      releaseMic();
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      chunksRef.current = [];
      upload(blob);
    };
    recorder.start();
    setMessage('');
    setState('recording');
    autoStopRef.current = setTimeout(() => stop(), MAX_RECORD_MS);
  };

  const stop = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const onClick = () => {
    if (state === 'recording') stop();
    else if (state !== 'transcribing') start();
  };

  const label =
    state === 'recording'
      ? 'Apturēt'
      : state === 'transcribing'
        ? 'Transkribē...'
        : 'Diktēt';

  const busy = state === 'transcribing';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        title={title ?? 'Diktēt latviešu valodā'}
        className={`px-3 py-2 text-sm rounded-lg transition disabled:opacity-50 ${
          state === 'recording'
            ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        🎙 {label}
      </button>
      {state === 'error' && <span className="text-xs text-red-500">⚠ {message}</span>}
    </div>
  );
}

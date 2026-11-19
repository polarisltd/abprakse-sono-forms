# Voice dictation into forms (Latvian)

## Context

Doctors fill F00x forms and T-documents by typing. The request: the doctor opens a form, presses a voice button, speaks in Latvian, and the transcript is inserted into the form. Nothing in the repo does speech today: no speech API, no AI SDK, no recording code.

## Findings

- Typed fields are plain `<input>`/`<textarea>` in `src/components/FormRenderer.tsx` (saved on change/blur through `handleChange`/`handleBlur`).
- T-documents are a rich-text editor in `src/components/RichTextEditor.tsx`, saved via `DocumentRenderer.tsx`.
- Patient data (name, code) is PII. Audio of a consultation is also PII/medical data.

## Options

**A. Browser Web Speech API (`SpeechRecognition`, `lang: 'lv-LV'`)**
- Zero cost, no server code, no audio stored by us.
- Works in Chrome/Edge on desktop; Safari support is partial. Recognition is done by the browser vendor's cloud (Google/Apple), so audio still leaves the device.
- Latvian accuracy is unverified and likely weaker than Whisper for medical vocabulary.

**B. Server transcription (recommended if quality matters)**
- Client records with `MediaRecorder`, POSTs a chunk to a new `/api/transcribe` route (session-guarded like other routes), which calls a Whisper-class model (for example through Vercel AI Gateway, `"openai/whisper-1"`-style string, verify the exact model id at implementation time).
- Whisper supports Latvian and handles medical terms better than browser recognition.
- Cost per minute of audio; audio sent to a third-party provider, so this needs your sign-off and a data-processing agreement check.
- Audio is never written to the DB; only the text goes into the field.

## Insertion model (to decide)

- **Focused-field dictation:** the doctor taps a field, then the mic; the text is appended to that field. Simple and predictable. Recommended first step.
- **Free dictation split into fields:** the model maps speech to fields (e.g. "dzemde retrofleksijā"). Much more work, needs an LLM structuring step, and errors land in medical fields. Not recommended yet.

## Proposed implementation (option B + focused-field)

1. `src/components/VoiceButton.tsx`: mic toggle, `MediaRecorder` capture, stop -> upload, shows "Ieraksta / Transkribē" state, error toast.
2. `src/app/api/transcribe/route.ts`: `requireSession()`, size limit, calls the transcription model with `language: 'lv'`, returns `{ text }`.
3. `FormRenderer.tsx`: the active field's value gets `value + ' ' + text` through the existing `handleChange(..., immediate=true)` path so autosave works; `DocumentRenderer.tsx`: insert into the editor at the caret.
4. No DB change. No new persistent storage.

## Verification

- Unit-level: transcription route rejects unauthenticated and oversized requests.
- Manual, in the dev server: dictate a short Latvian phrase into a textarea and a text field; confirm autosave writes it and that PDF output shows it.
- Check on iOS Safari and Chrome (the clinic's devices) that mic permission and `MediaRecorder` work.
- Check latency and accuracy with real Latvian medical phrases before rollout.

## Open questions

1. Browser recognition (free, weaker Latvian, vendor cloud) or server Whisper (better Latvian, paid, audio to a third party)?
2. Focused-field dictation first, or free dictation split into fields?

# How to subscribe Vercel AI gateway.

You need a Vercel account with AI Gateway enabled and a prepaid credit balance. I haven't changed anything in the project.

**Subscribing to AI Gateway**
1. Open the Vercel dashboard, select the team that owns the project, and go to the **AI Gateway** tab.
2. Add a payment method and buy credits. The balance is prepaid, and requests stop when it reaches zero. Check the [pricing page](https://docs.vercel.com/docs/ai-gateway/pricing) for the current `gpt-4o-transcribe` rate. I found conflicting per-hour figures for the Whisper models, so don't budget from my numbers.
3. Create an API key under **API keys** and copy it. Vercel shows it only once. The CLI also works: `vercel ai-gateway api-keys create --name webapp-transcribe --limit 50 --refresh-period monthly`.
4. Add it as `AI_GATEWAY_API_KEY` in `.env.local` for local runs, and in the Vercel project's environment variables for production. The AI SDK reads that variable by default. Use `.env.local` only, and don't paste the key into chat.

Setup guides: [AI Gateway setup](https://vercel.com/academy/ai-summary-app-with-nextjs/ai-gateway-setup) and [budgets](https://vercel.com/academy/ai-gateway/set-a-budget). Optionally set a monthly budget on the key so a bug can't run up the bill.

**Alternative without Vercel:** use OpenAI directly. Create an OpenAI API key, add `OPENAI_API_KEY`, and install `@ai-sdk/openai`. The route then calls `openai.transcription('gpt-4o-transcribe')`. The code change is one line. Your audio then goes straight to OpenAI, which matters for the data-processing check.

**Anthropic:** I found no speech-to-text endpoint in Anthropic's API. The common pattern is a dedicated transcription service followed by Claude for text work, as in [Anthropic's Deepgram cookbook](https://platform.claude.com/cookbook/third-party-deepgram-prerecorded-audio). One weak tutorial claims native audio input, but I couldn't confirm that in Anthropic's docs. Check [Anthropic's documentation](https://docs.claude.com) before relying on it. For dictation, I'd keep Whisper-class transcription and use Claude later if you want the text structured into fields.

Once you have the key, tell me which route you chose (gateway or direct OpenAI) and I'll finish the test.

## Vercel AI Gateway url
https://vercel.com/polarisltd-6471s-projects/~/ai-gateway



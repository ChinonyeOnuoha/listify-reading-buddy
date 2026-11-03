# AI reading feedback: audit, options and test plan

Status: proposal written 2026-11-01. **The adult lab experiment has since run (2026-11-04) — results, recommendation and credit used are in [ai-feedback-experiment.md](ai-feedback-experiment.md).** The published app and the children’s corner are unchanged and connected to nothing. Provider facts below were read from each provider’s official pages on 2026-11-01 and re-checked on 2026-11-04; prices change, so re-check before relying on them.

## 1. What already exists

| Piece | Where | State | Verdict |
|---|---|---|---|
| Recorder (start, pause, listen so far, resume, finish, upload) | `src/components/reading/useRecorder.ts` | Works; captures 16 kHz mono PCM and builds a WAV in the browser. That is already the right input for a transcription service. | **Keep as is.** |
| Review screen and SAMPLE feedback | `src/lib/sample-feedback.ts`, `SampleFeedback.tsx` | Illustrative only, clearly labelled; its copy rules (describe, don’t guess causes, never treat accent as error, statuses “difference / moment to review / nothing found / couldn’t assess”) match what you asked for. | **Keep the copy rules and statuses**; the real feedback should reuse this shape. |
| Adult AI lab (development only, `npm run lab`) | `lab/` | Works: on-device Whisper (tiny/base/small) in the browser, word alignment against the passage (substitution / omission / addition / possible repetition), audio-based pause estimates, pace only when word timestamps pass quality checks, a per-difference listening verdict, copyable summary; 26 tests. Never in the production build. | **Keep and extend** as the experiment harness. |
| On-device Whisper as the recogniser | `lab/asr.worker.ts` | Tested on one real recording: small.en raised 20 flags, 19 were recognition errors. Not good enough to give feedback. | **Replace the recogniser** (for the experiment) with a cloud transcription that returns verbatim words with word timings; keep the worker as a free baseline. |
| Alignment, pause and pace analysis | `lab/analysis.ts` | Works and tested; pause estimates not yet validated by listening; pace depends on timestamp quality. | **Keep**; becomes the deterministic core that decides what is observed. |
| Suggestion writing (LLM) | — | Does not exist. | New, server-side. |
| Server code / secrets | — | The app is client-only; the build targets Cloudflare (Nitro). `.env*` and `.dev.vars` are git-ignored. | New: a small server endpoint; keys never in the browser. |
| Test recordings | `~/Downloads` (not in the repo, git-ignored types) | All six cases exist from 8 Oct: normal (50.9 s), repetitions (58.2 s), omitted/added/substituted (52.1 s), pause (65.9 s), pace (54.3 s), silence/noise (34.8 s). Only the normal one has been analysed before. | **Use them; none missing.** Synthetic (macOS voice) versions also exist in `lab/synthetic-audio/` for pipeline checks only. |

## 2. Providers (official documentation, 2026-11-01)

| Option | What it gives | Price | Fit |
|---|---|---|---|
| **Deepgram Nova-3** (pre-recorded) | Every word with `start`, `end`, `confidence`. `mip_opt_out=true` per request opts out of its Model Improvement Program (data then kept only as long as processing needs; whether opting out changes the price isn’t stated). `filler_words=true` keeps “uh/um” (stripped by default “to improve readability”). Docs say nothing explicit about repeated words, though their own sample output keeps “As as”, “the the”. | $0.0043/min; $200 free credit, no card | **Strong candidate.** Repetition handling must be tested, not assumed. |
| **AssemblyAI** Universal-2 / Universal-3.5 Pro | Word timestamps; `disfluencies` option on both models. Uploads deleted within 24–48 h; transcripts kept 30 days unless deleted (deletion via the API also removes the upload). **Free accounts cannot opt out of model training** — a paid plan is needed for the opt-out and a retention period (TTL). | $0.0025/min (U-2), $0.0035/min (U-3.5 Pro); $50 free credit | **Second candidate**, for comparison. |
| **OpenAI** `gpt-transcribe` | Recommended model; no word-level timestamps listed. | ≈$0.0045/min | No timing evidence → can’t support pause or pace. Not suitable alone. |
| OpenAI `whisper-1` | The only OpenAI model with word timestamps. | $0.006/min | **Deprecated, shuts down 26 Feb 2027.** Optional baseline only. |
| Google Gemini (audio in an LLM) | Transcribes on request; timestamps by `MM:SS` prompt. 32 tokens per second of audio. | per token | A general model writing a transcript may tidy it towards fluent text; no word-level timing. Not suitable for the observations. |
| Azure pronunciation assessment (scripted reading) | Built for read-aloud: omissions, insertions, breaks, prosody, word offsets. | — | Scores **pronunciation** against a reference voice (conflicts with “don’t score accents”); `EnableMiscue` is **not supported beyond 30 s** of audio. Not recommended. |
| **DeepSeek** (`deepseek-flash`, V4.1-Flash) | Text in, text out; **no audio input** listed. | $0.15–0.30 per 1M input tokens (cache miss, off-peak/peak), $0.60–1.20 per 1M output | Fine **only for wording suggestions** from observations we have already measured. Its privacy policy says data is stored in the People’s Republic of China; whether API inputs are used for training is not stated clearly for the API. |

So: DeepSeek cannot analyse a recording. Analysis needs a speech-to-text service with **verbatim words and word timings**, plus our own audio-based pause measurement; DeepSeek can then phrase the result.

## 3. Recommended approach (for the adult-only experiment)

1. **Audio → verbatim words with timings**: Deepgram Nova-3 (`filler_words=true`, no smart formatting, the passage **not** sent as a hint so it can’t pull the transcript towards the text). AssemblyAI run on the same files for comparison; on-device Whisper kept as the free baseline.
2. **Deterministic observations** (existing `lab/analysis.ts`): align the words to the passage → omitted / added / substituted / repeated, each with the words and the time; pauses measured **from the audio** and placed between words using the word timings; pace only from word timings that pass the quality checks, reported as a change between stretches of the passage, never as a score. No causes, no accent judgements.
3. **Wording** (optional): DeepSeek receives only the passage, the short observation list (words, times, type) and the copy rules, and returns, for each observation, one plain-language sentence and one small thing to try. A validator rejects any output that mentions something not in the list, gives a score, guesses a cause or criticises when nothing was found; on rejection or failure, a fixed template is used. With no clear issue the result is a brief acknowledgement.
4. **Where it runs**: the lab calls a small local server endpoint (Vite dev middleware) that holds the keys from `.env.local`; nothing in the browser. A production version would be a Cloudflare server function with the keys as secrets — not built until the experiment says it is worth it.

## 4. Cost estimate

| | Per minute of reading | 10-minute session | Whole experiment (6 recordings, ~6 min) |
|---|---|---|---|
| Deepgram Nova-3 | $0.0043 | ≈ $0.043 | ≈ $0.03 (inside free credit) |
| AssemblyAI U-2 / U-3.5 Pro | $0.0025 / $0.0035 | ≈ $0.025 / $0.035 | ≈ $0.02 (inside free credit) |
| DeepSeek flash wording (≈2,000 tokens in, ≈400 out per session) | — | ≈ $0.0005–0.001 | < $0.01 |
| **Recommended pipeline per 10-minute session** | | **≈ $0.045** | |

## 5. What leaves the device

- **To the transcription service**: the recording (16 kHz mono WAV). Not the passage, not names. Deepgram states it does not store transcripts; its handling of audio and model-improvement use must be confirmed in its data terms before use. AssemblyAI’s retention to confirm likewise.
- **To DeepSeek**: text only — the passage (or the relevant lines), the observation list with word times, the rules. No audio, no names. Stored in China under DeepSeek’s policy.
- **Nothing** is sent from the children’s corner or the public app during the experiment.

## 6. Credentials needed (you create them; they go only in a git-ignored `.env.local`)

- `DEEPGRAM_API_KEY` (free account, $200 credit)
- `ASSEMBLYAI_API_KEY` (free account, $50 credit)
- `DEEPSEEK_API_KEY` (prepaid; a few dollars is plenty)
- Optional: `OPENAI_API_KEY` for a `whisper-1` baseline (deprecated model).

## 7. Test plan (adult lab only)

**Ground truth first.** For each recording, a reference of *what was actually said*, prefilled from the recording script and confirmed by you listening (I can’t listen to audio). Timing evidence measured locally from the audio already (20 ms energy frames, threshold 10 dB above the noise floor; not yet validated by ear):

| # | Recording | Intended | Measured from the audio | To confirm by listening |
|---|---|---|---|---|
| 1 | Normal reading (50.9 s) | As written | Speech 0.0–50.2 s; one silence ≥ 1 s (≈1.1 s at 17.0 s) | Any slips you made |
| 2 | Repetitions (58.2 s) | “a small brass” ×2, “said” ×2, “Nobody ever” ×2 | No silence ≥ 1 s | Each repeat said as scripted |
| 3 | Omit/add/substitute (52.1 s) | “low” omitted, “very” added, “village”, “two” | — | Each change made |
| 4 | Pause (65.9 s) | ~2 s inside “circle of … light” | **Two** long silences: 2.7 s at 36.6 s and 3.0 s at 39.3 s (plus 1.1 s at 45.7 s) | Which of these is the planned pause, and what the other is |
| 5 | Pace (54.3 s) | Slow, then faster from “Some said an hour” | One silence ≥ 1 s (1.2 s at 17.4 s); pace needs word timings | Where the change began |
| 6 | Silence/noise (34.8 s) | 5 s silence, 10 s noise, first sentence | The energy method treats the noise as speech (it can’t separate them) | That nothing was spoken before the sentence |

**Run** each recording through Deepgram, AssemblyAI and the on-device baseline; save raw JSON outside the repository.

**Checks, per recording and provider**
1. Verbatim: transcript vs your confirmed reference → recognition-error rate on what was *said* (a true word error rate this time).
2. **Repetitions kept?** For #2, are all three repeats present, or silently collapsed?
3. **Words invented?** For #3, does “low” appear even though it was omitted, or “three” instead of “two”? For #6, any words in the silence/noise part?
4. **Timing evidence**: do the word gaps around “of … light” (#4) match the audio-measured silence within 0.3 s? Do pace windows (#5) only appear when timestamps pass the quality checks, and show the speed-up after “Some said an hour”?
5. False alarms on #1: every flag listened to and marked recognition error or real difference.
6. Feedback text (DeepSeek and template) for each: points to the words or time, plain explanation, one small thing to try; for #1 (if clean) a brief acknowledgement; no score, no cause, no accent comment. Checked by you.

**Pass bar to consider anything user-facing**: repetitions and omissions preserved in #2 and #3; nothing invented in #3 and #6; pause in #4 located within 0.3 s; on #1 no more than one or two flags, each explainable. Results go into `TESTING_LOG.md` as text only; audio and raw provider output are never committed.

**Limits**: one reader, one device, one passage. Passing shows the pipeline can work, not that it works for every voice or child; the children’s corner stays untouched until a separate decision.

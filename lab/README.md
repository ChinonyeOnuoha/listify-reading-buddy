# Reading Buddy — on-device AI feasibility lab (development only)

A separate test screen for one question: **is free, on-device speech recognition good enough for Reading Buddy?** It is not part of the app. It has its own Vite root and dev server; the production build (`vite build` with `../vite.config.ts`, entry `src/`) never includes it — checked by searching `.output/` for any lab or model code.

## Run it
```bash
npm run lab
```
Open http://localhost:5174. Nothing downloads until you press **Load model**.

1. **Expected passage** — prefilled with the test passage; edit or paste your own. It is only used *after* transcription; it is never given to the model.
2. **Model** — Whisper tiny.en, base.en or small.en, on CPU (WASM, default) or GPU (WebGPU, only offered where available). Load / Cancel / Delete downloaded models, with download progress, load time, file sizes, precision and thread count.
3. **Recording** — upload an audio file (WAV/MP3/M4A — anything the browser decodes), pick the test case, choose word- or segment-level timestamps, Transcribe or Cancel. **Clear test data** forgets the audio and results (the model stays loaded).
4. **Results** — the **uncorrected** transcript; every word with its timestamp (click to replay); the transcript compared with the passage word by word (substituted / omitted / added / possible repetition), each replayable, with a column for **your** verdict (really read differently / recognition error / unsure); pauses measured from the audio; pace in 5-second windows (only when word timestamps look reliable); timestamp-quality counts; processing time and real-time factor; **Copy result summary** (text only) for the testing log.
5. **Page photo → text** — Tesseract.js OCR, experimental, with confidence and low-confidence words; the text must be reviewed before "Use as expected passage".

Recording script: `RECORDING_SCRIPT.md` (also shown in the lab). Synthetic pipeline-check audio: `node lab/make-synthetic-audio.mjs` (macOS `say`; writes to the git-ignored `lab/synthetic-audio/`).

## What runs where
| Piece | Source | Licence | Notes |
|---|---|---|---|
| Transformers.js 4.3.1 (`dist/transformers.min.js`, 0.59 MB) | cdn.jsdelivr.net | Apache-2.0 | Loaded at runtime in a module worker (the `.web` build needs a bundler, so the self-contained build is used). No `package.json` dependency added. |
| ONNX Runtime Web (`ort-wasm-simd-threaded.asyncify.wasm`, 26.9 MB stored) | cdn.jsdelivr.net, fetched by Transformers.js | MIT | CPU engine. Multi-threaded when the page is cross-origin isolated (the lab server sends COOP/COEP `credentialless`). |
| `onnx-community/whisper-tiny.en_timestamped` | huggingface.co | base model `openai/whisper-tiny.en` is Apache-2.0 on Hugging Face (Whisper code is MIT); the ONNX conversion repo states no separate licence | 8-bit: encoder 10.1 MB + decoder 30.7 MB + tokenizer/config 2.7 MB = **43.5 MB** |
| `onnx-community/whisper-base.en_timestamped` | huggingface.co | as above (`openai/whisper-base.en`, Apache-2.0) | 8-bit: encoder 23.2 MB + decoder 53.7 MB + tokenizer/config 2.7 MB = **79.6 MB** |
| `onnx-community/whisper-small.en_timestamped` | huggingface.co | as above (`openai/whisper-small.en`, Apache-2.0) | 8-bit: encoder 92.2 MB + decoder 156.8 MB + tokenizer/config 2.7 MB = **251.7 MB**. About 3× slower than base.en on a laptop (real-time factor ≈ 0.4); a long first download |
| Tesseract.js 7.0.0 + core + English data | cdn.jsdelivr.net | Apache-2.0 | OCR experiment only |

Everything is cached by the browser (Cache API, `transformers-cache`) after the first download. Interrupted downloads are not resumed — a dropped connection restarts the large files (seen in testing). Recordings and passages are never uploaded; inference runs in the browser. **Delete downloaded models** removes the cache.

## Selected vs loaded, clearing and cancelling
- **Selected** (the two dropdowns) and **loaded** (what is really in the worker's memory) are tracked separately; "Loaded now" always shows the latter. Transcribe is only available when the selected model and device are the loaded ones, and says why when they aren't. Changing the dropdowns never changes what is loaded.
- Every result records the model, device, precision, threads, timestamp mode, test case and recording that actually produced it; the result heading and **Copy result summary** use that record, never the live dropdowns.
- Every request to the worker has a job id. A reply from cancelled or replaced work, or from a terminated worker, is ignored.
- **Clear test data** during a transcription stops it (terminating the worker is the only way to stop inference, so the model is unloaded — the status says so and cached files reload in seconds) and ignores any late result. During a model load it leaves the load running and keeps its progress on screen. A recording still being read when you clear is discarded. The recording can't be swapped while a transcription runs.
- Logic lives in `store.ts` (no React) with regression tests in `store.test.ts` (`npx vitest run --config lab/vitest.config.ts`).

## Safeguards built in
- The passage is never passed to the model (no prompt, no "initial text"), so it can't nudge the transcript towards the expected words.
- Differences are labelled as things to **check by listening**, never as mistakes; your verdict separates recognition errors from genuine reading differences.
- Pauses come from the audio (20 ms energy frames, threshold 10 dB above the noise floor). Detecting a silence says nothing about whether a pause is misplaced.
- Pace is only shown from word timestamps that pass basic checks (none missing, <10% zero-length/out-of-order/over-long). It is never inferred from an untimed transcript, and no causes are suggested.
- Spelling variants (neighbours/neighbors, -ise/-ize) and joined/split compounds (post box/postbox) are not counted as differences.

## Limitations — read before drawing conclusions
- **One reader, one recording, one device.** The real-voice tests so far use a single reader's single reading of one 118-word passage, recorded on a phone and run on one laptop. They are data points, not a measurement of any model in general, and say nothing about other voices, accents, microphones, rooms or passages.
- **A difference from the written passage is not automatically a transcription error, and not automatically a reading mistake.** It can be either (or a spelling variant, or a timestamp artefact). Only a person listening can tell, which is why the lab asks for a verdict per difference and reports recognition errors separately from genuine reading differences.
- **Why a recognition error happened is not established.** The tests can't separate accent, microphone, room, 16 kHz downsampling and model size from each other.
- **Nothing here is connected to the public app.** The tested models are not wired to the sample feedback or to any user recording, and no cloud AI is used or planned in this prototype. (One external cloud transcript was pasted into the log for comparison only; it was not run from this project.)
- **Personal recordings and private test material are not committed.** Audio files are git-ignored (`*.m4a`, `*.wav`, `*.webm`, `lab/synthetic-audio/`); only text results written into `TESTING_LOG.md` are kept.

## Results so far
See `../TESTING_LOG.md` (2026-10-07, "AI feasibility lab") for the measured runs, what was synthetic, and what still needs real recordings.

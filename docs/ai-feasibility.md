# AI feasibility: what was tested and what it means

**Summary.** Whisper `tiny.en`, `base.en` and `small.en` were run in the browser (development lab only) on **one reader's one recording** of a 118-word passage. They were **not** integrated into the app or its sample feedback, and the app does not analyse recordings. No cloud AI is used by the project.

## What was tested
The lab (`lab/`, started with `npm run lab`, never part of the production build or navigation) loads a Whisper model from a public CDN, transcribes an uploaded recording on the device, and compares the transcript with the passage as entered, word by word. It also estimates pauses from the audio and pace from word timestamps, and has an OCR experiment (Tesseract.js) for page photos. See [`lab/README.md`](../lab/README.md) for how it works and its safeguards.

## Results
Recording: one reader, one take, a phone recording, read cold. The reader listened and judged every flagged difference. Differences are counted against the **written passage**, so the percentages below are **passage-difference rates**, not word error rates: a proper ASR word error rate needs a verified transcript of what was actually spoken, which was not made.

| | tiny.en | base.en | small.en |
|---|---|---|---|
| Model download (8-bit) | 43.5 MB | 79.6 MB | 251.7 MB |
| Difference flags against the passage | 38 | 35 | **20** |
| Passage-difference rate | ≈ 32% | ≈ 30% | ≈ 17% |
| Flags that were recognition errors (reader's listening check) | 38 | 34 | **19** |
| Transcription time for the 50.9 s recording (laptop CPU, WASM) | 4.0 s | 6.3 s | 19.1 s |

- **small.en produced 20 difference flags: one confirmed omission (a dropped "and") and 19 recognition errors**, according to the reader's listening check. So 19 of its 20 flags (95%) were not reading differences. base.en and small.en agreed on many flags, and most of those agreed flags were also recognition errors — agreement between models was not a filter.
- Examples of recognised-wrong text were fluent-looking ("lantern" → "lance arm"), so fluent output is not evidence of correctness.
- Word timestamps from the models placed pauses about one word late in the cases examined. Whether the lab's audio-based silence estimates match what a listener hears **has not been validated**; they are untested estimates, not established measurements. Pace figures depend on the recognised words and inherit their errors.
- One manual comparison: the reader uploaded the same recording to Google AI Studio (free tier) by hand, outside this project, and pasted back the answer; it matched the passage closely (one flagged difference, the same omission). This was not run from the project, how it was produced could not be verified, and it was not integrated into anything.
- Synthetic (macOS "Samantha") speech was used for pipeline checks only; it says nothing about real voices.

## What these results do not show
- Performance for other readers, voices, accents, microphones, rooms or passages. One reading cannot support any general claim.
- **That accent (or anything else) caused the errors.** Accent, phone microphone, room, 16 kHz downsampling and model size could not be separated.
- That a difference from the written passage is a transcription error, or a reading mistake: it can be either. Only listening settles it, which is why the lab asks for a verdict per flag.

## Decisions taken
- **No on-device model is used for feedback.** With these three, comparing a transcript with the passage would label a large share of a correct reading as "differences", which conflicts with the product rule that accents must never be treated as errors.
- Public feedback screens remain clearly labelled illustrative samples and are separate from any recording.
- No cloud AI will be added to this prototype.
- A future attempt would need a verified transcript of what was spoken (for a true ASR error rate), more readers and recording conditions, and listening validation of any pause or pace measure before it is shown to a user.

## Open items
More readers and microphones; listening validation of silence estimates; real page photos for OCR (only a clean synthetic page was tried, and it was read exactly); WebGPU and other browsers (only Chromium on CPU/WASM was run).

Detailed working notes from the experiments were removed from the current files on 2026-10-08. They remain in this repository's Git history (for example in `TESTING_LOG.md` at commit `914fa97`).

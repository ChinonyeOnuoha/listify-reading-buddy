# Testing log

Record what actually happened. Leave blank until tested. Do not add recordings or keys here.

| Date | Device / browser | What I tried | Expected result | Actual observation | Limitations / notes |
|------|------------------|--------------|-----------------|--------------------|---------------------|
|      |                  |              |                 |                    |                     |
|      |                  |              |                 |                    |                     |

Suggested checks: set target · paste passage · add photo · record/stop/play/discard · deny mic access · upload audio · open sample feedback · mobile layout.

## 2026-10-05 — automated browser checks (headless Chromium, run by the AI builder)

| Device / browser | What I tried | Expected result | Actual observation | Limitations / notes |
|---|---|---|---|---|
| Desktop 1280px & mobile 390px, headless Chromium | Upload 2 page images, move page 1 down | Order swaps, numbering updates | Order became p2, p1 | Plain test images, not real photos |
| Same | Switch Upload → Paste → Upload → Paste | Pasted text and images both kept | Both kept | — |
| Same | Start recording ~2.5s, stop | Moves to Review with player | Moved to Review, audio player present | Uses Chromium's fake microphone; audio quality not checked |
| Same | Review → Back to reading → Edit passage → Review | Text and audio kept | Both kept | — |
| Same | Explore sample feedback → Next | Shows sample 2 of 6 only | Showed "Missing, added or replaced words" only | — |
| Same | Discard (confirm) → Upload audio instead (3s WAV) | Back to Read, then Review shows uploaded file | Review showed "Uploaded: a.wav" | — |
| Desktop headless, mic forced to fail | Start recording | Friendly mic message + upload option | Message shown | Real permission prompt not tested |

Not verified: real phones, Safari/iOS recording, real microphone audio, listening to playback.

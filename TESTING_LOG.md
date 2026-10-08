# Testing record

A concise public record of what has been tested, where, with what limits, what came of it, and what is still open. Checks were run by the project owner and by Claude Code during development, mostly in a desktop Chromium browser pane with emulated viewports. **Real-device testing has not been done** unless a row says so.

> **About earlier versions.** This file used to be a long dated log with detailed working notes and transcripts of one reader's test session. Those details were condensed on 2026-10-08 and the full earlier text is **still available in this repository's Git history** (for example `TESTING_LOG.md` at commit `914fa97`); removing it from the current file does not remove it from history. The AI-experiment summary is in [docs/ai-feasibility.md](docs/ai-feasibility.md).

## Environment
- MacBook Air (Apple M3), macOS; the Claude desktop app's built-in Chromium (version 152) with emulated phone, tablet, desktop and landscape sizes; headless Chromium for the earliest checks; a local Node server for production-build checks.
- Not covered: real phones or tablets, Safari, Firefox, Android Chrome, installed-PWA behaviour on a device, screen readers, a real microphone in the embedded browser (a test tone or generated WAV files stood in).
- Audio used in automated and lab pipeline checks was synthetic (a macOS voice) or a generated tone. One real recording from one reader was used for the AI experiment only; it is not in the repository.

## Automated tests (all passing at the time of writing)
| Suite | What it covers |
|---|---|
| App (`npm test`), 74 tests | Routing smoke tests; PWA install/standalone/iOS detection and update policy; service-worker behaviour using the real template stamped like a build (cache cleanup limited to Reading Buddy's own caches, no `skipWaiting` on install, offline fallback, foreign requests untouched, precache list); build-stamping rules; colour-contrast thresholds read from the real CSS tokens; companion accessibility markup and one-shot interaction (click/hover, no queueing, touch vs mouse, reduced motion, arrival wave); Install-button cases |
| Lab (`npx vitest run --config lab/vitest.config.ts`), 26 tests | Alignment, pause and pace analysis; the lab's model/recording state machine (selected vs loaded model, job ids, Clear/cancel races, provenance) |
| Type checks | `tsc --noEmit` for the app and for `lab/`: clean |
| Lint | No code-quality errors. The repository's Prettier rule (print width 100) was already failing in older files and has not been applied repo-wide |
| Production builds | Cloudflare and Node targets succeed; output searched for lab and model code and for documentation files: none present |
Mutation checks were run for the lab and service-worker tests (a bug put back, tests confirmed to fail, then restored).

## What was checked in the browser, and the result
| Area | Checked | Result |
|---|---|---|
| Guided flow | Welcome → target (presets, custom, edit) → paste or upload → Continue → read → review → sample feedback; Back and browser Back; sample session | Works as described in [docs/user-flow.md](docs/user-flow.md) |
| Page gallery | Several generated test images; per-page menu, arrows, "Add pages", scroll into view | Fixed-height contained previews; menu, arrows and counts behave as designed |
| Recording | Start, pause, resume, listen so far, finish, record again, upload audio (generated tone/WAV), playback, elapsed time excluding pauses | Worked with a test tone and generated WAVs; paused time did not count. **Not tried with a real microphone or a real voice in the embedded browser**; earlier microphone-failure and permission cases were simulated |
| Session safety | Logo/home with Resume, unfinished-recording confirmation, Exit session confirmation, discard while uploads or microphone requests are pending | Nothing discarded came back; the dialogs' focus handling worked |
| Layout | 320, 375, 1024 and 1280 px widths and a landscape phone (812 × 375): no horizontal overflow; header buttons share one row; fixed Continue bar and recording dock reserve their height and cover nothing; footer sits above them | Passed. A real on-screen keyboard was not tested |
| Visual refresh | Palette, serif headings, paper background, companion placements; overlap script of every companion against text, controls and images | No overlaps; contrast figures are in [docs/design-system.md](docs/design-system.md) |
| Companion interaction (2026-10-08) | Real mouse hover and click; real Tab, Enter and Space; emulated touch pointer events; rapid repeated input; arrival wave; page and layout positions before and after; layout-shift observer; Review while audio plays; Read screen | One brief wave on mouse hover, one brief wiggle on click/Enter/Space; extra input during a reaction is ignored (no queue); touch pointers do not trigger the hover wave; layout positions unchanged and layout shift 0; the companion is not a button on the Read screen or while audio plays. **A bug found and fixed during this check:** the arrival wave replayed after each hover reaction |
| Reduced motion | CSS and script inspection and unit tests | The animation rules sit inside `prefers-reduced-motion: no-preference`, and scripts skip reactions under `reduce`. **The setting could not be switched in the browser pane, so it was not watched** |
| Touch | Emulated pointer types, `touch-action`, and hit-area overlap checks | **No real touch scrolling on a device was tested** |
| PWA / offline | Local production build: service worker active, manifest and icons, offline start page, offline notice, update offered only when no session exists and never during a recording, cleanup limited to its own caches | Passed locally. The browser's real install prompt never fires in the embedded pane (simulated), the iOS install steps were not seen on an iPhone, and the stamped worker has not been verified on the hosted site |
| Network | Source inspection plus a real page load | Besides its own files, the page requests only the Google Fonts stylesheet and four font files; no content is sent anywhere. See [docs/architecture.md](docs/architecture.md) |
| Fonts and layout shift | Production build, one fast local load | Layout shift 0; about 41 KB of Fraunces; fallback widths within 0.3%. Not measured on a throttled connection |

## AI feasibility (development lab only)
Summary of [docs/ai-feasibility.md](docs/ai-feasibility.md):
- `tiny.en`, `base.en` and `small.en` were tested on **one reader's one recording**. `small.en` produced 20 difference flags: one confirmed omission and 19 recognition errors, according to the reader's listening check.
- The percentages against the written passage (≈ 32%, ≈ 30%, ≈ 17%) are **passage-difference rates, not established ASR word error rates**; that needs a verified transcript of what was spoken.
- These results do not establish performance for all readers and do not isolate accent as a cause.
- Audio-based silence estimates have **not** been validated by listening; model word timestamps placed pauses about one word late in the cases examined.
- The tested models are **not** integrated into public feedback. One external Google AI Studio comparison was done manually by the reader, outside the project.
- The lab's own regression tests and the OCR experiment (clean synthetic page only) are covered above and in the lab README.

## Decisions made from these results
- Keep feedback screens as clearly labelled illustrative samples; do not connect any tested model.
- No cloud AI in this prototype.
- Keep the lab, its tests and its documented findings in the repository, outside the production build and navigation.
- Treat the companion as a button only where it cannot interfere with reading, recording or playback.
- Self-hosting the fonts would remove the Google request; not done yet.

## Known issues and outstanding checks
- Real-device testing: iPhone Safari and Android Chrome (touch, scrolling past the companion, microphone, on-screen keyboard behaviour of the Continue bar), installed-app behaviour, the iOS install steps.
- Screen readers (VoiceOver, TalkBack, NVDA), forced-colours mode, reduced-motion behaviour watched with the real setting.
- Recording with a real microphone and a real voice across browsers; very long recordings and memory use (recordings are held in memory at about 2 MB per minute).
- Layout shift and font loading on slow connections.
- The hosted site: confirm the deployed build serves the stamped `sw.js` and the expected headers.
- AI work (if ever resumed): more readers and microphones, a verified spoken transcript, listening validation of pause and pace estimates, OCR on real photos, WebGPU and non-Chromium browsers.

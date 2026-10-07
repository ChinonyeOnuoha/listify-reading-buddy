# Reading Buddy (RB)

A prototype reading-aloud companion. Choose a reading target, bring a passage (pasted text or photos of pages), record yourself reading, and play it back. A conceptual portfolio project exploring AI-assisted reading practice — the AI parts are deliberately not connected yet.

## History
Reading Buddy started life as **Listify: Reading Buddy**, a separate, new project inspired by my original **Listify** to-do app (built during AltSchool):
- App: https://listify-a-to-do-app.vercel.app/
- Repository: https://github.com/ChinonyeOnuoha/Listify--A-To-do-App

It keeps Listify's plum, blush and peach palette and friendly voice. The visible branding is now the "RB" mark with a small open-book illustration. The original Listify app and repository are untouched.

## How a session works
There's no stepper — each part appears when it's needed (progressive disclosure), and contextual buttons move you on.

1. **Welcome.** A fresh visit shows only the logo, "What shall we read aloud together today?" (in a soft serif; left-aligned on phones, centred on desktop), the reading-target card and a sample-session link.
2. **Today's reading target.** Choose 5, 10 or 15 min, or Custom. Nothing is preselected. Custom shows a labelled minutes field and a small "Set target" button; the next card only appears once a whole number from 1–180 is confirmed. Once set, the target becomes a plain "Today's target" row (no card of its own) with a directly editable minutes field; changing it keeps everything else.
3. **Bring something to read.** Two tiles: "Paste text" (labelled text area) or "Upload pages" (photos or screenshots of pages). Neither input appears until you choose. Switching keeps both drafts.
   - Pages show in one horizontal strip of equal, fixed-height frames: two on desktop, one plus a peek of the next on phones. Images are contained, never stretched or cropped. Each page has a "⋯" menu (Move earlier, Move later, Replace…, Remove) that works with keyboard and screen readers; there is no drag-only reordering. Round gallery arrows only scroll: the right arrow shows until the end, the left arrow shows only at the end, and neither shows when everything fits. Touch, trackpad and keyboard scrolling always work.
   - Images that can't be opened (e.g. some HEIC photos) are rejected with a message, so a page in the strip is always a usable page.
   - **Content-ready layout.** Once a page has loaded, or pasted text is "done" (right after a paste, or when you leave the text box — never on the first typed character), the content comes into focus: the welcome heading goes, the Paste/Upload tiles collapse, and "Your pages" (with the page count beside it) or "Your content" sits directly under the card header with a small underlined **Change content** link. The text box is the same element throughout, so focus, cursor and typing are never interrupted.
   - **Change content** reopens the tiles with a **Cancel** link back to your current content. Both drafts are kept. Picking a method that already has content, adding pages, or finishing a paste switches straight back. Removing all pages or all text returns that method to its empty state.
   - After the first upload the previews scroll into view; adding more pages scrolls the strip to the first new one (instantly if you prefer reduced motion).
   - **Continue bar.** While usable content exists (non-whitespace text or at least one loaded page), a quiet, opaque bar (the page's own background colour) is fixed to the bottom on every screen size, holding only the "Continue to reading →" button — the one fully pill-shaped control. Full-width on phones (with the iPhone safe area respected), right-aligned on desktop. The page reserves the bar's measured height plus 24px, so it never covers previews, editing controls or helper text. While an on-screen keyboard is open over a text field, the button moves into the page right under the content card (so it never sits on the field and stays a short scroll away), and returns to the bar when the keyboard closes. It hides when there's no usable content.
4. **Read.** The passage (or pages) comes first. On desktop a compact recording card sits beside it; on phones and tablets the controls live in a compact, opaque **dock anchored to the bottom of the screen**, so they stay in view while you scroll. The page reserves the dock's measured height at its very bottom, so the last lines, page controls and footer are never covered (re-measured on rotation and size changes; iPhone safe area respected). On short or landscape screens the dock collapses to a single row and the header slims to 48px.
   - The dock shows the state, recorded time against the target, and only the actions that apply: **Start recording / Upload audio** → **Pause / Finish recording** → paused: **Resume recording / Listen so far / Finish recording**. With a recording already made: **Listen back / Record again / Upload audio** (replacing asks first).
   - **Pause really pauses**: no audio is captured and the timer and target progress stop (they count recorded time only). **Listen so far** plays everything recorded up to now; it's stopped before capture resumes. **Resume** adds to the same recording. **Finish recording** works from recording or paused and opens Review; the microphone is released.
   - If something fails — the preview can't play, resuming fails, or finishing fails — the captured audio is kept and a short message says what to do next (e.g. "try Finish recording again").
   - Editing is locked while a recording is unfinished, but page navigation still works. Page navigation shows "Page 1 of 2" on one line, with 44px arrow buttons (named "Previous page" / "Next page") on narrow screens.
   - Reaching the target never stops recording. If the microphone is unavailable, a friendly message appears and upload becomes the main action.
5. **Review.** "Reading done 🙌🏾 Have a listen back." / "AI feedback isn't connected yet." (left-aligned on phones, centred on desktop). Playback and duration, "Discard recording" and "Start a new session" (both confirm first; a new session keeps your target). "Back to reading" keeps everything.
6. **Sample feedback** opens on its own screen from "Explore sample feedback", with "Back to recording" at the top. The browser's Back button works too. Review keeps the recording, passage, target and playback position (paused, never autoplayed), and focus moves to each screen's heading.

## How recording works (and why)
The first version used the browser's MediaRecorder, which writes compressed audio. That can't give a dependable pause-and-listen: a half-finished compressed file isn't guaranteed to play (Safari's MP4 may only be finalised when recording stops), and gluing separately recorded compressed files together doesn't make a valid file. So the recorder now captures raw audio samples with Web Audio (an AudioWorklet, with a ScriptProcessor fallback for older browsers), keeps them in this tab's memory at 16 kHz mono (~2 MB per minute), and builds a standard WAV file whenever something needs to play — for "Listen so far" and for the final recording. Pausing simply stops adding samples, so there's no artificial silence and nothing is duplicated. Nothing is uploaded and no paid service is involved.

## Home, Resume and Exit session
Everything lives in this tab's memory only — closing or reloading the tab clears it; nothing is stored or uploaded.
- **Logo = home.** The RB logo returns to the welcome screen without clearing anything. If a session exists, the welcome shows "Your session is waiting" (target, content and recording at a glance) with **Resume session**, which returns you to exactly where you were. Going home pauses any playback.
- **Going home with an unfinished recording** (recording or paused) asks first: "Return home?" explains that going home will finish the recording and keep it ("Keep recording" — or "Stay here" when paused — / "Finish and go home"). Cancelling leaves it exactly as it was. Confirming finishes and keeps it and releases the microphone; Resume then opens it in Review — it never restarts recording. If nothing could be kept, a second dialog explains that before you leave.
- **Exit session** (understated, in the header whenever a personal session exists) is the only way to discard the whole session. It opens an accessible confirmation ("Leave this session?" — "Stay in session" / "Leave and discard"; it also mentions an active recording). Opening or cancelling changes nothing. Confirming stops any recording and playback, releases the microphone, clears the target, both drafts, pages, audio and progress, and returns to a fresh welcome. Uploads still decoding and microphone requests still pending at that moment are ignored, so nothing discarded can come back.
- Dialogs use the project's Radix alert dialog: focus starts on the safe action, stays inside, Escape cancels, focus returns to the logo or Exit button, and there's no close icon.
- The sample session stays separate: its logo and "Exit sample" never discard a personal session (Exit session is hidden while in the sample).

## Sample session
"Just exploring? Try a sample session →" (an understated text link under the preparation cards) opens a walkthrough that needs no target, no passage and no microphone: a short original sample passage → sample review → sample feedback, ending with "Start my session" or "Explore the sample again". A "Sample session" label and "Exit sample" stay in the header throughout.

There's no demo audio file in the project, so the sample review says so plainly instead of showing a player. The sample keeps its own state: it never counts towards your target or touches your passage, pages or recording, and exiting returns you to your setup exactly as you left it.

## Sample feedback
Six clearly labelled SAMPLE examples, one at a time with tabs and Previous/Next: Repetitions, Missing/added/replaced words, Pauses, Pacing changes, No findings, Uncertainty. Each separates the **observation** (with the relevant words beside it) from an **optional experiment for a new passage**. The copy never guesses causes, never treats accents as errors (only which word was read is compared), never promises improvement and never asks for a reread. Status tags keep "Nothing found in the areas checked" visibly different from "Couldn't assess confidently", and frame pauses and pace changes as moments to review, not mistakes. After a real recording, "Explore sample feedback" opens the same examples — they're never presented as analysis of your audio.

## Visual design
- **Colours (solid, no gradients):** page `#FEEAEE`; cards `#FEECE4`; plum `#65083E` (logo, primary actions, links, selected borders, focus rings); headings `#491332`; main text and labels `#653B54`; supporting text `#735668` (darkened from `#795C6E`, which was only 4.26:1 on peach); peach `#F5D5C3` accents; hover/selected tint `#F5DEDA`; preview frames `#F8E3DD`.
- **Measured contrast (WCAG):** headings 10.7–12.9:1; main text 6.6–8.0:1; supporting text 4.66:1 on peach, 5.0–5.6:1 on page, card, tint and frames; plum text, focus ring and selected borders 9.2–11.1:1; button text on plum 11.1:1; field/tile edges `#8F7A87` 3.1–3.5:1 on page, card and tint (≥3:1 for controls).
- **Type:** Manrope for the interface. Main headings 34px/600 on desktop (28px on phones), card headings 20px/500, labels 16px/500, body 16px/400 with a 1.6 line height. Two serifs, used sparingly: the "RB" monogram (DM Serif Display, compact with the B slightly overlapping the R) and the welcome heading (Fraunces at its "soft" setting, for a bookish feel).
- **Layout:** centred content and headings; functional content left-aligned inside 26px-radius cards with 16px inner tiles and frames. About 24px between cards and 40px padding on desktop; 16px between cards and 20–28px padding on phones. Primary actions are solid plum with moderately rounded (14px) corners; "Continue to reading" is the only full pill. "Add pages" is a 12px-radius outlined button with a small plus. Icons are 16–20px, 8px from their labels.
- **Header:** compact, sticky and opaque. The serif RB monogram and small book illustration form the home button; "Exit session" (or "Sample session · Exit sample") sits on the right. No navigation menu.
- **Motion:** newly revealed sections fade in gently; this, the recording pulse and smooth gallery scrolling are switched off for people who prefer reduced motion.

## Install and offline (PWA)
Reading Buddy can be installed as an app on browsers that support it.
- **Install:** an understated "Install Reading Buddy" link appears under the sample-session link on the welcome screens when the browser offers installation (Chrome, Edge, Android). On iPhone/iPad it opens a one-line tip: Safari → Share → Add to Home Screen. It's hidden once installed (standalone mode).
- **Manifest and icons:** `public/manifest.webmanifest` (standalone display, `#FEEAEE` theme and background), icons in `public/icons/` drawn from the RB-and-book mark (192, 512, maskable 512, Apple 180, and an RB-only 32px favicon so it stays readable small).
- **Offline:** `public/sw.js` caches the app shell (start page, built scripts and styles, fonts, icons). After one online visit the app opens and works offline, including recording and playback; if nothing is cached yet, `offline.html` explains. An in-app note appears while offline.
- **Updates:** pages load network-first, so a fresh open gets the latest version. If a new service worker arrives while the app is open, "A new version of Reading Buddy is ready — Update now" is offered **only when no session is open**, so nothing reloads during a recording or discards work.
- **Privacy is unchanged:** the service worker never stores passages, page photos or recordings (they're in-memory `blob:` URLs it never sees). Installing doesn't make sessions persist — closing the app clears them, and the wording says "app" instead of "tab" when installed.
- The service worker only registers in production builds (not on the dev server).

## Not connected yet
- Automatic text extraction from photos.
- Live AI analysis of recordings.
- No servers, paid services or AI providers are used. Passage text, photos and recordings stay in the current browser tab (the only outside request is the Google Fonts stylesheet).

## AI feasibility lab (development only)
`npm run lab` opens a separate test screen (http://localhost:5174) for checking whether free, on-device speech recognition (Whisper via Transformers.js) and OCR (Tesseract.js) could support Reading Buddy. It lives in `lab/`, has its own dev server and is never part of the production build. The public app and its sample feedback are unchanged and no AI is connected to them. See `lab/README.md` and `lab/RECORDING_SCRIPT.md`.

## Run it
```bash
bun install
bun run dev
```
Or, without Bun: `npm install --no-package-lock` then `npm run dev`. Open the local URL shown in the terminal (usually http://localhost:8080).

## AI assistance
The first version (code, layout, sample feedback text and README) was drafted with Lovable (an AI-assisted builder) from my written brief. Later refinements on the `feature/guided-reading-flow` branch — the guided flow, the editorial visual pass, and this RB redesign with progressive disclosure and the sample session — were made with Claude Code from my briefs and reference mock-ups. Product direction, tone and review are mine.

## Testing
See `TESTING_LOG.md`. Never commit real recordings or API keys.

`npm test` runs two routing smoke tests (`src/test/app-routing.test.tsx`). They had failed since the Lovable template because the root route renders a full `<html>` document, which React can't mount inside the test's `<div>`, so nothing rendered and they never exercised the app. The test now swaps only that document shell for a passthrough; the real routes render (the welcome heading and the 404 page) and both tests pass.

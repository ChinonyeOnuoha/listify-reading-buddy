# Reading Buddy (RB)

A prototype reading-aloud companion. Choose a reading target, bring a passage (pasted text or photos of pages), record yourself reading, and play it back. A conceptual portfolio project exploring AI-assisted reading practice — the AI parts are deliberately not connected yet.

## History
Reading Buddy started life as **Listify: Reading Buddy**, a separate, new project inspired by my original **Listify** to-do app (built during AltSchool):
- App: https://listify-a-to-do-app.vercel.app/
- Repository: https://github.com/ChinonyeOnuoha/Listify--A-To-do-App

It keeps Listify's friendly voice. Its look is now ink blue, warm ivory and apricot with a small bookmark companion; the visible branding is the serif "RB" mark with a small open-book illustration. The original Listify app and repository are untouched.

## How a session works
There's no stepper — each part appears when it's needed (progressive disclosure), and contextual buttons move you on.

1. **Welcome.** A fresh visit shows only the logo, "What shall we read aloud together today?" (in a soft serif with “together” in italic; left-aligned on phones, centred on desktop), the reading-target card and a sample-session link.
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
Direction: **ink blue, warm ivory and apricot**, with a small bookmark companion. This is a refinement of the existing screens, not a rebuild; layout, flow and behaviour are unchanged.
- **Tokens** (all in `src/styles.css`, solid colours only): page `#F6F2E8`; cards `#FDFAF4` (slightly lighter); ink `#0B2560` (primary actions, links, logo, selected borders, focus ring); headings `#07194A`; body text and labels `#1E2B4A`; supporting text `#4A5B78`; control edges `#76829A`; hover/selected tint `#EEEDEB`; apricot `#FCBC88` (companion and restrained decoration only), apricot tint `#FDE8D3` (quiet chips behind ink text), deeper apricot `#E58A45` (companion details and a few contour lines only). The values were sampled from the approved reference image (which is compressed, so they are approximations) and then adjusted where the sampled link blue was too bright and the sampled greys were too weak for AA. Apricot is never used for text.
- **Measured contrast (WCAG 2.x), computed from the tokens and asserted by `src/test/contrast.test.ts`:**

  | Pair | Page | Card | Tint | Notes |
  |---|---|---|---|---|
  | Body text `#1E2B4A` | 12.5 | 13.4 | 12.0 | also 14.0 on white fields, 11.8 on apricot chips |
  | Headings `#07194A` | 15.1 | 16.2 | 14.4 | |
  | Supporting text `#4A5B78` | 6.1 | 6.6 | 5.9 | 5.4 on the muted track fill |
  | Ink (links, quiet buttons) `#0B2560` | 13.0 | 13.9 | 12.4 | ivory text on the ink button: 13.9 |
  | Error text `#A11D2B` | 6.9 | 7.4 | 6.6 | |
  | Control edges `#76829A` (need 3:1) | 3.5 | 3.7 | 3.3 | 3.9 on white fields |
  | Focus ring, selected borders, check marks (ink) | 13.0 | 13.9 | 12.4 | |
  | Apricot `#FCBC88` | 1.5 | 1.6 | 1.4 | decorative only, deliberately below 3:1 |

  Hover and selected states use the tint with the same text and ink edges (rows above). Disabled controls are exempt and drawn at 45% opacity.
- **Type:** Manrope for the interface (labels, buttons, helper text, controls). A soft serif, Fraunces (upright 600 for headings, italic 500 for the short italic phrase), for the welcome, review and sample-feedback headings. Only those two Fraunces instances are requested (about 41 KB for the Latin subset, down from about 118 KB for the previous full-axis request), with metric-matched Georgia fallbacks (`size-adjust` 87% / 92.7%, measured) so the swap doesn't move the layout. The RB monogram stays DM Serif Display.
- **Surfaces:** a subtle paper grain and a few faint flowing contour lines painted behind everything (`PaperBackground`, one inline SVG plus a CSS noise tile; decorative, `aria-hidden`). The contours sit in the outer margins and fade out before the centre column, so they are never under reading text or controls. Cards have 26px corners, inner tiles 16px, thin borders, no heavy shadows or nested cards. "Continue to reading" is the only fully pill-shaped control.
- **The bookmark companion** (`src/components/reading/Companion.tsx`): a small apricot ribbon bookmark with a folded corner, a V-shaped lower edge, a tiny face, arms and feet. **I did not have the original character asset, only the written description and the reference mock-ups, so this is a new drawing made for the app from that description — it is not a copy of an existing file.** One SVG, four poses, no external file to download: *wave* beside the target card (waves twice on arrival, never a loop, still for reduced-motion users); *peek* over the corner of the content card; *listen* quietly in the recording controls (inline and tiny in the phone dock, so the dock is no taller); *celebrate* beside the review heading. It never covers text, controls or uploaded pages (checked with a bounding-box overlap script), has no speech bubbles, and is `aria-hidden` and unfocusable.
- **Layout:** welcome heading left-aligned on phones and centred on desktop; functional content left-aligned inside cards; about 16px between cards on phones, 24px on desktop. The target tiles are modest (numeral over "min"; Custom with an arrow).
- **Header:** compact, sticky and opaque. The serif RB monogram and small book illustration form the home button; on the welcome screens a compact outlined **Install app** control sits beside **Exit session** (when a session exists); in a sample session, "Sample session" and "Exit sample". No navigation menu. On very narrow phones the buttons tighten and (below 360 px) drop their icons so the row never overflows.
- **Footer:** "Your content stays in this tab. Nothing is uploaded." (this app, once installed) sits at the bottom of the viewport on short pages and follows the content on long ones. While a session exists, "Reloading or closing this tab clears your session." is added. The reserved space for the fixed Continue bar or recording dock sits below the footer, so the footer is never hidden behind either.
- **Motion:** newly revealed sections fade in gently; this, the recording pulse, the companion's wave and smooth gallery scrolling are switched off for people who prefer reduced motion.

## Install and offline (PWA)
Reading Buddy can be installed as an app on browsers that support it.
- **Install:** a compact "Install app" control in the header of the welcome screens (not in the page content) when the browser offers installation (Chrome, Edge, Android). On iPhone/iPad it opens a small popover with the steps: Safari → Share → Add to Home Screen. It's hidden once installed (standalone mode).
- **Manifest and icons:** `public/manifest.webmanifest` (standalone display, `#F6F2E8` theme and background), icons in `public/icons/`: ivory RB on ink blue with the apricot bookmark companion hanging above the B (192, 512, maskable 512, Apple 180 and a 32px favicon).
- **Offline:** `public/sw.js` caches the app shell (start page, built scripts and styles, fonts, icons). After one online visit the app opens and works offline, including recording and playback; if nothing is cached yet, `offline.html` explains. An in-app note appears while offline.
- **Updates are detected by build, not by a hand-edited number.** The service worker is a template (`tools/sw/sw.template.js`); every production build stamps it (`tools/sw-plugin.ts`) with an id derived from the hashed names of all built scripts and styles plus the contents of the files in `public/`, and with the exact list of files to precache. Same code → same worker; any change → a new worker, which browsers detect (the page also checks whenever you return to the tab, and registers with `updateViaCache: "none"`). The build fails loudly if the template's placeholders disappear.
- **Updates never interrupt anyone.** A new worker installs but waits (install never calls `skipWaiting`); the running version keeps serving its own caches. "A new version of Reading Buddy is ready — Update now" is offered **only on the welcome screens with no session, target, content or recording**, and the update is applied only by pressing it (or once every copy of the app has been closed).
- **Cache housekeeping is limited to Reading Buddy's own caches** (`reading-buddy-<build>-shell`, `reading-buddy-<build>-assets`, `reading-buddy-fonts`, and the first release's `rb-v<n>-…` names). Other caches on the same origin are never read or deleted.
- **Privacy is unchanged:** the service worker never stores passages, page photos or recordings (they're in-memory `blob:` URLs it never sees). Installing doesn't make sessions persist — closing the app clears them, and the wording says "app" instead of "tab" when installed.
- The service worker only registers in production builds (not on the dev server). `vite preview` can't run this app's Cloudflare-targeted build; to test it locally build with `NITRO_PRESET=node-server npx vite build` and run `node .output/server/index.mjs`.

## Not connected yet
- Automatic text extraction from photos.
- Live AI analysis of recordings.
- No servers, paid services or AI providers are used. Passage text, photos and recordings stay in the current browser tab (the only outside request is the Google Fonts stylesheet).

## AI feasibility lab (development only)
`npm run lab` opens a separate test screen for checking whether free, on-device speech recognition (Whisper via Transformers.js) and OCR (Tesseract.js) could support Reading Buddy. It lives in `lab/`, has its own dev server and is never part of the production build. The public app and its sample feedback are unchanged and no AI is connected to them. See `lab/README.md` and `lab/RECORDING_SCRIPT.md`.

## Run it
```bash
bun install
bun run dev
```
Or, without Bun: `npm install --no-package-lock` then `npm run dev`. Open the local URL shown in the terminal (usually http://localhost:8080).

## AI assistance
The first version (code, layout, sample feedback text and README) was drafted with Lovable (an AI-assisted builder) from my written brief. Later refinements on the `feature/guided-reading-flow` branch — the guided flow, the editorial visual pass, the RB redesign with progressive disclosure and the sample session, and the ink-blue/ivory/apricot refinement with the bookmark companion — were made with Claude Code from my briefs and reference mock-ups. Product direction, tone and review are mine.

## Testing
See `TESTING_LOG.md`. Never commit real recordings or API keys.

`npm test` runs two routing smoke tests (`src/test/app-routing.test.tsx`). They had failed since the Lovable template because the root route renders a full `<html>` document, which React can't mount inside the test's `<div>`, so nothing rendered and they never exercised the app. The test now swaps only that document shell for a passthrough; the real routes render (the welcome heading and the 404 page) and both tests pass.

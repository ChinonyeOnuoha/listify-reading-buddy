# Architecture

## Stack
A client-side React 19 app using TanStack Start/Router (one route, `src/routes/index.tsx`), Vite, Tailwind CSS v4 and Radix UI primitives (dialogs, menus, popover), with lucide icons. Tests use Vitest and Testing Library. The project was generated on Lovable and is built for Cloudflare by default (`npm run build`); `NITRO_PRESET=node-server npm run build` makes a build that runs locally with `node .output/server/index.mjs`.

Main parts:
- `src/routes/index.tsx` — the session state (target, content, recording) and the screens' wiring.
- `src/components/reading/` — one component per step (`TargetCard`, `PrepareStep`, `PageGallery`, `ReadStep`, `ReviewStep`, `SampleSession`, `SampleFeedback`), `useRecorder` (recording), `Companion` (the bookmark character).
- `src/lib/pwa.ts` — install, offline and update state. `tools/` — the service-worker template and the build plugin that stamps it.
- `lab/` — the development-only AI feasibility lab (see [ai-feasibility.md](ai-feasibility.md)); it has its own Vite root and is not part of the app.

## How recording works (and why)
The first version used the browser's MediaRecorder, which writes compressed audio. That can't give a dependable pause-and-listen: a half-finished compressed file isn't guaranteed to play (Safari's MP4 may only be finalised when recording stops), and gluing separately recorded compressed files together doesn't make a valid file. So the recorder now captures raw audio samples with Web Audio (an AudioWorklet, with a ScriptProcessor fallback for older browsers), keeps them in this tab's memory at 16 kHz mono (~2 MB per minute), and builds a standard WAV file whenever something needs to play — for "Listen so far" and for the final recording. Pausing simply stops adding samples, so there's no artificial silence and nothing is duplicated. Nothing is uploaded and no paid service is involved.

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

## Privacy and network behaviour
Reading Buddy has no accounts, database or backend of its own for user content. Passages, page photos and recordings exist only as in-memory data (`blob:` object URLs and arrays) in the current tab or installed app window; closing or reloading it discards them. The app does **not** upload recordings or content anywhere, and no content is sent for AI processing.

What was checked, and how:
- **Source inspection:** the app code (`src/`, excluding tests) contains no `fetch`, `XMLHttpRequest`, `sendBeacon` or WebSocket calls for user content. The only `fetch` is the server entry's request handler.
- **Observed on a real page load (dev server, 2026-10-08):** besides the app's own files, the page requests **one Google Fonts stylesheet from `fonts.googleapis.com` and four font files from `fonts.gstatic.com`** (DM Serif Display, two Fraunces files, Manrope). Loading fonts this way means Google receives ordinary request details such as the visitor's IP address and browser. They could be self-hosted to remove this; that has not been done. The production build's head and service worker were also read and reference only these hosts.
- **Service worker:** caches the app's own files and the Google Fonts responses. It never sees passages, photos or recordings.
- **Lovable's editor preview:** the app's error boundary forwards a runtime error's message, stack and route path to a reporting hook *if* one exists on the page (`src/lib/lovable-error-reporting.ts`). That hook is only present inside Lovable's editor preview; it is not part of this app, and what Lovable's tooling does with it was not inspected. No passage, photo or recording content is passed to it.
- **Not checked:** requests made by a hosting platform's own scripts or headers outside the app's code, and any browser extension behaviour.

The development lab is separate: it downloads speech and OCR model files from public CDNs and runs them locally in the browser. The only cloud-AI step in the project's history was one manual comparison done by hand outside the app, described in [ai-feasibility.md](ai-feasibility.md).

## Production build excludes the lab and notes
The lab lives outside `src/` and is never imported by the app. Each time the build is checked, `.output/` is searched for lab and model code (transformers, whisper, tesseract, `asr.worker`, `lab/`) and for the documentation files; none appear. The app has no route or link to the lab.

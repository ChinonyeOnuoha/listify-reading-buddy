# Reading Buddy

**Reading Buddy is a conceptual portfolio project: a reading-practice prototype.** You choose how long you want to read, bring a passage, record yourself reading it aloud, and listen back. A small bookmark companion keeps you company. It explores what gentle, AI-assisted reading practice could feel like — but the AI parts are **not connected yet**.

It began as *Listify: Reading Buddy*, a separate project inspired by my earlier [Listify to-do app](https://listify-a-to-do-app.vercel.app/) ([repository](https://github.com/ChinonyeOnuoha/Listify--A-To-do-App)), which this repository does not change.

## What works today
- **Guided session:** set a reading target (5, 10, 15 minutes or your own), then paste text or upload photos or screenshots of pages. Each step appears only when it is needed.
- **Pages:** upload several pages, reorder, replace or remove them from a per-page menu, and read them one at a time. While reading, **zoom and pan each page on its own** (buttons, pinch, drag, keyboard) without enlarging the recording controls.
- **Recording:** record with the microphone, **pause and resume** (paused time doesn't count), **listen so far** while paused, finish, or upload an audio file instead. Time against your target is tracked, and reaching the target never cuts you off.
- **Playback:** listen back on the review screen; re-record or start a new session (each asks first).
- **Sessions:** the logo returns home and **Resume session** brings you back; **Exit session** is the only way to discard everything.
- **A sample session** to look around without a microphone, with clearly labelled, made-up sample feedback.
- **Installable and offline-capable** as a web app in supported browsers.

## What is not connected yet
- **No live AI feedback.** Nothing analyses your recording. The "sample feedback" screens are invented examples, labelled as illustrative.
- **No automatic text extraction** from page photos: uploaded pages are shown as images for you to read from.

## Privacy and your session
Your passage, page photos and recordings stay in this browser tab (or the installed app window). They are kept in memory only, are **not uploaded**, and nothing is sent for AI processing. **Closing or reloading the tab clears the session** — nothing is saved between visits.

Loading the page does contact Google Fonts for its typefaces (one stylesheet and four font files), so Google sees ordinary request details such as your IP address. Details, and what was and wasn't checked, are in [docs/architecture.md](docs/architecture.md#privacy-and-network-behaviour).

## Try it locally
```bash
bun install        # or: npm install --no-package-lock
bun run dev        # or: npm run dev   → http://localhost:8080
npm test           # unit tests
```
A production build is `npm run build`; to run one locally use `NITRO_PRESET=node-server npm run build` then `node .output/server/index.mjs`.

A development-only experiment checks whether free on-device speech recognition could support future feedback (`npm run lab`; the terminal shows the local address). It is not part of the app, its production build or its navigation. See [docs/ai-feasibility.md](docs/ai-feasibility.md) for what it found and what that does and doesn't show.

## Documentation
- [User flow and behaviour](docs/user-flow.md) — what each screen does and the rules behind it
- [Design system](docs/design-system.md) — palette, type, surfaces, the bookmark companion and its interaction
- [Architecture](docs/architecture.md) — structure, how recording and the offline app work, privacy and network behaviour
- [Accessibility notes](docs/accessibility.md) — what is built in and what is not yet verified
- [AI feasibility summary](docs/ai-feasibility.md) and [lab README](lab/README.md)
- [Testing record](TESTING_LOG.md) — what was tested, limits, decisions, known issues

Earlier, more detailed working notes were condensed from the current files; the originals remain in the repository's Git history.

## AI assistance
Lovable created the initial implementation. Claude supported later development. ChatGPT supported exploration and design iteration. Product direction, design decisions and evaluation are mine.

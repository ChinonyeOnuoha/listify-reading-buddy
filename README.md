# Reading Buddy

**Reading Buddy is a conceptual portfolio project: a reading-practice prototype.** You build a quiet night-time reading nook — how long you’ll read, what you’re reading, a cushion — and the lamp comes on. Then you read aloud, record yourself and listen back. Buddy, a small bookmark, keeps you company. It explores what gentle, AI-assisted reading practice could feel like — but the AI parts are **not connected yet**.

It began as *Listify: Reading Buddy*, a separate project inspired by my earlier [Listify to-do app](https://listify-a-to-do-app.vercel.app/) ([repository](https://github.com/ChinonyeOnuoha/Listify--A-To-do-App)), which this repository does not change.

## What works today
- **A nook that builds itself.** Each choice appears in an illustrated reading room beside the panel: the clock shows your minutes, your reading lands on the chair, the cushion takes its colour, and the lamp warms toward the chair last. The nook is remembered, so a returning visit says “Welcome back” and skips what’s already set.
- **Three short steps, one action at a time.** Reading time (5, 10, 15 or any whole number from 1 to 180), what you’re reading, and one of eight cushion colours. A summary then lets you **Change** any one thing and come straight back, without repeating setup.
- **Paste text or photograph pages.** Pages sit in a sideways strip of small thumbnails that never pushes the layout around. Tap a page and move it **Earlier** or **Later** (or drag it), replace or remove it, and **add the words on a page** so screen readers can read them and they can be enlarged while reading.
- **Reading and recording.** A calm reading screen with resizable text or zoomable pages and nothing that moves on its own. Record with the microphone, **pause and resume** (paused time doesn’t count), listen to what you’ve recorded while paused, finish, or upload a recording. Reaching your time never cuts you off.
- **Listen back** with a simple player. Record again, start a new session or delete the recording; deletes offer **Undo**.
- **Optional AI feedback for adults.** In the main practice, after a recording, an adult can choose AI feedback. It compares what was read aloud with the passage and points out moments worth listening back to, such as a repeated word or a longer pause, as moments to check, never as mistakes. Before anything is sent, a short explanation says where the recording goes and that the transcription service may use it to train its models, and the adult confirms they’re 18 or over and reading in their own voice. Nothing is sent until they ask for feedback on a recording, and the choice can be changed at any time. The children’s corner never uses it.
- **A children’s corner** for readers of about 8 to 12: a grown-up can set an optional, gentle reading time, the child picks a beanbag and one of eight openly licensed picture stories (from African Storybook, Book Dash and StoryWeaver) or brings their own, a lantern lights the corner, and after reading “How was reading?” offers 😊 Easy, 🙂 A bit hard or 🤔 Not sure, with no scores or claims. It keeps its own content and recordings. See [docs/children-corner.md](docs/children-corner.md).
- **A three-step sample** to look around without a microphone, with clearly labelled, made-up sample notes shown one at a time.
- **Saved on this device:** see what’s kept and how much room it takes, delete one thing (with Undo) or everything, or forget the nook.
- **Optional sound:** soft cues for the lamp, the cushion and turning pages, off until you switch it on and silent while recording.
- **Installable and offline-capable** as a web app in supported browsers.

## Not included yet
- **No automatic text extraction** from page photos: uploaded pages are shown as images for you to read from. Adding the words on a page makes them readable aloud by screen readers and lets AI feedback use them.

## Privacy and your device
Your passage, page photos, recordings and the nook’s choices are **kept on this device**, in this browser, so they’re there next time. They are **not uploaded**. The one exception is optional AI feedback in the main practice: only when an adult has chosen it and asks for feedback on a recording is that recording’s audio sent (never the passage or the photos), and Reading Buddy asks the service to delete it once the notes are ready (the service may already have kept a copy to train its models, as the explanation says). The children’s corner never sends anything. Anyone using the same browser can open what’s saved; **Saved on this device** (in the header) lists and deletes it. All fonts are part of the app. Details are in [docs/architecture.md](docs/architecture.md#kept-on-this-device).

## Try it locally
```bash
bun install        # or: npm install --no-package-lock
bun run dev        # or: npm run dev   → http://localhost:8080
npm test           # unit tests
```

## Documentation
- [User flow and behaviour](docs/user-flow.md) — what each screen does and the rules behind it
- [Children’s reading corner](docs/children-corner.md) and its [story manifest and licence review](docs/children-corner-content.md)
- [Design system](docs/design-system.md) — the night-garden palette, type, components, the nook, Buddy and motion
- [Architecture](docs/architecture.md) — structure, how recording, AI feedback and the offline app work, privacy and network behaviour
- [Accessibility notes](docs/accessibility.md) — what is built in and what is not yet verified

## AI assistance
Lovable created the initial implementation. Claude supported later development. ChatGPT supported exploration and design iteration. Product direction, design decisions and evaluation are mine.

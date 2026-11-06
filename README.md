# Reading Buddy

**Reading Buddy is a conceptual portfolio project: a reading-practice prototype.** You build a quiet night-time reading nook — how long you’ll read, what you’re reading, a cushion — and the lamp comes on. Then you read aloud, record yourself and listen back. Buddy, a small bookmark, keeps you company. It explores what gentle, AI-assisted reading practice could feel like, with optional AI feedback for adults.

It began as *Listify: Reading Buddy*, a separate project inspired by my earlier [Listify to-do app](https://listify-a-to-do-app.vercel.app/) ([repository](https://github.com/ChinonyeOnuoha/Listify--A-To-do-App)), which this repository does not change.

## What works today
- **A nook that builds itself.** Each choice appears in an illustrated reading room beside the panel: the clock shows your minutes, your reading lands on the chair, the cushion takes its colour, and the lamp warms toward the chair last. The nook is remembered, so a returning visit says “Welcome back” and skips what’s already set. On phones the nook stays in view at full size during setup, and the step scrolls beneath it, so each change can be seen as it happens.
- **Three short steps, one action at a time.** Reading time (5, 10, 15 or any whole number from 1 to 180), what you’re reading, and one of eight cushion colours. A summary then lets you **Change** any one thing and come straight back, without repeating setup.
- **Paste text or photograph pages.** Pages sit in a sideways strip of small thumbnails that never pushes the layout around. Tap a page and move it **Earlier** or **Later** (or drag it), replace or remove it, and **add the words on a page** so screen readers can read them and they can be enlarged while reading.
- **Reading and recording.** A calm reading screen with resizable text or zoomable pages and nothing that moves on its own. Record with the microphone, **pause and resume** (paused time doesn’t count), listen to what you’ve recorded while paused, finish, or upload a recording. Reaching your time never cuts you off.
- **Listen back** with a simple player. Record again, start a new session or delete the recording; deletes offer **Undo**. The nook’s summary opens your last recording, and says when it has notes.
- **Optional AI feedback for adults.** In the main practice, an adult can turn on AI feedback and ask for notes on a recording. One set of notes for every reading, read top to bottom:
  - **Pace:** one plain sentence and a small chart of words a minute every 20 seconds, with the part where the pace changed marked. Pauses aren’t counted as slow.
  - **Moments to listen to:** pauses of 1.5 seconds or more inside a sentence, and stretches of 3 or more words that weren’t heard or were repeated. They’re marked on a strip of the recording and all listed below it, each with **Play from** that moment.
  - **One thing to try** on a next passage, and one line on what isn’t checked: pronunciation, accent and single words, which speech recognition often mishears.
  - **Notes stay with their recording.** They’re saved on the device with it, still shown after AI feedback is turned off, and deleted with it. Deleting a recording that has notes asks first, and recording again says its notes will be replaced.
  - **On or off in one place:** a quiet row at the bottom of the card says “AI feedback is on” or “off”. Changing it opens a short sheet with On and Off; choosing Off says what happens before you confirm. Turning it on is one page that says what happens to recordings (including that the transcription service may use them to train its models), with one tick box for being 18 or over, reading in your own voice and agreeing. Nothing is sent until you ask for notes. The children’s corner never uses it.
- **A children’s corner** for readers of about 8 to 12: a grown-up can set an optional, gentle reading time, the child picks a beanbag and one of eight openly licensed picture stories (from African Storybook, Book Dash and StoryWeaver) or brings their own, a lantern lights the corner, and after reading “How was reading?” offers 😊 Easy, 🙂 A bit hard or 🤔 Not sure, with no scores or claims. It keeps its own content and recordings. See [docs/children-corner.md](docs/children-corner.md).
- **A three-step sample** to look around without a microphone, with clearly labelled, made-up sample notes shown one at a time.
- **Saved on this device:** see what’s kept and how much room it takes, open a reading to listen back (it says when a recording has AI notes), delete one thing (with Undo) or everything, or forget the nook.
- **Optional sound:** soft cues for the lamp, the cushion and turning pages, off until you switch it on and silent while recording.
- **Installable and offline-capable** as a web app in supported browsers.

## Not included yet
- **No automatic text extraction** from page photos: uploaded pages are shown as images for you to read from. Adding the words on a page makes them readable aloud by screen readers and lets AI feedback use them.

## Privacy and your device
Your passage, page photos, recordings, their AI notes and the nook’s choices are **kept on this device**, in this browser, so they’re there next time. They are **not uploaded**. The one exception is optional AI feedback in the main practice: only when an adult has turned it on and asks for notes on a recording is that recording’s audio sent (never the passage or the photos), and Reading Buddy asks the service to delete it once the notes are ready (the service may already have kept a copy to train its models, as the turn-on page says). The children’s corner never sends anything. Anyone using the same browser can open what’s saved; **Saved on this device** (in the header) lists and deletes it. All fonts are part of the app. Details are in [docs/architecture.md](docs/architecture.md#kept-on-this-device).

## Documentation
- [User flow and behaviour](docs/user-flow.md) — what each screen does and the rules behind it
- [Children’s reading corner](docs/children-corner.md) and its [story manifest and licence review](docs/children-corner-content.md)
- [Design system](docs/design-system.md) — the night-garden palette, type, components, the nook, Buddy and motion
- [Architecture](docs/architecture.md) — structure, how recording, AI feedback and the offline app work, privacy and network behaviour
- [Accessibility notes](docs/accessibility.md) — what is built in and what is not yet verified

## AI assistance
Lovable created the initial implementation. Claude supported later development. ChatGPT supported exploration and design iteration. Product direction, design decisions and evaluation are mine.

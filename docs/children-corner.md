# Children’s reading corner

A small, separate space inside Reading Buddy where a child can pick a short illustrated story (or bring one they love), read it aloud, and listen back. It is a **conceptual reading-practice prototype**: it does not assess, score or teach, it makes no claim about literacy, and nothing analyses a recording. Live AI feedback is not connected.

Related: [story manifest and review record](children-corner-content.md) · [user flow](user-flow.md) · [design system](design-system.md) · [accessibility](accessibility.md) · [architecture and privacy](architecture.md#privacy-and-network-behaviour).

## The flow
1. **Set a reading time?** For grown-ups, and optional: **Off**, 5, 10 or 15 minutes. It is a gentle guide that never counts down or stops the reader; the recording card shows the time a grown-up set and a quiet progress bar, and never says “target reached”. **Hand over to the reader**.
2. **Pick your beanbag.** Eight colours with their names (Ginkgo, Marigold, Clay, Blossom, Plum, Lilac, Sky, Cream). The beanbag in the nook changes as each one is tried.
3. **Where shall we go today?** A segmented control: **Pick a story** or **Bring your own**.
   - **Pick a story** shows the eight covers in a grid with title and length (“Short · 316 words”). Theme filters (*All*, *Tales and adventures*, *Funny*, *Everyday life*, *Nature*, *Science*; only themes the collection has) are chips that wrap onto a second line when needed. Length uses the full reading length, including any pages printed after the story, so a story is never called shorter than it reads.
   - Choosing a cover opens **one fixed-size story window**: the title, then a segmented control, **Story** (cover, short description, length) and **About this book** (who made it, copyright, licence and source links, the source’s own attribution wording, the Book Dash logo for Book Dash stories, other credits the book prints, and what was changed for this app). The two views share one space and crossfade, so the window never changes size. **Read this story** is the one main action. Opening and closing it changes nothing.
   - **Bring your own** works like the main practice (paste text, or photos of pages in a sideways strip with Earlier, Later and ⋯), with child-friendly wording, “A grown-up can help.” The corner keeps its own text and photos: nothing from the main practice appears here, and nothing from here appears there. **Light the lantern**.
4. The **lantern lights the beanbag**, and **Your corner is ready** lists reading time, beanbag and story, each with **Change** (which opens only that step and returns here). **Open the story**.
5. **Reading.** The story fills the screen with its picture and its words as real text in Andika. The toolbar holds **← Nook**, **A− / A+**, **About this story** and Previous, “Page n of N”, Next. The recording card (or the dock on narrow screens) offers **Start recording** · Upload a recording, then **Pause** · I’ve finished, and **Resume** · I’ve finished. Nothing on the page moves or highlights on its own.
6. **You made time to read.** The story’s title and the recording’s length, the player, and **How was reading?**: compact chips 😊 Easy · 🙂 A bit hard · 🤔 Not sure (visible words; the emoji are hidden from screen readers). Choosing one marks it with an amber ring and only then opens a short response (a dialog on wide screens, a bottom sheet on narrow ones):
   - **Easy**: “Ready for another?” · *Choose a story* / *Not now*.
   - **A bit hard**: “That’s okay.” “Would you like a shorter story next?” · *Find a shorter story* (or *Browse short stories* for the child’s own content) / *Not now*.
   - **Not sure**: “That’s okay too.” “You can listen again, or pick another story.” · *Listen again* / *Choose a story*.

   *Find a shorter story* opens the stories with a removable chip, “Shorter than ‘…’”, comparing word counts only and never calling a story easier; if nothing is shorter it says so and offers the whole collection. *Browse short stories* uses the collection’s own short-read category (up to 420 words). Below: **Choose another story** (the main action), **I’m done for now** (home), and ⋯ with *Record again* and *Delete recording*.

### Steady page turns
The story’s pages are stacked in one grid cell (inactive pages are invisible, `aria-hidden` and `inert`), so the reading area is as tall as the longest page and nothing around it moves between pages. Pages a book prints after the story (tide-pool notes, a laughing game, science notes, story notes) are stacked separately, carry a label (“Science notes · after the story”) and a heading, so one long notes page never makes every story page tall. The picture has a reserved slot that exists before it loads and stays if it fails; a failed picture says so accurately and offers **Try the picture again**, and on a picture-only page its description takes its place. The next and previous pictures are preloaded. After a turn the reading scrolls only if the start of the new page is out of view. Focus stays on the button used and moves to the other one at the first or last page. Only “Page n of N” is announced, never the passage. Page turns never touch the recording.

There are no scores, rankings, streaks, badges or claims about pronunciation, intelligence or ability, and the app does not say “well done” on the child’s behalf as a judgement.

## Keeping, leaving and deleting
- **Separate from the main practice.** The corner has its own recorder, recording, pasted text and page photos.
- **Kept on this device.** The chosen story and the page reached, the child’s own text and photos and the recording are saved in this browser and come back on the next visit; the beanbag and reading time are remembered too. Nothing is uploaded. **Saved on this device** (in the header) lists them and deletes them.
- **Choosing a different story** when a recording exists deletes that recording, with **Undo** for six seconds. Reading the same story again keeps it.
- **Leaving mid-recording** (← Nook, the logo, Saved or the browser’s Back) asks “Finish recording and go back?”; finishing keeps the recording, and Keep reading changes nothing.
- **Privacy:** stories and covers are served from the app itself, and the corner adds no third-party requests. There are no accounts, names, birth dates, public sharing, analytics, profiles or paid services. The microphone is requested only after *Start recording*, with a short explanation first. The feeling chosen in “How was reading?” is not stored.

## Who it is for
The audience is a **design hypothesis, not a validated claim**: independent readers around 8–12, as briefed. Measuring the eight stories (see [children-corner-content.md](children-corner-content.md)) shows a wide spread of language and length, which is the point of the mix, and does not validate any age:

- Their Flesch–Kincaid grade runs from about 2.4 (*A Fish and a Gift*) to 6.4 (*Searching for the Spirit of Spring*), and the stories run from about 260 words (*Whoop*) to about 830 words plus 354 of science notes (*Sailing Ships and Sinking Spoons*). Short sentences do not make a story easy: unfamiliar names and place words, idioms, sound-effect spellings and dependence on the pictures all add demand.
- Several of the easier-reading stories will suit different children than the longest ones; some may be better read aloud with an adult.
- These are readability measures of the text only. They say nothing about themes, interest, or any individual child, and no children have tried the corner. Suitability needs review by educators or parents and testing with children.

## What it does not do
No live feedback of any kind; no transcription; no reading-level tracking; no offline pictures (the story text is part of the app’s scripts, but the pictures are fetched when a page is shown); no audio of the stories themselves.

## Where things live
- `src/routes/index.tsx` — the corner’s screens and how they connect; `src/components/app/` — the shared screens (setup steps, story window, reader, recorder, listen back).
- `src/components/children/` — the story reader, credits and the About dialog.
- `src/content/stories/` — manifest, loaders and the eight text modules (loaded one at a time, only when a story opens).
- `public/stories/<slug>/` — optimised pictures (loaded lazily, page by page).

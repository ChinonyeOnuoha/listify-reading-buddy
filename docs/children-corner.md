# Children’s reading corner

A small, separate space inside Reading Buddy where a child can pick a short illustrated story (or bring one they love), read it aloud, and listen back. It is a **conceptual reading-practice prototype**: it does not assess, score or teach, it makes no claim about literacy, and nothing analyses a recording. Live AI feedback is not connected.

Related: [story manifest and review record](children-corner-content.md) · [user flow](user-flow.md) · [design system](design-system.md) · [accessibility](accessibility.md) · [architecture and privacy](architecture.md#privacy-and-network-behaviour).

## The flow
1. **A doorway** on the welcome screen: “A doorway to stories — A reading corner for children — Step inside →”. A quiet text action, secondary to the main target card (beside it on wide screens, a compact row below it on phones). It never requires choosing an adult reading target. The art is the approved apricot doorway with its starry interior.
2. **Where shall we go today?** Two choices — *Pick a story* and *Bring your own* — in a segmented control. Picking shows a small grid of illustrated covers (two across on phones, four on wide screens) with a title and a length (“Short read · 406 words”). Filters are *All*, *Folktales* and *Real world*: only categories the collection actually has. No search (there are eight stories). Selecting a cover opens a short preview with its summary, attribution line and **Read this story**, plus **About this story** (full credit and licence). Nothing starts and the microphone is not requested.
3. **Bring your own** reuses the adult paste-text and upload-pages steps with child-friendly wording (“Bring a story you love. Paste a passage or add photos of your pages.”): the same two drafts, selected borders and checkmarks, page menu, **+ Add pages**, **Change content**, gallery and image zoom. Once content exists its preview takes priority and the large chooser collapses. There is no timed target.
4. **Read and record** reuses the proven recorder screen: start recording or upload audio → pause → *Listen so far* → resume into the same recording → finish → playback. Only the controls that apply are shown. On wide screens a compact panel sits beside the story; on phones a compact opaque dock stays anchored to the visible screen and the page reserves its height. There is no target, countdown or progress bar — just the state and the recorded time. For built-in stories the passage is real text with a picture (not text inside images), with **A−/A+** text-size controls (five steps; only the story text changes size) and a one-line “Page 1 of 12” counter. Uploaded pages stay in the zoomable viewer. The companion is still here.
5. **You made time to read.** Playback (play/pause, seek, duration), then an optional **How did that feel?** — *Comfortable / A little tricky / Not sure* — the child’s own impression, kept only in this session’s memory, not an assessment, and it can be cleared. Then **Choose another story**, **I’m done for now** and a quieter **Record again** (which asks before replacing the recording).

There are no scores, rankings, streaks, badges or claims about pronunciation, intelligence or ability, and the app does not say “well done” on the child’s behalf as a judgement.

## Sessions, navigation and privacy
- **Two separate sessions in the same tab.** The main (adult) session and the children’s session have their own recorder, content, recording and review state. Entering or leaving the corner never reads or writes the other session.
- **Home preserves.** The logo (or *I’m done for now*) returns to the main welcome screen and keeps both sessions. *Step inside* returns to exactly where the child left off — a finished recording opens in review; recording is never restarted.
- **Leaving mid-recording** explains that the recording will be finished and kept, and cancelling changes nothing. Browser Back does the same thing (it stays put and asks first).
- **Browser Back/Forward** move in and out of the corner (it has its own history entry); playback pauses on every navigation and never autoplays on return.
- **Exit session** is the only way to discard, and it states its scope: inside the corner it clears only the children’s session (and says the main session isn’t affected); on the main screens it clears only the main session (and says the children’s session isn’t affected). Cancelling changes nothing; focus starts on the safe choice.
- **Choosing another story** keeps the recording (“Your recording of … is saved for now. Listen back”). Starting a *different* reading replaces it only after a clear choice (*Replace and read* / *Keep my recording*).
- **Privacy:** stories, covers and the doorway are served from the app itself — no third-party requests are added. Everything the child does (choices, recordings, own pages, reflection) stays in this tab’s memory and is never uploaded. No accounts, names, birth dates, public sharing, analytics, profiles or paid services; the microphone is requested only after *Start recording*. Closing or reloading the tab clears everything.

## Who it is for
The audience is a **design hypothesis, not a validated claim**: independent readers around 8–12, as briefed. Measuring the eight stories supports a narrower, lower suggestion:

- Their Flesch–Kincaid grade is about 3.8–7.0 (median 4.7) — short sentences, familiar words. That points to children who can read short paragraphs on their own, **roughly 7–10 years old**, as the core fit.
- **11–12-year-olds** will probably find most of the collection easy; the *Real world* titles and *Hare and Tortoise (Again!)* are the most demanding. A collection for that range would need longer, richer texts than these.
- **Younger children (about 5–7)** may enjoy the stories read aloud with an adult but are unlikely to read them independently.
- These are readability measures of the text only. They say nothing about themes, interest, or any individual child, and no children have tried the corner. Suitability needs review by educators or parents and testing with children.

## What it does not do
No live feedback of any kind; no transcription; no reading-level tracking; no stored history; no offline pictures (the story text is part of the app’s scripts, but the pictures are fetched when a page is shown); no sound effects; no audio of the stories themselves.

## Where things live
- `src/components/children/` — the corner’s screens, the doorway and the separate session hook.
- `src/content/stories/` — manifest, loaders and the eight text modules (loaded one at a time, only when a story opens).
- `public/stories/<slug>/` — optimised pictures (loaded lazily, page by page); `public/illustrations/doorway.png`.

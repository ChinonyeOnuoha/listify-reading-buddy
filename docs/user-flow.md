# User flow and behaviour

What each screen does and the rules behind it. For the design language see [design-system.md](design-system.md), for how it is built see [architecture.md](architecture.md), and for accessibility see [accessibility.md](accessibility.md). The children’s corner is described in more detail in [children-corner.md](children-corner.md).

## The shape of the app
Every screen except reading has the same two parts: the **nook**, an illustrated reading room, and a **panel** beside it. Each choice in the panel changes something in the nook (the clock shows the minutes, the reading appears on the chair, the cushion takes its colour), and the lamp comes on last, warming toward the chair. On wide screens (900 px and up) the nook and the panel sit side by side at full height: only the panel’s content scrolls, and its main button stays pinned at the bottom. On narrower screens the nook sits above the panel and the page scrolls, with the main button kept in view at the bottom of the panel.

Each screen has **one main action** and at most one quieter alternative. Anything else is in a **⋯ More** menu.

The header holds the RB logo (home), the name of the corner you are in, **Sound** and **Saved on this device**.

## Home
“Who’s reading today?” with three identical, left-aligned choices:
- **Practise reading aloud**: the main practice. Once set up, its line shows your minutes and cushion.
- **Children’s corner**: picture stories, or bring your own. Once a story is chosen, “Carry on with …”.
- **Try a sample**: how it works, no microphone needed.

After something has been set up, home says “Welcome back. Your nook is just as you left it.” The footer says that everything is saved on this device only, and offers **Install app** where the browser supports it.

## Main practice
Setup is three steps, shown as “Step n of 3 · name” with a thin segmented bar. Steps already answered on an earlier visit are skipped.

1. **Reading time.** 5, 10 or 15 minutes, or **Other**, which opens a minutes field with − and + buttons (5 minutes each). Any whole number from 1 to 180 works; anything else shows “Enter a whole number from 1 to 180.” and Continue waits. Only recorded time counts, and reaching the time never stops anything. The clock in the nook shows the minutes as you choose.
2. **What are you reading today?** **Paste text** (selected to begin with) or **Photos of pages**.
   - Pasted text goes in a plain text box that starts empty, with a hint inside it and, where the browser allows, **Paste from clipboard**.
   - Photos and screenshots of pages sit in a strip of small, fixed-size thumbnails that scrolls sideways inside the panel, with **Add** at the end and a fade at the edge to show there are more. Adding pages never makes the panel or the nook grow. Each thumbnail shows its page number.
   - **Reordering:** tap a page to select it (it gets an amber ring), then use the one toolbar below the strip: **Earlier**, **Later** and **⋯** (Add the words on this page, Replace photo, Remove page). Pages can also be dragged. Each move is announced (“Page 1 moved to position 2 of 3.”).
   - **Add the words on this page** stores the page’s words. Screen readers read them, and they appear as resizable text under the photo while reading. A small green dot on the thumbnail marks pages with words.
   - Removing a page is immediate, with **Undo**. Files that can’t be opened as images are refused with a message, so every page in the strip is usable.
3. **Get comfortable.** Choose one of eight cushion colours (Ginkgo, Marigold, Clay, Blossom, Plum, Lilac, Sky, Cream), or **Skip for now**. The cushion appears in the nook as you try each colour.

Then the **lamp comes on**, warming toward the chair, and the panel shows **Your nook is ready**: a short summary (reading time, your reading, cushion) with **Change** beside each, and **Sit down and read**. Change opens only that step, with **Back to your nook** and **Save**; both return to the summary. Setup is never replayed to change one thing.

### Reading
The reading fills the screen. A toolbar at the top holds **← Nook**, then the tools for what you are reading: **A− / A+** for text, and for photographed pages Previous, “Page n of N” and Next (each photo also has its own zoom and pan). Pages are stacked in one space and swap in place, so the toolbar and the recording controls never move. Text is shown as real, resizable text in a comfortable column, and nothing on the page moves or highlights on its own.

On wide screens the recording controls are a card beside the reading; on narrow screens they are a dock at the bottom. Both show the state, the recorded time against your minutes, a one-line hint and two buttons:
- **Start recording** · Upload a recording
- Recording: **Pause** · Finish
- Paused: **Resume** · Finish, with **Listen to what you’ve recorded**. Paused time doesn’t count.
- Recorded: **Listen back** · Record again (the new recording replaces the old one when you finish)
- Microphone unavailable: **Upload a recording instead** · Try the microphone again

The first time you start recording, a short explanation (“Buddy needs to hear you”) comes before the browser’s own microphone question. **← Nook** during a recording asks “Finish recording and go back?”; finishing keeps the recording. The logo and Saved ask the same.

### Listen back
“Have a listen back” with how long you recorded against your minutes, a player (play, pause and a position slider) and **Record again** as the main action. **⋯** holds See sample notes, Start a new session and Delete recording (and Change AI feedback choice once AI feedback is on). **← Your nook**, at the top, returns to the summary, which also offers “Listen to your last recording”. Deleting a recording, or starting a new session, is immediate and offers **Undo** for six seconds.

### Optional AI feedback (adults, main practice only)
A card under the player. Each state holds one action:
- **Not chosen yet:** a sentence on what it does and **About AI feedback**, which opens the explanation: where the recording goes (only its audio, to AssemblyAI on its EU servers), that AssemblyAI may use it to train its models, that Reading Buddy asks for it to be deleted once the notes are ready, that speech recognition can mishear, and that the children’s corner never uses it. The adult confirms they’re 18 or over and reading in their own voice, then chooses **Use AI feedback, knowing this** or **Keep recordings on this device**. The two choices are stacked, the main one on top, and stay in view while the explanation scrolls.
- **Off:** “AI feedback is off. Your recordings stay on this device.” with **Change**.
- **On:** **Get AI feedback on this recording**, with one line saying where it goes. Nothing is sent until this is pressed.
- **Working:** “Sending your recording…”, “Listening to your recording…”, then “Preparing your notes…”, with **Stop waiting** while it can still be stopped.
- **Notes:** a reminder that speech recognition can mishear, then each moment with its kind (for example “Moment to review — not a mistake”), the time in the recording, the words and a plain observation. Anything beyond the first few is behind **Show n more**, never hidden. An optional idea for the next passage comes last.
- **Paused or failed:** a plain reason (today’s limit, the free allowance used up, switched off, can’t be reached, too long, audio that couldn’t be used) and that recording and playback work as usual, with **Try again** where it can help.
- **Needs the words:** AI feedback compares the reading with the words, so it asks for pasted text, or for the words to be added on every photographed page.

The card keeps its height while it checks whether AI feedback is available, so the screen doesn’t jump.

## Children’s corner
Three steps, then the lantern. Covered in full in [children-corner.md](children-corner.md).
1. **Set a reading time?** For grown-ups: Off, 5, 10 or 15 minutes, as a gentle guide that never counts down or stops the reader. **Hand over to the reader**.
2. **Pick your beanbag.** The same eight colours.
3. **Where shall we go today?** **Pick a story** (eight picture stories with theme filters) or **Bring your own** (paste or photograph pages, exactly as in the main practice, but kept separately).

Then the lantern lights the beanbag, **Your corner is ready** (with Change on each line) and **Open the story**. After reading: **You made time to read**, the player, **How was reading?** (😊 Easy · 🙂 A bit hard · 🤔 Not sure), **Choose another story**, **I’m done for now**, and ⋯ (Record again, Delete recording).

## Sample
Three steps in one fixed space, with one button to move on:
1. **This is the reading screen**, with the sample passage. Recording is off.
2. **Then you listen back.** The sample has no demo audio, and says so.
3. **Notes Buddy could offer**: the six sample notes one at a time in a card, labelled “Sample · Note n of 6” with dots, each separating what was noticed from an optional idea for a new passage. **Next note**, then **Start my own session**.

The sample notes live in `src/lib/sample-feedback.ts`. They are invented examples on a sample passage, always labelled as samples, and never presented as analysis of anyone’s reading. Nothing in the app analyses a recording.

## Saved on this device
From the header. Lists what is kept (for each corner: what is being read, the recording’s length and the room it takes), the browser’s estimate of free space, and what the nook remembers.
- **Delete** (the bin beside an item) is immediate, with **Undo**.
- **Delete all readings and recordings** asks once: “Everything saved on this device will be removed, from both the main practice and the children’s corner. This can’t be undone.” Cancel is the default.
- **Forget my nook** asks once, then resets reading times, cushion and beanbag. Saved readings stay until deleted.

The first time something is saved, a message says so and where to delete it.

## Messages
Short messages appear at the bottom of the screen on wide screens and under the header on narrow ones (where the main buttons are at the bottom). A message with Undo stays for six seconds; others for four.

## Sound
Off until switched on in the header. Soft, short cues for the lamp and lantern, a cushion settling, pages added and pages turned. Silent while recording or listening back, and never the only sign that something happened.

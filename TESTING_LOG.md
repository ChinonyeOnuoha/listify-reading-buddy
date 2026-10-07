# Testing log

Record what actually happened. Leave blank until tested. Do not add recordings or keys here.

| Date | Device / browser | What I tried | Expected result | Actual observation | Limitations / notes |
|------|------------------|--------------|-----------------|--------------------|---------------------|
|      |                  |              |                 |                    |                     |
|      |                  |              |                 |                    |                     |

Suggested checks: set target · paste passage · add photo · record/stop/play/discard · deny mic access · upload audio · open sample feedback · mobile layout.

## 2026-10-05 — automated browser checks (headless Chromium, run by the AI builder)

| Device / browser | What I tried | Expected result | Actual observation | Limitations / notes |
|---|---|---|---|---|
| Desktop 1280px & mobile 390px, headless Chromium | Upload 2 page images, move page 1 down | Order swaps, numbering updates | Order became p2, p1 | Plain test images, not real photos |
| Same | Switch Upload → Paste → Upload → Paste | Pasted text and images both kept | Both kept | — |
| Same | Start recording ~2.5s, stop | Moves to Review with player | Moved to Review, audio player present | Uses Chromium's fake microphone; audio quality not checked |
| Same | Review → Back to reading → Edit passage → Review | Text and audio kept | Both kept | — |
| Same | Explore sample feedback → Next | Shows sample 2 of 6 only | Showed "Missing, added or replaced words" only | — |
| Same | Discard (confirm) → Upload audio instead (3s WAV) | Back to Read, then Review shows uploaded file | Review showed "Uploaded: a.wav" | — |
| Desktop headless, mic forced to fail | Start recording | Friendly mic message + upload option | Message shown | Real permission prompt not tested |

Not verified: real phones, Safari/iOS recording, real microphone audio, listening to playback.

## 2026-10-05 — guided-flow refinements (branch `feature/guided-reading-flow`, checked by Claude Code)

Run in the Claude desktop app's built-in browser (Chromium) against the local dev server, at desktop width and an emulated 375×812 phone. Steps were driven by scripts in the page; test images and WAV files were generated in the browser.

| Device / browser | What I tried | Expected result | Actual observation | Limitations / notes |
|---|---|---|---|---|
| Desktop, built-in Chromium | Clear the target field, type a new value | Field can be empty while typing; value kept | Field stayed empty, then kept 15 | — |
| Same | Before choosing an input method | No text box; Continue disabled with hint | No text box; Continue disabled | — |
| Same | Paste text → Continue state | Continue enabled | Enabled | — |
| Same | Switch to Upload with no pages | Photo note shown; Continue disabled, hint "Add at least one page" | As expected | — |
| Same | Upload 3 images, move page 1 down, page 3 up | Numbering follows the new order | A,B,C → B,A,C → B,C,A; first Up and last Down disabled | Generated images, not real photos |
| Same | Remove page 2, replace page 1 | Remaining pages renumber; replacement keeps its position | B,A → Z,A; previews loaded (600×800) | — |
| Same | Switch Upload → Paste → Upload | Text and pages both kept | Both kept | — |
| Same, **real mic request** | Start recording with the microphone blocked by the browser pane | Friendly message; upload becomes main action | Message shown; buttons became "Try the microphone again" / "Upload audio instead" (upload primary) | Real permission denial in this browser; the allow-prompt path was not tested |
| Same, **simulated mic** (440 Hz tone stream) | Start recording, set target 1 min, wait past 1:00 | Recording continues; target message | Still recording at 1:17, progress 100%, "Target reached 🎯 Keep going…" | Tone replaces the microphone; no voice recorded |
| Same, simulated mic | While recording | Passage read-only; Edit passage disabled; only Stop shown | As expected | — |
| Same, simulated mic | Stop recording | Moves to Review; duration shown | Review shown with "1:28"; copy "Reading done 🙌🏾 Have a listen back." / "AI feedback isn't connected yet." | — |
| Same | Inspect the recorded audio | Valid, playable file | Decoded as 88.3 s webm; player readyState 4 | Playback did not advance because the pane was hidden; **nobody listened to it** |
| Same | Review → Back to reading → Edit passage → Continue | Passage, target and recording kept | All kept; Read shows "Listen back / Record again / Upload audio" | — |
| Same | Record again / Upload audio with an existing recording | Confirm before replacing; focus on "Keep it" | Confirm shown; focus on "Keep it"; Keep it left recording intact | — |
| Same | Discard recording (confirm) | Recording cleared; back to Read | As expected | — |
| Same | Upload a 3 s WAV | Moves to Review with file name and duration | "Uploaded: my-reading.wav", 0:03 | File set via script, not a real file picker |
| Same | Explore sample feedback, step through all 6 | One sample at a time, labelled SAMPLE, status tag, words beside observation | One article at a time; tags: slip ×2, moment to review ×2, nothing found, couldn't assess; Next disabled at the end | — |
| Same | Start a new session (confirm) | Passage, pages and recording cleared; target kept | As expected | — |
| Same | Look for emojis inside any button | None | None found on the Read screen (script check) | Other screens checked by reading the code, not by script |
| Same | Network activity during the session | No uploads | Only localhost and the Google Fonts stylesheet | — |
| Emulated phone 375×812 | Read step, scrolled to the end | Dock doesn't cover passage; no sideways scroll | Passage ends at 500px, dock starts at 603px; no horizontal scroll | Emulated viewport, not a real phone |
| Same | Read with an existing recording; confirm open | Timer matches the recording; confirm fits | Timer 0:04 matches; dock about 326px tall while confirming | Dock is tall while confirming, but only briefly |
| Same | Review + sample feedback; Prepare with 2 pages | Readable, no overflow | Looked as intended in screenshots | — |

Automated: `tsc --noEmit` passes. `vite build` succeeds. `vitest`: 2 routing tests fail on both the original and updated code; the test setup can't mount the app's full-document root layout, so this is not caused by this change. `eslint`: only Prettier formatting errors and fast-refresh warnings, matching the existing code.

**Not verified (please check):** a real microphone (allow prompt, voice quality); actually listening to playback; real phones (iOS Safari recording support in particular); the real file pickers for photos and audio; screen-reader behaviour.

## 2026-10-06 — editorial visual refresh (branch `feature/guided-reading-flow`, checked by Claude Code)

Run in the Claude desktop app's built-in Chromium browser against the local dev server, at desktop width and an emulated 375×812 phone. Steps were driven by scripts in the page. Test page images (portrait 900×1300, landscape 1400×900, tall screenshot 750×2400, each with a red border so cropping would show) and WAV files were generated in the browser.

| Device / browser | What I tried | Expected result | Actual observation | Limitations / notes |
|---|---|---|---|---|
| Desktop, built-in Chromium | First load after the refresh | Page renders | **Crashed** ("destroy is not a function") from a scroll-to-top effect that returned a value; fixed, then reloaded and re-checked with no new console errors | Found and fixed during this check |
| Same | Sticky header while scrolling a long passage (14 paragraphs) | Header stays at top, opaque, no gap | Header top 0; the element under its bottom edge is inside the header; background is the opaque cream | — |
| Same | Read side panel while scrolling | Stays visible below the header with a thin divider | `position: sticky`, 40px below the header; 1px left border | — |
| Same | Passage typography | Comfortable, not oversized | 20px, line height 37px, column about 664px wide | — |
| Same | Selected tile, icon sizes, page controls | Thin plum border + tint + check; 18–20px icons; comfortable targets | As expected; tile icons 20px (icon–label gap changed from 12px to 8px after measuring); page controls 40×40px | — |
| Same | Upload 3 differently shaped pages | Whole page visible, no cropping | All `object-fit: contain`; red borders visible on every edge | The tall screenshot is shown small in its preview box on desktop (whole page still visible) |
| Same | Paste → Upload → Paste → Upload | Text and pages both kept | Both kept | — |
| Same, **simulated mic** (440 Hz tone) | Start, then Stop | Passage read-only; Review shows duration | Edit passage disabled while recording; Review "0:02"; file decodes as 2.58 s | No voice recorded |
| Same | Read with an existing recording | "Record again" and "Upload audio" on separate single-line rows | Stacked rows, one line each | — |
| Same | Review + all 6 samples | One at a time, labelled SAMPLE, status tags, experiment where expected | One article at a time; tags as designed; priority experiment on samples 1–4, none on "nothing found" / "couldn't assess" | — |
| Emulated phone 375×812 | Prepare, Upload with 4 pages, move page 4 earlier | One column, readable, all pages reachable, no sideways scroll | Previews about 341px wide, one per row; order A,B,D,C; no horizontal scroll | Emulated viewport, not a real phone |
| Same | Read dock with a long passage, scrolled to the end | Opaque dock never covers the passage | Dock 229px; passage text ends 120px above it; header stays opaque at the top | — |
| Same, **real mic request** | Start recording (the browser pane blocks microphones) | Friendly message; upload becomes main action | Message shown; "Upload audio instead" (primary) and "Try the microphone again" | Real denial in this browser only; the allow prompt was not tested |
| Same | Upload a 3 s WAV, then Discard (Keep it first, then Yes) | Review shows file; confirm focuses "Keep it" | "Uploaded · my-reading.wav 0:03"; focus on "Keep it"; discard returned to Read | File set by script, not the real file picker |
| Same | Edit passage → target to 1 min → Continue | Mode, pages and target kept | Upload still selected, 4 pages, "of 1 min target" | — |
| Same, **simulated mic** | Record past the 1-minute target | Recording continues; padding adapts as the dock grows | Still recording at 1:15 and 1:18, "Target reached 🎯…"; padding grew 161→189px with the dock | — |
| Same | Stop → Review → Back → Upload audio | Replace asks first | Confirm shown (dock 263px while open); Keep it kept the recording; file decodes as 88.7 s, shown as 1:28 | — |
| Same | Start a new session (confirm) | Content cleared, target kept | Back to Prepare, no tile selected, target 1 | — |
| Same | Hosts contacted during the run | Only local and fonts | localhost:8080 and fonts.googleapis.com | — |

Automated: `tsc --noEmit` passes. `vite build` succeeds. `vitest`: the same 2 routing tests fail as before this change, because the test setup can't mount the full-document root layout.

**Not verified (please check):** a real microphone (allow prompt, voice); listening to playback; real phones (iOS Safari recording in particular), including the safe-area padding under the dock; the real photo and audio file pickers; keyboard-only and screen-reader use; how the illustration reads at your preferred size.

## 2026-10-06 — RB redesign: progressive disclosure, gallery, sample session (checked by Claude Code)

Run in the Claude desktop app's built-in Chromium browser against the local dev server, at an emulated 1280×800 desktop, the pane's own 446px width, and an emulated 375×812 phone. **The browser pane was hidden from view**, so animations, smooth scrolling and scroll events were paused there, and several screenshots came back blank or a step behind. Most checks below therefore come from measuring the page, not from looking at it. Test page images (portrait, landscape, a tall 750×2600 screenshot, square; each with a red border so cropping would show), a corrupt "image" and WAV files were generated in the browser.

| Device / browser | What I tried | Expected result | Actual observation | Limitations / notes |
|---|---|---|---|---|
| 446px pane + 1280 desktop | Fresh visit | Logo, welcome, target card, sample link only; nothing preselected | As expected; no content card and no Continue; no pressed choices | — |
| Same | Fonts, colours, sizes | Manrope; exact hex colours; h1 32–36/600 desktop, card headings 20/500 | Manrope loaded; body bg `#F6EAE9`, card `#FAF7F2`, heading `#302D2B`, supporting `#625F5B`; h1 34px/600 desktop and 28px on narrow screens; card h2 20px/500; card radius 16px; padding 40px desktop, 20px phone; card gap 30px desktop, 20px phone | Contrast computed: supporting text 5.4–5.9:1, main text 12.8:1, plum 10.8–11.9:1, field edges 3.3:1 |
| Same | Target choices layout | One row on desktop, two columns when narrow | 4 columns at 1280; 2 columns at 446 and 375 | — |
| 1280 desktop | Custom: type "2" | No reveal while typing | Content card not shown | — |
| Same | Custom: submit 0, then 2.5, then 12 | Errors for invalid; reveal on valid | Error "Enter a whole number of minutes from 1 to 180." for 0 and 2.5; 12 → compact row (12) + content card | — |
| Same | Preset 10 min | Target set; content card revealed; focus moves to it | Row shows 10; focus on "Bring something to read" heading | First version didn't move focus; fixed by moving the focus call into an effect that runs after render, then re-checked |
| Same | Paste: whitespace only / text / cleared | Continue only with real text | Hidden / shown / hidden | — |
| Same | Edit target row to 20 | Content kept | Text kept | — |
| Same | Upload chosen | One sentence, helper, Add pages; no textarea; no Continue | As expected | — |
| Same | Add a corrupt image file | Rejected; no Continue | "Couldn't open broken.png…"; 0 pages; Continue hidden | — |
| Same | 1, 2, then 4 mixed-size pages | Equal fixed frames, contain, one row, correct arrows | All frames equal height (384px desktop); `object-fit: contain`; 1 row; arrows: none with 1–2 pages, right only with 4 | — |
| Same | Gallery scroll positions (instant scroll + scroll event) | Right until end; left only at end | start: right; middle: right; end: left only | **Arrow click with smooth scroll did not move in the hidden pane** — needs your visual check |
| Same | Move page 4 earlier | Order changes, page stays in view | Portrait, Landscape, Square, Tall | — |
| Same | Keyboard: Tab, Enter, Space, Shift+Tab | Visible focus; reachable controls | Tab → "5 min" with 2px plum outline; Enter set target and focused the new card; tiles reachable; "Add pages" file input reachable with its label outlined | Real key presses in the pane; not a full keyboard audit |
| Same, **simulated mic** (440 Hz tone) | Continue → Read → Start → turn pages → Stop | Side-by-side cards; pages navigable while recording; editing locked | Passage card 754px, controls card 320px, 30px gap; Next page worked during recording (page 3 of 4); Edit passage disabled; Review heading and line as specified; file decodes 3.96 s, shown 0:03 | No voice recorded |
| Same | Back to reading → Edit passage → switch tiles | Everything kept | Target 20, Upload selected, 4 pages, Continue shown; pasted draft kept | — |
| Same | Read with a recording | Record again / Upload audio single-line, small icons | Both 16px icons, 44px tall single-line rows, stacked | — |
| Same | Sample link | Underlined text, no background, border or pill | `underline`, transparent background, 0 border, 0 radius, plum | — |
| Same | Sample session end to end | Label + Exit throughout; no fake audio; one sample at a time; finish options | Header shows "Sample session · Exit sample" on every stage; review has 0 audio elements and says demo audio isn't available; 6 samples one at a time; "No findings" and "Uncertainty" have no experiment; "Start my session" and "Explore the sample again" both work | — |
| Same | Exit sample / Start my session | Return to preserved setup | Target 20, 4 pages, Continue shown | — |
| 375×812 phone | Gallery | One preview plus a peek | Item 256px, next item peeks 29px; frame 320px tall; no page-level sideways scroll | Emulated viewport |
| Same | Read layout | Stacked; passage not covered | Controls card above the passage, 20px gap, not fixed | — |
| Same, **real mic request** | Start recording (pane blocks microphones) | Friendly message; upload becomes main action | Message shown; "Upload audio instead" primary, "Try the microphone again" secondary | Real denial only; the allow prompt was not tested |
| Same | Upload 5 s WAV → Review → Explore sample feedback | Review with duration; samples labelled and separate | "Your uploaded audio 0:05 · 15 min target"; SAMPLE label and "not an analysis of your recording" shown; recording card stays separate | File set by script, not the real picker |
| Same | Record again / Start a new session | Confirm first, focus on Keep it | Both confirms shown; focus on "Keep it" | — |
| Built CSS | Reduced motion | Reveal, pulse and transitions off | Compiled CSS includes `prefers-reduced-motion: reduce` rules for `.reveal`, `.rec-pulse` and the progress transition | Rules confirmed in CSS; not run with the OS setting on |
| Console / network | Errors and hosts | None; local only | One React "key" warning in the target choices, fixed and re-checked with no errors; hosts: localhost and fonts.googleapis.com | — |

Automated: `tsc --noEmit` passes. `vite build` succeeds. `vitest`: the same 2 routing tests fail as before, because the test setup can't mount the full-document root layout.

**Not verified (please check):**
- **Recording and playback:** a real microphone and its permission prompt; listening to playback; iOS Safari recording.
- **The gallery:** smooth arrow scrolling and trackpad/touch swiping, seen with your own eyes.
- **Visual review:**
  - The phone and desktop layouts were checked by measurement; the browser pane was hidden, so many screenshots were blank or out of date. Please look at them yourself.
  - A visual comparison with the newest reference image: none was attached this round, so the RB mark uses the existing book illustration.
- **Real devices and pickers:** real phones and tablets, and the real photo and audio file pickers.
- **Assistive tech:** screen readers, and the OS reduced-motion setting turned on.

## 2026-10-06 — plum text, content-ready layout, Continue bar (checked by Claude Code)

Run in the Claude desktop app's built-in Chromium browser against the local dev server, at an emulated 1280×800 desktop and 375×812 phone. The pane was visible for most of this round (`document.hidden: false`), so smooth scrolling ran. Steps were driven by scripts plus real key presses and clicks. Test pages and WAV audio were generated in the browser. The reference image arrived during the work and was matched where it didn't conflict with the written brief.

| Device / browser | What I tried | Expected result | Actual observation | Limitations / notes |
|---|---|---|---|---|
| Desktop 1280 | Colours, radii, gaps | New plum shades; 26px cards, 16px tiles; ~24px gaps | h1/h2 `#491332`, supporting `#795C6E`; card 26px, tile 16px; gap 24px | Contrast computed: supporting 5.0–5.5:1 on ivory/blush, 4.26:1 on peach (so not used there) |
| Same | RB monogram | Serif, slight overlap, both letters readable | DM Serif Display loaded; B overlaps R by 4px; looked readable in screenshots | — |
| Same | "Add pages" | Plus icon only, rounded rectangle | One `lucide-plus` icon, 12px radius, text "Add pages" | — |
| Same | First upload from a scrolled position | Ready layout; previews brought into view; bar appears | "Your reading is ready", "Your pages · 1 page added", Change content, tiles gone; card scrolled to just under the header; bar fixed, opaque, "1 page ready", one Continue, full pill, right edge = content edge | — |
| Same | Add 1, then 2 more pages | Status updates; first new page revealed in the strip | "2 pages ready" → "4 pages ready"; strip scrolled so page C was fully visible | — |
| Same | Scroll to the very bottom | Bar covers nothing | Last text 24px above the bar; helper text well clear | — |
| Same | Remove every page | Back to the empty upload state; bar hidden | Welcome heading, "Bring something to read", Upload still selected, empty-state sentence, no bar, padding back to normal | — |
| Same | Type "Every page" with real key presses | No layout jump; focus and caret kept; bar may appear | Same element, focused, caret 10; tiles and welcome unchanged; bar "Passage ready" | — |
| Same | Paste (paste event + inserted text) | Switch to the ready layout without interrupting input | "Your reading is ready" / "Your content"; same element, still focused, caret at the end; moved up into view; labelled by the card heading | Real clipboard not used (to avoid pasting your clipboard contents) |
| Same | Keep typing after the switch | Input continues | " Yes." typed, still focused | — |
| Same | Change content → Upload (empty) → Cancel | Tiles reopen; Cancel restores | Tiles shown with Cancel; empty upload hid the bar; Cancel returned to "Your content" with text kept | — |
| Same | Upload while changing; switch back and forth | Both drafts kept; switches straight back when the method has content | "Your pages · 1 page" then "Your content", and back; text and pages kept | — |
| Same | Clear all text | Empty paste state | Welcome heading, tiles, visible "Your passage" label, focus kept, no bar | — |
| Same | Page "⋯" menu with real keys | Opens, arrow keys move, disabled items skipped, action works | Enter opened it; "Move earlier" disabled on page 1; Down/Enter worked; "Move later" swapped pages 1 and 2; focus returned to the button | Choosing "Replace…" asks the browser for a file picker, which the pane can't show |
| Phone 375×812 | First upload from the bottom of the page | Preview fully visible above the bar | Card at 80px, preview 165–485px, bar top 711px | — |
| Same | Bar | Full-width pill, status centred | Button 343px wide (of 375), radius 9999px, status centred | `env(safe-area-inset-bottom)` padding is in place; real iPhone not tested |
| Same | 3 pages, bottom of page | Nothing covered; no sideways scroll | Last text 24px above the bar; page width 375px | **Bug found and fixed:** hidden "of 3" text and the hidden replace-file input on off-screen pages widened the page to 630px, which pushed the fixed bar off-screen. Fixed by containing them inside each page item, then re-checked |
| Same, simulated keyboard | Text box focused with the layout viewport taller than the visible area | Bar moves into the page flow; field not covered | Bar `relative` (in flow after the content), bottom padding 32px, field kept focus; when "closed" the bar was fixed again with 125px reserved | Keyboard simulated by overriding `innerHeight`; **real phone keyboards not tested** |
| Same | Real click outside the text box | Pasted text switches to the ready layout | "Your reading is ready", "Your content · Pasted text", "You can still edit your passage." | A script-triggered blur doesn't fire events in this pane, so a real click was used |
| Same, **simulated mic** (440 Hz tone) | Continue → record → turn page → stop → back → sample → exit | Everything else unchanged | No bar on Read; page 2 of 3 while recording, editing locked; Review message intact; audio decodes 2.3 s; back keeps "3 pages ready"; sample hides the bar; exiting keeps 3 pages | No voice recorded |
| Console | Errors | None | None | — |

Automated: `tsc --noEmit` passes. `vite build` succeeds. `vitest`: the same 2 routing tests fail as before, because the test setup can't mount the full-document root layout.

**Not verified (please check):**
- **Phones:** real iOS and Android on-screen keyboards with the bar, the bottom safe area on a notched iPhone, and touch swiping in the gallery.
- **Real input:** the real file picker for Replace and Add pages, real clipboard paste, a real microphone and listening to playback.
- **Assistive tech:** screen readers.

## 2026-10-07 — home/resume, Exit session, copy trims, routing tests (checked by Claude Code)

Run in the Claude desktop app's built-in Chromium browser against the local dev server, at an emulated 375×812 phone and 1280×800 desktop. **No real-device checks this round.** "Simulated mic" means a 440 Hz tone stream standing in for `getUserMedia`. The browser pane was sometimes hidden from view, which pauses animations; I noted where that affected a check.

| Device / browser | What I tried | Expected result | Actual observation | Limitations / notes |
|---|---|---|---|---|
| Phone 375 | Welcome alignment and font | Heading and subtitle left-aligned with the content edge; soft serif | Both `text-align: left` at x=16px, same as the card edge; Fraunces loaded with `"SOFT" 100`, weight 500 | — |
| Desktop 1280 | Welcome alignment | Still centred | Heading and subtitle centred (38px); resume card text left-aligned | — |
| Phone | Copy trims | Short tiles; removed lines gone | Tiles "Paste text" / "Upload pages" without descriptions; "Choose how…" gone; "Your reading is ready", "N pages added", "Pasted text", "3 pages ready", "Passage ready" all absent; heading "Your pages" with "2 pages" beside it; bar contains only "Continue to reading" | — |
| Phone | Target row after setting | No enclosing card | Row is not inside a `.card` | — |
| Phone | Logo → home → Resume from setup | Resume shown; target kept | "10 min target"; Resume returned to the content card, target 10 | — |
| Phone | From content entry (2 pages + an unfinished paste draft) | Nothing lost | Summary "10 min target · 2 pages · pasted text"; Resume → "Your pages", 2 pages; paste draft kept; Change content / Cancel still work | — |
| Phone, **simulated mic** | Logo while recording | Dialog with exact wording; recording continues | "Return home?", the specified message, "Keep recording" / "Stop and go home"; focus on Keep recording; no close icon; still recording, mic track live | — |
| Same | Tab ×2, then Escape (real key presses) | Focus trapped; Escape cancels | Tab moved Keep recording → Stop and go home → Keep recording; Escape closed it; still recording; focus back on the logo | Close animation slowed in the hidden pane |
| Same | Stop and go home → Resume | Audio kept; mic released; review, not re-recording | Home summary "recording 0:29"; mic track `ended`; Resume → Review; audio decodes 29.46 s; no new mic request | — |
| Same | Logo from Review | Home without a dialog; playback paused | No dialog; `audio.paused` true | Playback barely ran in the hidden pane, so the pause check is weak |
| Same, stand-in recorder capturing no data | Stop and go home | Explain before leaving | "The recording couldn't be kept" with an explanation; stayed on Read; mic ended; earlier recording still kept; "Go home anyway" went home | Recorder failure simulated |
| Phone | Exit from the welcome screen → Stay in session | Exact wording; safe focus; nothing cleared; focus returns | Wording as specified; focus on "Stay in session"; summary unchanged; focus returned to "Exit session" | Focus return needed about 1 s for the close animation in the hidden pane |
| Same, **simulated mic** | Exit while recording → cancel → confirm | Extra line; cancel keeps recording; confirm clears all | Extra "You're recording right now — leaving will stop and discard it."; cancel kept recording (mic live); confirm → fresh welcome, target choices back, no Resume, no Exit, mic ended, focus on the welcome heading, old file links revoked | — |
| Same | Discard while a large page was still decoding | Page not restored | After a new target, Upload showed 0 pages | — |
| Same | Discard while the mic request was pending (1.2 s fake delay) | No recording; late stream released | Not recording; late stream tracks `ended`; no Resume | — |
| Same, **simulated mic** | Fresh session after discard | Works normally | Target → paste → record → Review with audio | — |
| Same | Sample from home; logo inside the sample; Exit sample | Personal session preserved; Exit session hidden in the sample | Header showed only "Sample session · Exit sample"; logo and Exit sample both returned to the welcome with Resume and the full summary; Resume → Review with audio | — |
| Phone, **simulated keyboard** (layout viewport 320px taller than the visible area) | Continue with the text box focused | Field not covered; Continue reachable | First version: the button was 182px below the field, after the sample link and footer. **Moved** it to right after the content card: now 44px below the field, full width, no overlap. Keyboard closed → fixed bar again; at the bottom of the page the privacy line ends above the bar | Real iOS/Android keyboards **not** tested |
| Unit tests | `vitest` | Pass and actually render the app | 2/2 pass; the welcome heading and "404" render inside the tests | Cause of the earlier failures: see README → Testing |
| Console | Errors | None from the app | One "file not found", matching my own deliberate fetch of a revoked recording link | — |

Automated: `tsc --noEmit` passes; `vite build` succeeds; `vitest` 2/2 pass.

**Not verified (please check):**
- **Phones:** real iOS and Android, including the keyboard with the Continue button and the bottom safe area.
- **Microphone:** a real permission prompt, and the mic indicator turning off after "Stop and go home" or Exit.
- **Real input:** the real file pickers.
- **Assistive tech:** a screen reader announcing the dialogs.

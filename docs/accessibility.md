# Accessibility notes

What the app does for accessibility, and what has and hasn't been verified. This is an engineering record, not a conformance claim: no screen-reader session on a real device, no audit tool and no user testing with disabled people has been done.

## Built in
- **Semantics and keyboard.** Real buttons, links, labelled inputs and headings throughout. Selectable choices (target tiles, Paste/Upload) are buttons with `aria-pressed`. Each screen's heading receives focus when the screen changes (welcome, content card, review, sample feedback). Sample-feedback tabs follow the arrow-key tab pattern.
- **Focus visibility.** A single solid 2 px ink outline with a 2 px offset for `:focus-visible` on every control, including the companion button.
- **Dialogs** (Exit session, Return home) use Radix alert dialogs: focus starts on the safe action ("Stay in session" / "Keep recording"), stays inside, Escape cancels, focus returns to the control that opened it.
- **Page gallery.** Reordering, replacing and removing pages are done from a per-page menu that works with keyboard and screen readers; there is no drag-only interaction. Page navigation arrows are named "Previous page" / "Next page".
- **Page zoom viewer.** Zoom out, Zoom in and Fit page are labelled buttons (each at least 44 px) in a labelled toolbar; one that cannot act (at fit, or at maximum zoom) is marked `aria-disabled` but stays focusable, so focus is never lost. The viewer itself is a focusable group named for the page ("Page 2 of 5") with a hidden description of the keys: **+** / **−** zoom, **0** fits, **arrow keys** pan once zoomed (when fitted they keep scrolling the page), and Ctrl/⌘ shortcuts are left to the browser. Panning therefore never requires dragging. Button and key actions are announced politely ("Zoom 150 percent", "Page fitted to the viewer"); continuous gestures are not. The page image inside is exposed once, through the group's name, not as a second unnamed image.
- **Recording state** is announced through a polite live region and shown as text, not only as colour or a pulsing dot. Errors use `role="alert"`.
- **Decorative art** (paper background, contour lines, logo book, bookmark companion) is `aria-hidden` and not focusable. Interactive companion instances expose one button, "Say hello to your buddy", with no extra visible or hidden text.
- **Touch targets.** Buttons are at least 40–48 px; phone-dock buttons 44 px; the companion's tap area is its drawing plus 8 px (for the smallest, the peeking pose, about 64 × 47 px).
- **Colour contrast.** Text pairs meet WCAG AA (4.5:1) and control edges and indicators 3:1; the numbers are in [design-system.md](design-system.md). Apricot is decorative only.
- **Motion.** Arrival, reaction, fade-in, pulse and smooth-scroll animations are disabled under `prefers-reduced-motion: reduce`. Companion reactions are single, short transforms and never loop.
- **Layout.** Fixed bars (Continue bar, recording dock) reserve their measured height so they never cover content, including with the iPhone safe area and on short landscape screens; the header slims on short screens.
- **Privacy wording** is plain text in a footer, not an icon-only cue.

- **Children's corner.** Built-in stories are real text (not text in images) so they resize and can be read by assistive technology; pictures are decorative (empty alt text — descriptive alt text is an open item). **A−/A+** are labelled buttons (44 px, `aria-disabled` at the limits so focus is kept, with a polite announcement of the size). The story/own-content choice is a tab list with arrow-key navigation; filters and story covers are toggle buttons (`aria-pressed`, with a checkmark as well as a border). A selected story’s preview takes focus; each screen's heading takes focus when it appears. **About this story** is a modal dialog with a labelled close button and external links announced as opening a new tab. The reflection buttons are a labelled group of toggles (a feeling is never conveyed by colour alone). The page counter stays on one line.

## Checked
Keyboard order and focus rings, dialog focus, the companion's Tab/Enter/Space behaviour, narrow-width wrapping (320 px and up) and overlap of the companion with text and controls were checked in the browser pane (see [TESTING_LOG.md](../TESTING_LOG.md)). Contrast and the companion's hidden-from-assistive-tech markup are covered by automated tests.

## Not verified
The zoom viewer has not been tried with a screen reader or on a real touch device (pinch and drag were verified with emulated pointer events and, for the mouse and keyboard, with real input in the browser pane).

Screen readers (VoiceOver, TalkBack, NVDA), Windows high-contrast/forced-colours mode, text-only zoom beyond browser zoom, switch or voice control, and real-device touch behaviour. Reduced-motion handling was verified by reading the CSS/JS and by unit tests, not by watching the setting change in a browser.

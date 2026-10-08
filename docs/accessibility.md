# Accessibility notes

What the app does for accessibility, and what has and hasn't been verified. This is an engineering record, not a conformance claim: no screen-reader session on a real device, no audit tool and no user testing with disabled people has been done.

## Built in
- **Semantics and keyboard.** Real buttons, links, labelled inputs and headings throughout. Selectable choices (target tiles, Paste/Upload) are buttons with `aria-pressed`. Each screen's heading receives focus when the screen changes (welcome, content card, review, sample feedback). Sample-feedback tabs follow the arrow-key tab pattern.
- **Focus visibility.** A single solid 2 px ink outline with a 2 px offset for `:focus-visible` on every control, including the companion button.
- **Dialogs** (Exit session, Return home) use Radix alert dialogs: focus starts on the safe action ("Stay in session" / "Keep recording"), stays inside, Escape cancels, focus returns to the control that opened it.
- **Page gallery.** Reordering, replacing and removing pages are done from a per-page menu that works with keyboard and screen readers; there is no drag-only interaction. Page navigation arrows are named "Previous page" / "Next page".
- **Recording state** is announced through a polite live region and shown as text, not only as colour or a pulsing dot. Errors use `role="alert"`.
- **Decorative art** (paper background, contour lines, logo book, bookmark companion) is `aria-hidden` and not focusable. Interactive companion instances expose one button, "Say hello to your buddy", with no extra visible or hidden text.
- **Touch targets.** Buttons are at least 40–48 px; phone-dock buttons 44 px; the companion's tap area is its drawing plus 8 px (for the smallest, the peeking pose, about 64 × 47 px).
- **Colour contrast.** Text pairs meet WCAG AA (4.5:1) and control edges and indicators 3:1; the numbers are in [design-system.md](design-system.md). Apricot is decorative only.
- **Motion.** Arrival, reaction, fade-in, pulse and smooth-scroll animations are disabled under `prefers-reduced-motion: reduce`. Companion reactions are single, short transforms and never loop.
- **Layout.** Fixed bars (Continue bar, recording dock) reserve their measured height so they never cover content, including with the iPhone safe area and on short landscape screens; the header slims on short screens.
- **Privacy wording** is plain text in a footer, not an icon-only cue.

## Checked
Keyboard order and focus rings, dialog focus, the companion's Tab/Enter/Space behaviour, narrow-width wrapping (320 px and up) and overlap of the companion with text and controls were checked in the browser pane (see [TESTING_LOG.md](../TESTING_LOG.md)). Contrast and the companion's hidden-from-assistive-tech markup are covered by automated tests.

## Not verified
Screen readers (VoiceOver, TalkBack, NVDA), Windows high-contrast/forced-colours mode, text-only zoom beyond browser zoom, switch or voice control, and real-device touch behaviour. Reduced-motion handling was verified by reading the CSS/JS and by unit tests, not by watching the setting change in a browser.

# Design system

Reading Buddy is a night-time reading nook: deep navy surfaces, warm cream text, one amber accent, and an illustrated room that comes together as you set it up. Tokens live in `src/styles.css`; contrast is asserted by `src/test/contrast.test.ts`. Behaviour is described in [user-flow.md](user-flow.md).

## Colour
Solid colours only. Surfaces step up in lightness within one navy hue instead of being outlined.

| Token | Hex | Use |
|---|---|---|
| `--night` | `#0E1830` | page background |
| `--panel` | `#172340` | panels, dialogs, the reading area |
| `--raised` | `#1F2C4D` | choice cards, options, the player, menus |
| `--selected` | `#2A3860` | hover and selected surfaces, progress tracks |
| `--soft` | `#243258` | secondary buttons |
| `--cream` | `#F4EADB` | text and headings |
| `--cream-2` | `#C2B8AA` | supporting text |
| `--cream-3` | `#9A93A0` | placeholders and the quietest text |
| `--amber` | `#E5AE6E` | the accent: primary buttons, selection rings, links, focus |
| `--amber-ink` | `#1B1309` | text on amber and rose buttons |
| `--lilac` | `#A9A6E8` | recording only |
| `--rose` | `#E2919A` | delete only |
| `--line` | `#8D93AE` | input and control edges |
| `--paper` / `--paper-ink` | `#FBF8F1` / `#1B2116` | the sample passage |
| `--apricot` / `--apricot-deep` | `#FCBC88` / `#E58A45` | Buddy and the logo book |

Each colour has one meaning. Amber is never decoration, lilac only means recording, rose only means delete.

**Contrast (WCAG 2.x), asserted by the tests:** cream text is 9.6:1 or more on every surface and supporting text 5.9:1 or more; placeholders are 4.6:1 or more on the panel and raised surfaces; amber and rose text are 5.7:1 or more on the panel and raised surfaces; dark ink on amber is 9.3:1 and on rose 7.7:1; control edges are 3.8:1 or more on every surface; amber selection rings and the lilac recording dot are well above 3:1.

### Cushion and beanbag colours
Ginkgo `#D7E259`, Marigold `#EFA94A`, Clay `#C8664B`, Blossom `#E3A69A`, Plum `#9A6A9C`, Lilac `#A9A6E8`, Sky `#5AA6E9`, Cream `#EEE2CA`. Each swatch has its name beneath it. In the nook the cushion has a soft shadow and a light rim, and the beanbag a darker outline, so every colour stands out from the chair.

## Type
- **Atkinson Hyperlegible Next** for the interface (self-hosted from `@fontsource-variable/atkinson-hyperlegible-next`).
- **Andika** for the children’s corner and story text, a face designed for early readers (self-hosted from `@fontsource/andika`, 400 and 700).
- **DM Serif Display** for the RB monogram only (self-hosted from `@fontsource/dm-serif-display`).
- Scale: 14 / 16 / 18 / 22 / 28 px (24 px titles on phones). Two weights in the interface, 400 and 600. Reading text starts at 22 px with a 1.65 line height and a 34em measure, and A− / A+ step it from 18 to 32 px.
- Tabular figures for timers and counts.

## Space, size and shape
- One 4 px spacing scale (4, 8, 12, 16, 24, 32, 48).
- Buttons are 48 px tall; the main action is 56 px. Icon buttons and touch targets are at least 44 px.
- Radii: 10 to 12 px for controls, 14 to 16 px for cards and choices, 20 px for panels and dialogs.
- Fixed-size controls that wrap: minute options are 88 × 64 px (70 px wide on the smallest phones), swatches 56 px, page thumbnails 84 × 108 px. Nothing stretches to fill a row; full width is kept for the main action.
- Containers have fixed frames and their content scrolls, so adding content never pushes the layout around.

## Components
- **Choice:** a whole-row card with a title, one line of description and a chevron. The three on home are identical.
- **Option** (minutes), **swatch** (colours), **chip** (story filters) and **segmented control** (Paste text / Photos of pages; Pick a story / Bring your own; Story / About this book).
- **Primary** (amber), **secondary** (soft navy), **danger** (rose, in the one dialog that needs it), **link** (amber text) and **quiet** (Back) buttons.
- **Summary list:** label, value and **Change** on each row.
- **Dialogs** are a centred card on wide screens and a bottom sheet with a grab handle on narrow ones. Confirmations name the action, state the consequence in one sentence, repeat the verb on the button and give Cancel the focus. There are no warning boxes.
- **Messages** (toasts): one at a time, with Undo where an action can be undone.
- **⋯ More** menus hold everything that isn’t a screen’s main action.

## The nook
`src/components/nook/Nook.tsx`: one inline SVG of a night-time reading room. It has an arched window onto ginkgo leaves, string lights, a wall clock, an arc floor lamp, an armchair, a side table with Buddy and a mug, a shelf, and a children’s corner with a lantern, a beanbag and a basket of picture books. Pieces that aren’t set yet are drawn as a soft, desaturated sketch and come into focus as they are chosen. The clock shows the minutes; the reading (pages, text or the sample card) appears on the chair; the cushion and beanbag take their colours; recordings add spines to the shelf. The lamp and the lantern are the last things to light, warming toward the chair or the beanbag. The corner you are not using dims. The drawing has a text description for screen readers that changes with what is set.

## Buddy
`src/components/reading/Companion.tsx`: a small apricot bookmark with a folded corner, a tiny face, and apricot arms, hands and feet outlined in a deeper apricot so they stand out against the night. Four poses: wave (home), listen (the recording card), celebrate (listen back) and peek. Buddy waves twice when home opens and answers a mouse hover with a wave and a tap with a wiggle, one reaction at a time. Buddy is still while recording, and the drawing is hidden from assistive technology.

## Motion
- Under 300 ms for interface motion, on a strong ease-out (`cubic-bezier(0.23, 1, 0.32, 1)`). No ease-in, no bounce.
- Buttons press to 97%. Dialogs scale in from 96% in 250 ms. Bottom sheets slide up in 500 ms on a drawer curve (`cubic-bezier(0.32, 0.72, 0, 1)`).
- Content that swaps in place (story pages, the views in the story window, sample steps) sits in one grid cell and crossfades in 200 ms, so nothing resizes.
- The lamp warms up over about a second after setup; colours in the nook ease over 1.4 s.
- With reduced motion, movement and scaling become short fades, Buddy stays still, and the recording dot stops pulsing.

## Layout
- **Wide (900 px and up):** header, then the nook and the panel side by side at full height (panel 440 px, or 560 px for stories, the sample and Saved). Reading: the reading area and the recording card side by side.
- **Narrow:** the header stays at the top, the nook sits above the panel, and the panel’s main button stays in view at the bottom. Reading: the toolbar stays under the header and the recording dock stays at the bottom.

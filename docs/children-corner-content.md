# Children’s corner: story manifest and review record

The eight built-in stories, where they came from, how each was checked, and what was left out. The same credit data lives in code (`src/content/stories/manifest.ts`) and is shown to readers under **About this story**; a test checks that every story has a complete credit, a CC BY 4.0 licence and every picture it names.

> **What this is, and isn’t.** Each story was read in full and its credit block checked on the specific edition by Claude (an AI assistant) on the project owner’s behalf, on 2026-10-09. **No educator, librarian, parent or child has reviewed them**, and reading level is not proof of age suitability. Treat the 8–12 age range as a design hypothesis (see [children-corner.md](children-corner.md#who-it-is-for)). Nothing here is legal advice.

## Included stories

| Title (as published) | Credits on the edition | Source edition | Copyright line · licence | Level · length · readability |
|---|---|---|---|---|
| **How Stories Came to People** | Author: Ghanaian folktale; Illustration: Wiehan de Jager | [ASb #1943](https://www.africanstorybook.org/reader.php?id=1943) | © African Storybook Initiative 2014 · CC BY 4.0 | Read aloud · 630 words · 12 pages · FK ≈ 4.6 |
| **Lazy Anansi** | Author: Ghanaian folktale; Illustration: Wiehan de Jager | [ASb #1077](https://www.africanstorybook.org/reader.php?id=1077) | © African Storybook Initiative 2014 · CC BY 4.0 | Read aloud · 406 words · 8 pages · FK ≈ 3.9 |
| **Hare and Tortoise (Again!)** | Author: Venkatramana Gowda, Divaspathy Hegde; Illustration: Padmanabha | [ASb #2058](https://www.africanstorybook.org/reader.php?id=2058) | © Pratham Books 2014 · CC BY 4.0 | Longer paragraphs · 460 words · 15 pages · FK ≈ 7.0 |
| **The Magic Mokoro** | Author: Wendy Hartman; Illustration: Val Myburgh | [ASb #49147](https://www.africanstorybook.org/reader.php?id=49147) | © African Storybook Initiative 2024 · CC BY 4.0 | Longer paragraphs · 612 words · 15 pages · FK ≈ 4.8 |
| **A tiny seed: The story of Wangari Maathai** | Author: Nicola Rijsdijk; Illustration: Maya Marshak | [ASb #9809](https://www.africanstorybook.org/reader.php?id=9809) | © Nicola Rijsdijk, Maya Marshak, Tarryn-Anne Anderson, Bookdash.org and African Storybook Initiative 2015 · CC BY 4.0 | Longer paragraphs · 407 words · 12 pages · FK ≈ 5.6 |
| **Wayan and the turtles** | Author: Yvette Bezuidenhout; Adaptation: African Storybook, Yvette Bezuidenhout; Illustration: Fabianus Bayu | [ASb #34111](https://www.africanstorybook.org/reader.php?id=34111) | © African Storybook Initiative 2019 · CC BY 4.0 | Longer paragraphs · 520 words · 12 pages · FK ≈ 4.5 |
| **Kariza's questions** | Author: Jean de Dieu Bavugempore; Translation: Aloysie Uwizeyemariya; Illustration: Rob Owen | [ASb #22197](https://www.africanstorybook.org/reader.php?id=22197) | © African Storybook Initiative 2017 · CC BY 4.0 | Longer paragraphs · 385 words · 12 pages · FK ≈ 5.9 |
| **Let's ride on raindrops** | Author: Ndivhuho Mutsila; Translation: Ndivhuho Mutsila; Illustration: Sayan Mukherjee | [ASb #36034](https://www.africanstorybook.org/reader.php?id=36034) | © African Storybook Initiative 2021, Pratham Books (images) · CC BY 4.0 | Longer paragraphs · 440 words · 12 pages · FK ≈ 3.8 |

*FK = Flesch–Kincaid grade, computed from each story’s text with a simple syllable counter. It is a rough indicator of sentence and word length only, not of content, themes or age suitability.*

Notes from reading each story:

- **How Stories Came to People** — A Ghanaian Anansi tale. Anansi traps a leopard in a pit, hornets in a gourd and a snake on a stick; played for cleverness, nothing graphic.
- **Lazy Anansi** — Short tale explaining spiders’ thin legs; a pulled-leg gag, no real harm.
- **Hare and Tortoise (Again!)** — Two rivals cooperate. The edition is © Pratham Books (the imprint credited on its cover); the cover picture has the imprint’s lettering baked in, so an interior picture is used on cards instead.
- **The Magic Mokoro** — A folktale about greed and gratitude. The chief is stranded with a never-ending pile of fish; a mild comeuppance.
- **A tiny seed: The story of Wangari Maathai** — A short biography of Wangari Maathai. Mentions that she died in 2011; stated plainly and gently. Pictures are watercolours on a white ground (shown contained, not cropped).
- **Wayan and the turtles** — A fisherman’s son and a turtle: plastic pollution. Mentions an old turtle in distress, sickness in the village and a belief that the dead return to the sea; handled gently. Original source credited: www.wayan.blue.
- **Kariza's questions** — Curiosity and hand-washing, with a microscope scene. Translated by Aloysie Uwizeyemariya; credits the translator.
- **Let's ride on raindrops** — The water cycle as a children’s journey. The edition credits “Pratham Books (images)”; the licence line printed on the edition is CC BY 4.0, and that is what was relied on (the images’ original StoryWeaver licence page was not separately opened — see the open items).

## How each edition was verified

For every story the African Storybook (ASb) reader page for that exact edition was fetched and its **back-cover credit block** read: author, adaptation or translation, illustrator, language, level, the © line, the licence line (“Creative Commons: Attribution 4.0”), the source and any original source. That block reads, for each of these editions: *“You are free to download, copy, translate or adapt this story and use the illustrations as long as you attribute in the following way…”*. ASb’s Terms of Use say stories are openly licensed and may be copied and adapted with acknowledgement; they also say some stories carry a **non-commercial restriction**, so the per-edition licence line, not the site’s general statement, was what decided inclusion.

Selection process, so the gaps are visible:

1. Parsed ASb’s public catalogue: 10,738 entries, 1,696 in English, 573 at the two longest reading levels.
2. Fetched all 573 reader pages and recorded each licence line. 559 read exactly “Creative Commons: Attribution 4.0”; the others carried a non-commercial (CC BY-NC) restriction, an older wording or no line, and were **excluded**.
3. Narrowed to editions of 350–900 words, approved by ASb and with no “AI-generated” note: 204 remained.
4. Chose eight to cover folktales and real-world stories, then read each in full and looked at the cover.

Considered and **left out**:

- *The Strange Orange Lorry* — its illustrations are credited to an AI image generator.
- *Oscar’s Journey* — no illustrator credit on the edition, and it interleaves maths questions with the story.
- *Tortoise Finds His House* — a gentle story, but much younger than the audience hypothesis.
- All 559 other CC BY editions — not read in full; absence is not a judgement.

**StoryWeaver is not used.** It was part of the brief. Its reader is a client-rendered app; the pages I could reach did not expose the licence line and page text of an edition in a form I could verify, so no StoryWeaver title was added on trust. Two included editions are Pratham Books material that African Storybook republishes under its own CC BY 4.0 statement. A future pass should verify StoryWeaver editions from each book’s own licence statement.

## What was changed

- **Text:** unchanged apart from whitespace (runs of spaces collapsed, paragraph breaks kept). Page order and page breaks follow the edition. No words were edited, added or removed.
- **Pictures:** the edition’s own illustrations, **resized (if at all) and re-saved as JPEG** at quality ~70–72; card thumbnails are 480 px. Nothing was redrawn, cropped or recoloured in the files. On cards, a few pictures are shown cropped or contained by CSS only. The pictures are treated as decorative (empty alt text) because the page text carries the whole story; descriptive alt text has not been written (an open item).
- **Presentation:** pages are shown one at a time with the picture above the text; the edition’s lettering and layout are not reproduced.
- **Attribution** is built from the edition’s credit block and shown in the app (About this story). The app does not imply endorsement by African Storybook, Pratham Books, the Saide-run African Storybook Initiative or the creators, and says so.

## Other assets

- **Doorway illustration** (`src/components/children/DoorwayArt.tsx`): an inline vector drawing made for this app (arch, starry opening, open door; the bookmark companion is the real component). It replaced a low-resolution crop of the approved concept image, which was deleted rather than enlarged. **Outstanding asset:** a cleaner, higher-resolution painterly original that matches the bookmark character; until it is supplied the vector drawing stands in.
- **Bookmark companion:** the app’s own SVG drawing (see [design-system.md](design-system.md)).
- **No paid or generated content** was used for stories, covers or text.

## Open items

- Descriptive alt text for illustrations; an educator or librarian review of age suitability and themes; verifying StoryWeaver editions; opening the Pratham Books images’ own licence page for *Let’s Ride on Raindrops*; more stories (a collection of eight is small by design).

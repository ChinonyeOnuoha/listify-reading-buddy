/**
 * One page of a built-in story: its paragraphs and, where the original edition has one, its picture.
 * `heading` and `extra` mark the pages a book prints after (or around) the story itself, such as science notes: they are shown
 * after the story under their own label and counted separately from the story's words.
 */
export type StoryPage = {
  paragraphs: string[];
  image: string | null;
  /** A description of the picture for people who can't see it; empty or missing means the picture is only decoration. */
  alt?: string;
  heading?: string;
  /** Present on pages that are not part of the story itself: the label shown above them (for example "Science notes"). */
  extra?: string;
};
export type StoryText = { pages: StoryPage[] };

/** What a story is about. A story can have several; the catalogue's filters only list themes the collection really has. */
export type StoryTheme = "tales" | "funny" | "everyday" | "nature" | "science";

export type CreditSource = "African Storybook" | "Book Dash" | "StoryWeaver";

/**
 * Everything needed to credit a story as its licence and its source require, taken from the credits printed in the
 * specific edition (never assumed from a site's general terms). See docs/children-corner-content.md.
 */
export type StoryCredit = {
  /** Title as the edition prints it, for the attribution line. */
  publishedTitle: string;
  /** Who made it, in the edition's own words: [role, names]. */
  people: [string, string][];
  /** The copyright line printed on the edition, where it prints one. */
  copyright?: string;
  licence: "CC BY 4.0";
  licenceUrl: string;
  source: { name: CreditSource; url: string };
  /** The "Original source" line of the edition, where it has one. */
  originalSource?: string;
  /** The attribution the source asks for, in its own wording (African Storybook's block, Book Dash's sentence, StoryWeaver's text). */
  attribution: string;
  /** Further credits the edition prints: supporters, editors, thanks, the artists behind the pictures. */
  acknowledgements: string[];
  /** What this app changed: the words, the layout, the pictures. Shown with the credits. */
  changes: string[];
  /** Book Dash asks for its logo to be visible with its books. */
  logo?: "book-dash";
};

export type StoryMeta = {
  slug: string;
  title: string;
  /** A short line written for this app (not copied from the source). */
  summary: string;
  themes: StoryTheme[];
  /** Words of the story itself. */
  words: number;
  /** Words of the pages printed after the story (notes and the like), counted separately; 0 if there are none. */
  extraWords: number;
  /** What those extra words are, for the sentence "plus N words …" (for example "in the science notes"). */
  extraName?: string;
  pageCount: number;
  /** Card artwork (an interior picture where the cover has lettering baked in or is mostly empty). */
  cardImage: string;
  cardFit: "cover" | "contain";
  credit: StoryCredit;
};

/** One page of a built-in story: its paragraphs and, where the original edition has one, its picture. */
export type StoryPage = { paragraphs: string[]; image: string | null };
export type StoryText = { pages: StoryPage[] };

export type StoryCategory = "folktale" | "real";

/**
 * Everything needed to credit a story as its licence requires, copied from the credit block printed on the specific
 * African Storybook edition (never assumed from the site's general terms).
 */
export type StoryCredit = {
  /** Title exactly as published, for the attribution line. */
  publishedTitle: string;
  author: string;
  adaptation?: string;
  translator?: string;
  illustrator: string;
  /** The copyright line printed on the edition. */
  copyright: string;
  /** The licence statement printed on the edition. */
  licence: "CC BY 4.0";
  licenceUrl: string;
  /** African Storybook's own reader page for this edition. */
  sourceUrl: string;
  sourceName: "African Storybook";
  /** The "Original source" line of the edition, where it has one. */
  originalSource?: string;
  /** The reading level printed on the edition. */
  asbLevel: string;
};

export type StoryMeta = {
  slug: string;
  title: string;
  /** A short line written for this app (not copied from the source). */
  summary: string;
  category: StoryCategory;
  words: number;
  pageCount: number;
  /** Card artwork (an interior picture where the cover has lettering baked in or is mostly empty). */
  cardImage: string;
  cardFit: "cover" | "contain";
  credit: StoryCredit;
};

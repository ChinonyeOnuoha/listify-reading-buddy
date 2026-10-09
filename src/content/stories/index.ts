import type { StoryCredit, StoryMeta } from "./types";

export { STORIES, getStory, loadStoryText } from "./manifest";
export type { StoryCategory, StoryMeta, StoryPage, StoryText } from "./types";

/**
 * The catalogue's length categories, by word count only (never a reading speed or goal): up to 420 words is a "Short read",
 * 421–560 a "Medium read", more a "Longer story". These are descriptions of length, not of difficulty.
 */
export const SHORT_READ_MAX_WORDS = 420;
export const MEDIUM_READ_MAX_WORDS = 560;
export function lengthLabel(words: number) {
  return words <= SHORT_READ_MAX_WORDS ? "Short read" : words <= MEDIUM_READ_MAX_WORDS ? "Medium read" : "Longer story";
}

export const CATEGORY_LABEL = { folktale: "Folktales", real: "Real world" } as const;

/** The attribution line the licence asks for, built from the edition's own credit block. */
export function attributionLine(c: StoryCredit) {
  const people = [
    `by ${c.author}`,
    c.adaptation && `adapted by ${c.adaptation}`,
    c.translator && `translated by ${c.translator}`,
    `illustrated by ${c.illustrator}`,
  ].filter(Boolean);
  return `“${c.publishedTitle}” ${people.join(", ")}. ${c.copyright}. Licensed under ${c.licence}.`;
}

export const storyForCard = (s: StoryMeta) =>
  `${s.title}, ${lengthLabel(s.words).toLowerCase()}, ${s.words} words`;

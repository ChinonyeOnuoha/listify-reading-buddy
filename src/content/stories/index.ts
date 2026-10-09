import type { StoryCredit, StoryMeta } from "./types";

export { STORIES, getStory, loadStoryText } from "./manifest";
export type { StoryCategory, StoryMeta, StoryPage, StoryText } from "./types";

/** Short, long and in between — described by word count, never by a reading speed or a goal. */
export function lengthLabel(words: number) {
  return words <= 420 ? "Short read" : words <= 560 ? "Medium read" : "Longer story";
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

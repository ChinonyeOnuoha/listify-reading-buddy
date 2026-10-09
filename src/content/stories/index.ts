import type { StoryMeta, StoryTheme } from "./types";

export { STORIES, getStory, loadStoryText } from "./manifest";
export type { StoryMeta, StoryPage, StoryText, StoryTheme, StoryCredit } from "./types";

/**
 * The catalogue's length categories, by word count only (never a reading speed or goal): up to 420 words is a "Short read",
 * 421–560 a "Medium read", more a "Longer story". These are descriptions of length, not of difficulty.
 */
export const SHORT_READ_MAX_WORDS = 420;
export const MEDIUM_READ_MAX_WORDS = 560;
export function lengthLabel(words: number) {
  return words <= SHORT_READ_MAX_WORDS ? "Short read" : words <= MEDIUM_READ_MAX_WORDS ? "Medium read" : "Longer story";
}

/**
 * The full reading length: the story's words plus the words on pages printed after it (notes, a game). That is what is on the
 * screen, so length labels and the "shorter" filter use it; the story's own count is always shown too.
 */
export const readingWords = (s: StoryMeta) => s.words + s.extraWords;

/** "832 words, plus 354 in the science notes" — the story's words first, then the separate pages. */
export function wordsLine(s: StoryMeta) {
  return s.extraWords > 0
    ? `${s.words} words, plus ${s.extraWords} ${s.extraName ?? "in extra pages"}`
    : `${s.words} words`;
}

export const THEME_LABEL: Record<StoryTheme, string> = {
  tales: "Tales and adventures",
  funny: "Funny",
  everyday: "Everyday life",
  nature: "Nature",
  science: "Science",
};
export const THEME_ORDER: StoryTheme[] = ["tales", "funny", "everyday", "nature", "science"];

export const storyForCard = (s: StoryMeta) =>
  `${s.title}, ${lengthLabel(readingWords(s)).toLowerCase()}, ${wordsLine(s)}`;

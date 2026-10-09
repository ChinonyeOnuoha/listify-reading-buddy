import type { StoryMeta, StoryText } from "./types";

const LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/";

/**
 * The built-in stories. Every entry was read in full and its credit block checked on the specific African Storybook edition
 * (see docs/children-corner-content.md). Text is used unchanged apart from whitespace; pictures are re-encoded as JPEG.
 * Order here is the order shown. Titles with no verifiable licence are not listed.
 */
export const STORIES: StoryMeta[] = [
  {
    slug: "how-stories-came-to-people",
    title: "How Stories Came to People",
    summary:
      "Anansi the spider climbs to the sky god to win all the stories for the people of the earth.",
    category: "folktale",
    words: 630,
    pageCount: 12,
    cardImage: "/stories/how-stories-came-to-people/card.jpg",
    cardFit: "cover",
    credit: {
      publishedTitle: "How Stories Came to People",
      author: "Ghanaian folktale",
      illustrator: "Wiehan de Jager",
      copyright: "© African Storybook Initiative 2014",
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      sourceUrl: "https://www.africanstorybook.org/reader.php?id=1943",
      sourceName: "African Storybook",
      asbLevel: "Read aloud",
    },
  },
  {
    slug: "lazy-anansi",
    title: "Lazy Anansi",
    summary: "Why spiders have long, thin legs.",
    category: "folktale",
    words: 406,
    pageCount: 8,
    cardImage: "/stories/lazy-anansi/card.jpg",
    cardFit: "cover",
    credit: {
      publishedTitle: "Lazy Anansi",
      author: "Ghanaian folktale",
      illustrator: "Wiehan de Jager",
      copyright: "© African Storybook Initiative 2014",
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      sourceUrl: "https://www.africanstorybook.org/reader.php?id=1077",
      sourceName: "African Storybook",
      asbLevel: "Read aloud",
    },
  },
  {
    slug: "hare-and-tortoise-again",
    title: "Hare and Tortoise (Again!)",
    summary: "The two old rivals must work together to carry a message over thorns and rivers.",
    category: "folktale",
    words: 460,
    pageCount: 15,
    cardImage: "/stories/hare-and-tortoise-again/card.jpg",
    cardFit: "cover",
    credit: {
      publishedTitle: "Hare and Tortoise (Again!)",
      author: "Venkatramana Gowda, Divaspathy Hegde",
      illustrator: "Padmanabha",
      copyright: "© Pratham Books 2014",
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      sourceUrl: "https://www.africanstorybook.org/reader.php?id=2058",
      sourceName: "African Storybook",
      originalSource: "www.prathambooks.org",
      asbLevel: "Longer paragraphs",
    },
  },
  {
    slug: "the-magic-mokoro",
    title: "The Magic Mokoro",
    summary: "A wise old woman’s magic boat brings fish, until a greedy chief tries to take it.",
    category: "folktale",
    words: 612,
    pageCount: 15,
    cardImage: "/stories/the-magic-mokoro/card.jpg",
    cardFit: "cover",
    credit: {
      publishedTitle: "The Magic Mokoro",
      author: "Wendy Hartman",
      illustrator: "Val Myburgh",
      copyright: "© African Storybook Initiative 2024",
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      sourceUrl: "https://www.africanstorybook.org/reader.php?id=49147",
      sourceName: "African Storybook",
      asbLevel: "Longer paragraphs",
    },
  },
  {
    slug: "a-tiny-seed",
    title: "A Tiny Seed: The Story of Wangari Maathai",
    summary: "A girl who loves growing things helps women plant millions of trees.",
    category: "real",
    words: 407,
    pageCount: 12,
    cardImage: "/stories/a-tiny-seed/card.jpg",
    cardFit: "contain",
    credit: {
      publishedTitle: "A tiny seed: The story of Wangari Maathai",
      author: "Nicola Rijsdijk",
      illustrator: "Maya Marshak",
      copyright:
        "© Nicola Rijsdijk, Maya Marshak, Tarryn-Anne Anderson, Bookdash.org and African Storybook Initiative 2015",
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      sourceUrl: "https://www.africanstorybook.org/reader.php?id=9809",
      sourceName: "African Storybook",
      originalSource: "www.bookdash.org",
      asbLevel: "Longer paragraphs",
    },
  },
  {
    slug: "wayan-and-the-turtles",
    title: "Wayan and the Turtles",
    summary: "A fisherman’s son meets a turtle and learns what plastic does to the sea.",
    category: "real",
    words: 520,
    pageCount: 12,
    cardImage: "/stories/wayan-and-the-turtles/card.jpg",
    cardFit: "cover",
    credit: {
      publishedTitle: "Wayan and the turtles",
      author: "Yvette Bezuidenhout",
      adaptation: "African Storybook, Yvette Bezuidenhout",
      illustrator: "Fabianus Bayu",
      copyright: "© African Storybook Initiative 2019",
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      sourceUrl: "https://www.africanstorybook.org/reader.php?id=34111",
      sourceName: "African Storybook",
      originalSource: "www.wayan.blue",
      asbLevel: "Longer paragraphs",
    },
  },
  {
    slug: "karizas-questions",
    title: "Kariza’s Questions",
    summary:
      "Kariza loves to ask questions, and one of them leads her to a clever way to wash hands.",
    category: "real",
    words: 385,
    pageCount: 12,
    cardImage: "/stories/karizas-questions/card.jpg",
    cardFit: "cover",
    credit: {
      publishedTitle: "Kariza's questions",
      author: "Jean de Dieu Bavugempore",
      translator: "Aloysie Uwizeyemariya",
      illustrator: "Rob Owen",
      copyright: "© African Storybook Initiative 2017",
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      sourceUrl: "https://www.africanstorybook.org/reader.php?id=22197",
      sourceName: "African Storybook",
      asbLevel: "Longer paragraphs",
    },
  },
  {
    slug: "lets-ride-on-raindrops",
    title: "Let’s Ride on Raindrops",
    summary:
      "Children ride a raindrop through the water cycle, from cloud to soil to sea and back.",
    category: "real",
    words: 440,
    pageCount: 12,
    cardImage: "/stories/lets-ride-on-raindrops/card.jpg",
    cardFit: "cover",
    credit: {
      publishedTitle: "Let's ride on raindrops",
      author: "Ndivhuho Mutsila",
      translator: "Ndivhuho Mutsila",
      illustrator: "Sayan Mukherjee",
      copyright: "© African Storybook Initiative 2021, Pratham Books (images)",
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      sourceUrl: "https://www.africanstorybook.org/reader.php?id=36034",
      sourceName: "African Storybook",
      asbLevel: "Longer paragraphs",
    },
  },
];

/** Story text is loaded only when a story is opened, one small module per story. */
const LOADERS: Record<string, () => Promise<{ default: StoryText }>> = {
  "how-stories-came-to-people": () => import("./text/how-stories-came-to-people"),
  "lazy-anansi": () => import("./text/lazy-anansi"),
  "hare-and-tortoise-again": () => import("./text/hare-and-tortoise-again"),
  "the-magic-mokoro": () => import("./text/the-magic-mokoro"),
  "a-tiny-seed": () => import("./text/a-tiny-seed"),
  "wayan-and-the-turtles": () => import("./text/wayan-and-the-turtles"),
  "karizas-questions": () => import("./text/karizas-questions"),
  "lets-ride-on-raindrops": () => import("./text/lets-ride-on-raindrops"),
};

export const getStory = (slug: string | null | undefined) =>
  STORIES.find((s) => s.slug === slug) ?? null;

export async function loadStoryText(slug: string): Promise<StoryText> {
  const load = LOADERS[slug];
  if (!load) throw new Error(`Unknown story: ${slug}`);
  return (await load()).default;
}

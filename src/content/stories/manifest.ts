import type { StoryMeta, StoryText } from "./types";

const LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/";

/** What every ASb story says about itself. */
const ASB_CHANGES = [
  "The words are unchanged apart from spacing.",
  "The pictures are the edition’s own, resized and re-saved for this app.",
];

const BD_NOTE =
  "Book Dash’s printed layout is not reproduced: the book is shown one page at a time, with its words as text.";

const SW_NOTE =
  "StoryWeaver’s printed layout is not reproduced: the book is shown one page at a time, with its words as text.";

/**
 * The built-in stories, in the order shown (shortest reading first). Each was read in full and its credits and licence checked
 * on the specific edition (see docs/children-corner-content.md). Pictures are re-encoded as JPEG; none has been redrawn,
 * recoloured or had lettering removed. Titles with no verifiable licence are not listed.
 *
 * `words` counts the story itself; `extraWords` counts pages a book prints after the story (notes, a game), which are shown
 * after it under their own label. Lengths and filters use the two together, because that is what is on the screen.
 */
export const STORIES: StoryMeta[] = [
  {
    slug: "whoop-goes-the-pufferfish",
    title: "Whoop, Goes the Pufferfish",
    summary: "A baby pufferfish is stranded in a tide pool until the sea comes back.",
    themes: ["nature"],
    words: 260,
    extraWords: 90,
    extraName: "in the tide pool notes",
    pageCount: 11,
    cardImage: "/stories/whoop-goes-the-pufferfish/card.jpg",
    cardFit: "cover",
    credit: {
      publishedTitle: "Whoop, Goes the Pufferfish",
      people: [
        ["Written by", "Sejal Mehta"],
        ["Illustrated by", "Pia Meenakshi"],
        ["Published by", "Pratham Books"],
      ],
      copyright: "© Pratham Books, 2019",
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      source: {
        name: "StoryWeaver",
        url: "https://storyweaver.org.in/en/stories/60744-whoop-goes-the-pufferfish",
      },
      attribution:
        "Whoop, Goes the Pufferfish (English), written by Sejal Mehta, illustrated by Pia Meenakshi, supported by Oracle, published by Pratham Books (© Pratham Books, 2019) under a CC BY 4.0 license, first released on StoryWeaver. Read, create and translate stories for free on www.storyweaver.org.in",
      acknowledgements: [
        "Development of this book was supported by Oracle.",
        "Guest Editor: Radha Rangarajan. Guest Art Director: Snigdha Rao.",
      ],
      changes: [
        "The words are unchanged apart from spacing and where lines wrap.",
        "The pictures are taken from the book’s PDF (they contain no lettering), resized and re-saved. One of them (the pufferfish puffing up) has a pale, empty panel where the printed book placed its words; it is shown as published.",
        "The book’s last page, about tide pools, is shown after the story under the label “Tide pool notes” and counted separately.",
        SW_NOTE,
      ],
    },
  },
  {
    slug: "karizas-questions",
    title: "Kariza’s Questions",
    summary:
      "Kariza loves to ask questions, and one of them leads her to a clever way to wash hands.",
    themes: ["everyday", "science"],
    words: 385,
    extraWords: 0,
    pageCount: 12,
    cardImage: "/stories/karizas-questions/card.jpg",
    cardFit: "cover",
    credit: {
      publishedTitle: "Kariza's questions",
      people: [
        ["Written by", "Jean de Dieu Bavugempore"],
        ["Translated by", "Aloysie Uwizeyemariya"],
        ["Illustrated by", "Rob Owen"],
      ],
      copyright: "© African Storybook Initiative 2017",
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      source: {
        name: "African Storybook",
        url: "https://www.africanstorybook.org/reader.php?id=22197",
      },
      attribution:
        "“Kariza's questions” by Jean de Dieu Bavugempore, translated by Aloysie Uwizeyemariya, illustrated by Rob Owen. © African Storybook Initiative 2017. Creative Commons Attribution 4.0. Source: African Storybook, www.africanstorybook.org",
      acknowledgements: [],
      changes: ASB_CHANGES,
    },
  },
  {
    slug: "jackal-and-the-sun",
    title: "Jackal and the Sun",
    summary: "A lazy jackal falls for the sun and tries to carry her home.",
    themes: ["tales"],
    words: 316,
    extraWords: 137,
    extraName: "in the story notes",
    pageCount: 10,
    cardImage: "/stories/jackal-and-the-sun/card.jpg",
    cardFit: "cover",
    credit: {
      publishedTitle: "Jackal and the sun",
      people: [
        ["Story", "Traditional San story, retold by Marlene Winberg"],
        ["Illustrated by", "Manyeka Arts Trust"],
      ],
      copyright: "© Manyeka Arts Trust 2014",
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      source: {
        name: "African Storybook",
        url: "https://www.africanstorybook.org/reader.php?id=5276",
      },
      originalSource: "www.manyeka.co.za",
      attribution:
        "“Jackal and the sun”, a traditional San story, illustrated by Manyeka Arts Trust. © Manyeka Arts Trust 2014. Creative Commons Attribution 4.0. Source: African Storybook, www.africanstorybook.org. Original source: www.manyeka.co.za",
      acknowledgements: [
        "In 2005 the Naro storyteller Bega Cgase of the Kalahari Desert in Botswana told this story to Marlene Winberg, who retells it here.",
        "The illustrations are from storyboards by Marlene Winberg, interpreted digitally by Satsiri Winberg through manipulations of the Manyeka Art Collection of paintings made by the San artists /Thaalu Rumao, /Tuoi Samcuia and Joao Wenne Dikuango, who have all passed away since.",
      ],
      changes: [
        "The words are unchanged apart from spacing.",
        "The pictures are the edition’s own, resized and re-saved for this app.",
        "The edition’s closing notes are shown after the story under the label “Story notes” and counted separately.",
      ],
    },
  },
  {
    slug: "how-zebra-got-his-stripes",
    title: "How Zebra Got His Stripes",
    summary: "When Baboon guards the only watering hole, Zebra has had enough.",
    themes: ["funny", "nature"],
    words: 488,
    extraWords: 0,
    pageCount: 10,
    cardImage: "/stories/how-zebra-got-his-stripes/card.jpg",
    cardFit: "cover",
    credit: {
      publishedTitle: "How Zebra got his stripes",
      people: [
        ["Written by", "Jaco Jacobs"],
        ["Illustrated by", "Stephen Wallace"],
      ],
      copyright: "© Lapa 2016",
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      source: {
        name: "African Storybook",
        url: "https://www.africanstorybook.org/reader.php?id=19262",
      },
      attribution:
        "“How Zebra got his stripes” by Jaco Jacobs, illustrated by Stephen Wallace. © Lapa 2016. Creative Commons Attribution 4.0. Source: African Storybook, www.africanstorybook.org",
      acknowledgements: ["African Storybook lists this story as donated by LAPA Publishers."],
      changes: ASB_CHANGES,
    },
  },
  {
    slug: "a-fish-and-a-gift",
    title: "A Fish and a Gift",
    summary: "Yusuf waits on the beach to see what his fisherman father will bring home.",
    themes: ["everyday", "nature"],
    words: 655,
    extraWords: 0,
    pageCount: 12,
    cardImage: "/stories/a-fish-and-a-gift/card.jpg",
    cardFit: "contain",
    credit: {
      publishedTitle: "A Fish and a Gift",
      people: [
        ["Written by", "Liesl Jobson"],
        ["Illustrated by", "Jesse Breytenbach"],
        ["Designed by", "Andy Thesen"],
      ],
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      source: { name: "Book Dash", url: "https://bookdash.org/books/a-fish-and-a-gift/" },
      attribution:
        "Originally published by Book Dash under a Creative Commons CC BY 4.0 licence. This book can be read for free on www.bookdash.org and was created by Liesl Jobson (writer), Jesse Breytenbach (illustrator) and Andy Thesen (designer). The edition names no editor.",
      acknowledgements: [
        "Made with the help of the Book Dash participants in Cape Town on 28 June 2014.",
        "Thanks to John Hishin for the photographs of the Muizenberg treknet fishermen that sparked this story.",
      ],
      changes: [
        "The words are unchanged apart from spacing.",
        "The pictures are Book Dash’s own illustration files made without lettering, resized and re-saved for this app.",
        BD_NOTE,
      ],
      logo: "book-dash",
    },
  },
  {
    slug: "searching-for-the-spirit-of-spring",
    title: "Searching for the Spirit of Spring",
    summary: "Nkanyezi sets out to bring the spirit of celebration back to her village.",
    themes: ["tales"],
    words: 679,
    extraWords: 0,
    pageCount: 12,
    cardImage: "/stories/searching-for-the-spirit-of-spring/card.jpg",
    cardFit: "cover",
    credit: {
      publishedTitle: "Searching for the spirit of spring",
      people: [
        ["Written by", "Mosa Mahlaba"],
        ["Illustrated by", "Selina Masego Morulane"],
        ["Designed by", "Sibusiso Mkhwanazi"],
      ],
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      source: {
        name: "Book Dash",
        url: "https://bookdash.org/books/searching-for-the-spirit-of-spring/",
      },
      attribution:
        "Originally published by Book Dash under a Creative Commons CC BY 4.0 licence. This book can be read for free on www.bookdash.org and was created by Mosa Mahlaba (writer), Selina Masego Morulane (illustrator) and Sibusiso Mkhwanazi (designer). The edition names no editor.",
      acknowledgements: [
        "Made with the help of the Book Dash participants in Johannesburg on 27 June 2015.",
      ],
      changes: [
        "The words are unchanged apart from spacing (one missing space after a full stop was added).",
        "The pictures are the illustrations placed in Book Dash’s ebook (they contain no lettering), resized and re-saved for this app.",
        BD_NOTE,
      ],
      logo: "book-dash",
    },
  },
  {
    slug: "the-girl-who-could-not-stop-laughing",
    title: "The Girl Who Could Not Stop Laughing",
    summary: "T. Sundari can’t stop laughing, and her scientist brother explains why that’s fine.",
    themes: ["funny", "science", "everyday"],
    words: 761,
    extraWords: 36,
    extraName: "in the laughing game",
    pageCount: 21,
    cardImage: "/stories/the-girl-who-could-not-stop-laughing/card.jpg",
    cardFit: "cover",
    credit: {
      publishedTitle: "The Girl Who Could Not Stop Laughing",
      people: [
        ["Written by", "Meera Ganapathi"],
        ["Illustrated by", "ROSH"],
        ["Published by", "Pratham Books"],
      ],
      copyright: "© Pratham Books, 2019",
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      source: {
        name: "StoryWeaver",
        url: "https://storyweaver.org.in/en/stories/59108-the-girl-who-could-not-stop-laughing",
      },
      attribution:
        "The Girl Who Could Not Stop Laughing (English), written by Meera Ganapathi, illustrated by ROSH, supported by CISCO, published by Pratham Books (© Pratham Books, 2019) under a CC BY 4.0 license, first released on StoryWeaver. Read, create and translate stories for free on www.storyweaver.org.in",
      acknowledgements: [
        "Development of this book was supported by CISCO.",
        "Guest Editor: Padmaparna Ghosh. Guest Art Director: Sumedha Sah.",
      ],
      changes: [
        "The words are unchanged apart from spacing and where lines wrap.",
        "In the printed book some words (sound effects, a list, a footnote) are scattered around the pictures in different letter sizes. Here they are shown as plain lines in the book’s own reading order, without the printed sizes, and the list of funny things is shown in numbered order.",
        "The pictures are taken from the book’s PDF (they contain no lettering), resized and re-saved.",
        "The book’s last page, a game of laughs, is shown after the story under the label “A laughing game” and counted separately.",
        SW_NOTE,
      ],
    },
  },
  {
    slug: "sailing-ships-and-sinking-spoons",
    title: "Sailing Ships and Sinking Spoons",
    summary: "Two young monks and their teachers use an apple, a spoon and a tub to learn why ships float.",
    themes: ["science"],
    words: 834,
    extraWords: 354,
    extraName: "in the science notes",
    pageCount: 19,
    cardImage: "/stories/sailing-ships-and-sinking-spoons/card.jpg",
    cardFit: "cover",
    credit: {
      publishedTitle: "Sailing Ships and Sinking Spoons",
      people: [
        ["Written by", "Jamyang Gyaltsen"],
        ["Illustrated by", "Ngawang Dorjee"],
        ["Published by", "Pratham Books"],
      ],
      copyright: "© Pratham Books, 2018",
      licence: "CC BY 4.0",
      licenceUrl: LICENCE_URL,
      source: {
        name: "StoryWeaver",
        url: "https://storyweaver.org.in/en/stories/34971-sailing-ships-and-sinking-spoons",
      },
      attribution:
        "Sailing Ships and Sinking Spoons (English), written by Jamyang Gyaltsen, illustrated by Ngawang Dorjee, supported by CISCO, published by Pratham Books (© Pratham Books, 2018) under a CC BY 4.0 license, first released on StoryWeaver. Read, create and translate stories for free on www.storyweaver.org.in",
      acknowledgements: [
        "Development of this book was supported by CISCO.",
        "Guest Editor: Aravinda Anantharaman.",
      ],
      changes: [
        "The words are unchanged apart from spacing and where lines wrap, including the book’s two short glossary notes (Genla, Tashi delek).",
        "The book’s four “What is …?” science pages (gravity, buoyancy, displacement, density) come after the story in the printed book. Here they are shown after the story under the label “Science notes” and counted separately; they are not part of the story.",
        "Three pages of the book have a picture and no words; they are kept as picture-only pages.",
        "The pictures are taken from the book’s PDF (they contain no lettering), resized and re-saved.",
        SW_NOTE,
      ],
    },
  },
];

/** Story text is loaded only when a story is opened, one small module per story. */
const LOADERS: Record<string, () => Promise<{ default: StoryText }>> = {
  "whoop-goes-the-pufferfish": () => import("./text/whoop-goes-the-pufferfish"),
  "karizas-questions": () => import("./text/karizas-questions"),
  "jackal-and-the-sun": () => import("./text/jackal-and-the-sun"),
  "how-zebra-got-his-stripes": () => import("./text/how-zebra-got-his-stripes"),
  "a-fish-and-a-gift": () => import("./text/a-fish-and-a-gift"),
  "searching-for-the-spirit-of-spring": () => import("./text/searching-for-the-spirit-of-spring"),
  "the-girl-who-could-not-stop-laughing": () =>
    import("./text/the-girl-who-could-not-stop-laughing"),
  "sailing-ships-and-sinking-spoons": () => import("./text/sailing-ships-and-sinking-spoons"),
};

export const getStory = (slug: string | null | undefined) =>
  STORIES.find((s) => s.slug === slug) ?? null;

export async function loadStoryText(slug: string): Promise<StoryText> {
  const load = LOADERS[slug];
  if (!load) throw new Error(`Unknown story: ${slug}`);
  return (await load()).default;
}

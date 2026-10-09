import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  STORIES,
  THEME_LABEL,
  THEME_ORDER,
  getStory,
  lengthLabel,
  loadStoryText,
  readingWords,
  wordsLine,
} from "@/content/stories";

const pub = (p: string) => path.resolve(process.cwd(), "public", p.replace(/^\//, ""));
const each = STORIES.map((s) => [s.slug, s] as const);
const wordCount = (ps: string[]) => ps.join(" ").split(/\s+/).filter(Boolean).length;

describe("built-in story manifest", () => {
  it("lists the eight approved stories with unique slugs", () => {
    expect(STORIES.map((s) => s.slug)).toEqual([
      "whoop-goes-the-pufferfish",
      "karizas-questions",
      "jackal-and-the-sun",
      "how-zebra-got-his-stripes",
      "a-fish-and-a-gift",
      "searching-for-the-spirit-of-spring",
      "the-girl-who-could-not-stop-laughing",
      "sailing-ships-and-sinking-spoons",
    ]);
  });

  it("comes from three different sources and covers every theme", () => {
    expect(new Set(STORIES.map((s) => s.credit.source.name))).toEqual(
      new Set(["African Storybook", "Book Dash", "StoryWeaver"]),
    );
    const themes = new Set(STORIES.flatMap((s) => s.themes));
    expect([...themes].sort()).toEqual([...THEME_ORDER].sort());
    for (const t of THEME_ORDER) expect(THEME_LABEL[t]).toBeTruthy();
  });

  it.each(each)("%s carries the complete credit its source and licence require", (_slug, s) => {
    const c = s.credit;
    expect(c.publishedTitle.trim()).not.toBe("");
    expect(c.licence).toBe("CC BY 4.0");
    expect(c.licenceUrl).toBe("https://creativecommons.org/licenses/by/4.0/");
    const roles = c.people.map(([r]) => r);
    expect(roles.some((r) => /illustrat/i.test(r))).toBe(true); // every edition credits its pictures
    expect(c.people.length).toBeGreaterThanOrEqual(2);
    for (const [, names] of c.people) expect(names.trim()).not.toBe("");
    expect(c.attribution.trim()).not.toBe("");
    expect(c.changes.length).toBeGreaterThan(0);
    expect(c.changes.join(" ")).toMatch(/pictures/i); // what was done to the pictures is always said
    // every person who made the story is named in the attribution (publishers and storytellers excepted)
    for (const [role, names] of c.people) {
      if (/^(Written|Illustrated|Designed|Translated) by$/.test(role))
        for (const n of names.split(/,| and /).map((x) => x.trim())) expect(c.attribution).toContain(n);
    }
    if (c.source.name === "African Storybook") {
      expect(c.source.url).toMatch(/^https:\/\/www\.africanstorybook\.org\/reader\.php\?id=\d+$/);
      expect(c.copyright).toMatch(/^©/);
      expect(c.attribution).toMatch(/African Storybook/);
      expect(c.attribution).toContain(c.copyright!);
    }
    if (c.source.name === "StoryWeaver") {
      expect(c.source.url).toMatch(/^https:\/\/storyweaver\.org\.in\/en\/stories\/\d+-[a-z-]+$/);
      expect(c.copyright).toMatch(/^© Pratham Books, \d{4}$/);
      // StoryWeaver's own required elements: platform, publisher, donor, licence, title
      expect(c.attribution).toContain("under a CC BY 4.0 license");
      expect(c.attribution).toContain("on StoryWeaver");
      expect(c.attribution).toContain("published by Pratham Books");
      expect(c.attribution).toMatch(/supported by (Oracle|CISCO)/);
      expect(c.attribution).toContain(s.title);
      expect(c.acknowledgements.join(" ")).toMatch(/supported by/);
    }
    if (c.source.name === "Book Dash") {
      expect(c.source.url).toMatch(/^https:\/\/bookdash\.org\/books\/[a-z-]+\/$/);
      // Book Dash's own required wording, its web address, its logo, and the creatives named
      expect(c.attribution).toContain(
        "Originally published by Book Dash under a Creative Commons CC BY 4.0 licence.",
      );
      expect(c.attribution).toContain("www.bookdash.org");
      expect(c.attribution).toMatch(/\(writer\)/);
      expect(c.attribution).toMatch(/\(illustrator\)/);
      expect(c.attribution).toMatch(/\(designer\)/);
      expect(c.logo).toBe("book-dash");
      expect(existsSync(pub("/credits/book-dash-logo.svg"))).toBe(true);
      expect(c.changes.join(" ")).toMatch(/page at a time/); // the adaptation is stated
    } else {
      expect(c.logo).toBeUndefined();
    }
  });

  it("names the San artists whose paintings the Jackal and the Sun pictures rework", () => {
    const a = getStory("jackal-and-the-sun")!.credit.acknowledgements.join(" ");
    for (const n of ["/Thaalu Rumao", "/Tuoi Samcuia", "Joao Wenne Dikuango", "Marlene Winberg", "Bega Cgase"])
      expect(a).toContain(n);
    expect(a).toMatch(/passed away/);
  });

  it.each(each)("%s: text matches the manifest, with the story and its extra pages counted separately", async (_slug, s) => {
    const t = await loadStoryText(s.slug);
    expect(t.pages).toHaveLength(s.pageCount);
    const story = t.pages.filter((p) => !p.extra);
    const extra = t.pages.filter((p) => p.extra);
    expect(wordCount(story.flatMap((p) => p.paragraphs))).toBe(s.words);
    const extraWords = extra.reduce((n, p) => n + wordCount([p.heading ?? "", ...p.paragraphs]), 0);
    expect(extraWords).toBe(s.extraWords);
    // pages printed after the story come after it, together, and the manifest says what they are
    const firstExtra = t.pages.findIndex((p) => p.extra);
    if (extra.length) {
      expect(firstExtra).toBe(story.length);
      expect(s.extraName).toBeTruthy();
      for (const p of extra) expect(p.extra!.trim()).not.toBe("");
    } else {
      expect(s.extraWords).toBe(0);
    }
    for (const p of t.pages) {
      expect(p.paragraphs.length > 0 || !!p.image).toBe(true); // a page has words or a picture
      for (const para of p.paragraphs) {
        expect(para.trim()).toBe(para);
        expect(para).not.toBe("");
        expect(para).not.toMatch(/\s{2,}/); // whitespace normalised
        expect(para.includes(String.fromCharCode(0)) || para.includes(String.fromCharCode(0xfffd))).toBe(false); // no lost ligature glyphs
        expect(para).not.toMatch(/\bPu\?|\?er\b|\b[A-Za-z]+\?[a-z]+\b/); // nor a leftover placeholder
      }
    }
  });

  it.each(each)("%s: every picture is served from the app and has a description", async (_slug, s) => {
    expect(existsSync(pub(s.cardImage))).toBe(true);
    const t = await loadStoryText(s.slug);
    const withImage = t.pages.filter((p) => p.image);
    expect(withImage.length).toBeGreaterThan(0);
    for (const p of withImage) {
      expect(existsSync(pub(p.image!))).toBe(true);
      expect((p.alt ?? "").trim().length).toBeGreaterThan(15); // described, not left as decoration
      expect(p.alt).not.toMatch(/\bimage of\b|\bpicture of\b/i);
    }
  });

  it("only offers filters for themes the collection has, and each theme has a story", () => {
    for (const t of THEME_ORDER) expect(STORIES.some((s) => s.themes.includes(t))).toBe(true);
  });

  it("the stories are not described by a reading speed or goal", () => {
    for (const s of STORIES)
      expect(`${s.summary} ${lengthLabel(readingWords(s))} ${wordsLine(s)}`).not.toMatch(
        /wpm|words per minute|minutes?\b|goal|score/i,
      );
  });

  it("describes length by word count bands, and by the full reading length", () => {
    expect(lengthLabel(300)).toBe("Short read");
    expect(lengthLabel(420)).toBe("Short read");
    expect(lengthLabel(421)).toBe("Medium read");
    expect(lengthLabel(561)).toBe("Longer story");
    const sailing = getStory("sailing-ships-and-sinking-spoons")!;
    expect(readingWords(sailing)).toBe(sailing.words + sailing.extraWords);
    expect(wordsLine(sailing)).toBe(`${sailing.words} words, plus ${sailing.extraWords} in the science notes`);
    expect(wordsLine(getStory("a-fish-and-a-gift")!)).toBe("655 words");
  });

  it("refuses unknown stories rather than guessing", async () => {
    await expect(loadStoryText("not-a-story")).rejects.toThrow();
    expect(getStory("not-a-story")).toBeNull();
  });
});

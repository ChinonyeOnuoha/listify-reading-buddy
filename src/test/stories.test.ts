import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORY_LABEL, STORIES, attributionLine, getStory, lengthLabel, loadStoryText } from "@/content/stories";

const pub = (p: string) => path.resolve(process.cwd(), "public", p.replace(/^\//, ""));

describe("built-in story manifest", () => {
  it("lists six to eight stories with unique slugs", () => {
    expect(STORIES.length).toBeGreaterThanOrEqual(6);
    expect(STORIES.length).toBeLessThanOrEqual(8);
    expect(new Set(STORIES.map((s) => s.slug)).size).toBe(STORIES.length);
  });

  it.each(STORIES.map((s) => [s.slug, s] as const))("%s carries the complete credit and licence the edition requires", (_slug, s) => {
    const c = s.credit;
    for (const field of [c.publishedTitle, c.author, c.illustrator, c.copyright, c.asbLevel]) expect(field.trim()).not.toBe("");
    expect(c.licence).toBe("CC BY 4.0");
    expect(c.licenceUrl).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(c.sourceName).toBe("African Storybook");
    expect(c.sourceUrl).toMatch(/^https:\/\/www\.africanstorybook\.org\/reader\.php\?id=\d+$/);
    expect(c.copyright).toMatch(/^©/);
  });

  it.each(STORIES.map((s) => [s.slug, s] as const))("%s: text loads, matches the manifest and has no empty paragraph", async (_slug, s) => {
    const t = await loadStoryText(s.slug);
    expect(t.pages).toHaveLength(s.pageCount);
    const words = t.pages.flatMap((p) => p.paragraphs).join(" ").split(/\s+/).filter(Boolean).length;
    expect(words).toBe(s.words);
    for (const p of t.pages) {
      expect(p.paragraphs.length).toBeGreaterThan(0);
      for (const para of p.paragraphs) {
        expect(para.trim()).toBe(para);
        expect(para).not.toBe("");
      }
      for (const para of p.paragraphs) expect(para).not.toMatch(/\s{2,}/); // whitespace normalised
    }
  });

  it.each(STORIES.map((s) => [s.slug, s] as const))("%s: every picture it names is served from the app", async (_slug, s) => {
    expect(existsSync(pub(s.cardImage))).toBe(true);
    const t = await loadStoryText(s.slug);
    const images = t.pages.map((p) => p.image).filter((i): i is string => !!i);
    expect(images.length).toBeGreaterThan(0);
    for (const img of images) expect(existsSync(pub(img))).toBe(true);
  });

  it("only offers filters the collection supports, each with several stories", () => {
    const cats = new Set(STORIES.map((s) => s.category));
    expect([...cats].sort()).toEqual(Object.keys(CATEGORY_LABEL).sort());
    for (const c of cats) expect(STORIES.filter((s) => s.category === c).length).toBeGreaterThanOrEqual(3);
  });

  it("the stories are not described by a reading speed or goal", () => {
    for (const s of STORIES) expect(`${s.summary} ${lengthLabel(s.words)}`).not.toMatch(/wpm|words per minute|minutes?\b|goal|score/i);
  });

  it("describes length by word count bands", () => {
    expect(lengthLabel(300)).toBe("Short read");
    expect(lengthLabel(420)).toBe("Short read");
    expect(lengthLabel(421)).toBe("Medium read");
    expect(lengthLabel(561)).toBe("Longer story");
  });

  it("builds the attribution line the licence asks for", () => {
    const s = getStory("karizas-questions")!;
    const line = attributionLine(s.credit);
    expect(line).toContain("“Kariza's questions”");
    expect(line).toContain("by Jean de Dieu Bavugempore");
    expect(line).toContain("translated by Aloysie Uwizeyemariya");
    expect(line).toContain("illustrated by Rob Owen");
    expect(line).toContain("© African Storybook Initiative 2017");
    expect(line).toContain("CC BY 4.0");
  });

  it("refuses unknown stories rather than guessing", async () => {
    await expect(loadStoryText("not-a-story")).rejects.toThrow();
    expect(getStory("not-a-story")).toBeNull();
  });
});

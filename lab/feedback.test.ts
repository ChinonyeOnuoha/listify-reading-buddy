import { describe, expect, it } from "vitest";
import { align, mergePauses, timestampQuality, type Pause } from "./analysis";
import { buildFeedback, paceChange } from "./feedback";

const PASSAGE =
  "The cat sat on the mat. It was warm and quiet there. A bird sang in the tree. The cat did not move at all. Then the sun went down.";

/** Timed words for a reading: `rate` seconds per word, with optional overrides. */
function read(text: string, rate = 0.4, confidence = 0.95, from = 0) {
  return text.split(" ").map((t, i) => ({
    text: t,
    start: from + i * rate,
    end: from + i * rate + rate * 0.8,
    confidence,
  }));
}
const plain = PASSAGE.replace(/[.,]/g, "");
const fb = (words: ReturnType<typeof read>, pauses: Pause[] = []) =>
  buildFeedback({
    passage: PASSAGE,
    ops: align(PASSAGE, words),
    words,
    pauses,
    quality: timestampQuality(words),
  });

describe("prepared feedback", () => {
  it("acknowledges a clean reading briefly, without criticism", () => {
    const f = fb(read(plain));
    expect(f.items).toHaveLength(1);
    expect(f.items[0]!.status).toBe("clear");
    expect(f.tryNext).toBeNull();
  });

  it("shows a repetition with its words and offers one optional thing for a new passage", () => {
    const f = fb(read(plain.replace("sang in", "sang sang in")));
    const rep = f.items.find((i) => i.kind === "repetition")!;
    expect(rep.observation).toContain("“sang” was heard twice");
    expect(rep.words).toContain("sang");
    expect(f.tryNext).toMatch(/next passage/);
  });

  it("names an omitted word and the place it belongs", () => {
    const f = fb(read(plain.replace("warm and quiet", "warm quiet")));
    const om = f.items.find((i) => i.kind === "omission")!;
    expect(om.observation).toBe("“and” wasn't heard here.");
    expect(om.words).toContain("warm and quiet");
  });

  it("treats a low-confidence difference as couldn't-assess, not as a reading mistake", () => {
    const words = read(plain.replace("bird", "bud"));
    words.find((w) => w.text === "bud")!.confidence = 0.3;
    const f = fb(words);
    expect(f.items.some((i) => i.status === "difference")).toBe(false);
    expect(f.items.find((i) => i.kind === "unclear")!.status).toBe("unsure");
  });

  it("mentions a long pause inside a sentence but not one after a full stop", () => {
    const words = read(plain);
    const at = (w: string) => words.find((x) => x.text === w)!;
    const inside: Pause = { start: at("on").end + 0.05, end: at("on").end + 2.05, duration: 2 };
    const between: Pause = { start: at("mat").end + 0.05, end: at("mat").end + 2.05, duration: 2 };
    const f = fb(words, [inside, between]);
    const pauses = f.items.filter((i) => i.kind === "pause");
    expect(pauses).toHaveLength(1);
    expect(pauses[0]!.words).toBe("“on … the”");
    expect(pauses[0]!.status).toBe("review");
  });

  it("reports a pace change only with reliable timings, and never guesses why", () => {
    const slow = read(
      "The cat sat on the mat It was warm and quiet there A bird sang in the tree",
      0.6,
    );
    const fast = read(
      "The cat did not move at all Then the sun went down",
      0.25,
      0.95,
      slow.at(-1)!.end + 0.3,
    );
    const words = [...slow, ...fast];
    const { change } = paceChange(PASSAGE, align(PASSAGE, words));
    expect(change?.words).toBe("The cat did not");
    expect(change!.after).toBeGreaterThan(change!.before);
    const f = fb(words);
    expect(f.items.find((i) => i.kind === "pace")!.observation).toMatch(/quicker/);
    for (const i of f.items)
      expect(i.observation).not.toMatch(/because|nervous|accent is|score|tired|struggl/i);

    const untimed = words.map((w) => ({ ...w, start: null as unknown as number }));
    expect(fb(untimed).items.find((i) => i.kind === "pace")!.status).toBe("unsure");
  });

  it("doesn't report differences on names or titles", () => {
    const passage = "Every evening Mrs Okafor walked to Willow Lane. She sat down.";
    const words = read("Every evening missus okafo walked to widow lane She sat down");
    const f = buildFeedback({
      passage,
      ops: align(passage, words),
      words,
      pauses: [],
      quality: timestampQuality(words),
    });
    expect(f.items.map((i) => i.status)).toEqual(["clear"]);
  });

  it("treats a silence split by a brief click as one pause, and leaves it out of pace", () => {
    expect(
      mergePauses([
        { start: 1, end: 3.7, duration: 2.7 },
        { start: 3.72, end: 6.7, duration: 2.98 },
      ]),
    ).toEqual([{ start: 1, end: 6.7, duration: 5.7 }]);
    // Even pace throughout, with a 5 s pause inside the fourth sentence.
    const words = read(plain);
    const at = words.findIndex((w) => w.text === "move");
    for (const w of words.slice(at)) {
      w.start += 5;
      w.end += 5;
    }
    const pause: Pause = {
      start: words[at - 1]!.end + 0.1,
      end: words[at]!.start - 0.1,
      duration: 4.8,
    };
    expect(paceChange(PASSAGE, align(PASSAGE, words), [pause]).change).toBeNull();
    expect(fb(words, [pause]).items.map((i) => i.kind)).toEqual(["pause"]);
  });
});

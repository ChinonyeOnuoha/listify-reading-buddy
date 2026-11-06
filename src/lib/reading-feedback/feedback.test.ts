import { describe, expect, it } from "vitest";
import { align, mergePauses, timestampQuality, type Pause } from "./analysis";
import { buildFeedback, paceBins, paceChange } from "./feedback";

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

describe("notes on a reading", () => {
  it("says nothing stood out for a clean reading, with nothing to try", () => {
    const f = fb(read(plain));
    expect(f.moments).toEqual([]);
    expect(f.tryNext).toBeNull();
    expect(f.pace.summary).toMatch(/^Steady all the way through, at about \d+ words a minute\.$/);
  });

  it("leaves single-word differences out, because speech recognition mishears them", () => {
    expect(fb(read(plain.replace("bird", "bud"))).moments).toEqual([]);
    expect(fb(read(plain.replace("warm and quiet", "warm quiet"))).moments).toEqual([]);
    expect(fb(read(plain.replace("sang in", "sang sang in"))).moments).toEqual([]);
  });

  it("lists a skipped stretch of 3 or more words with the words and a time to play from", () => {
    const f = fb(read(plain.replace("A bird sang in the tree ", "")));
    expect(f.moments).toHaveLength(1);
    const m = f.moments[0]!;
    expect(m.kind).toBe("skipped");
    expect(m.text).toBe("“A bird sang in the tree”. A line may have been skipped.");
    expect(m.at).toBeGreaterThan(0);
    expect(f.tryNext).toMatch(/finger or a pen/);
  });

  it("lists a repeated stretch of 3 or more words", () => {
    const f = fb(read(plain.replace("sat on the mat", "sat on the sat on the mat")));
    const m = f.moments.find((x) => x.kind === "repeated");
    expect(m?.text).toBe("“sat on the” was heard twice in a row.");
  });

  it("says once when the recording stops before the passage, instead of listing what's left", () => {
    const f = fb(
      read("The cat sat on the mat It was warm and quiet there A bird sang in the tree"),
    );
    expect(f.moments).toEqual([]);
    expect(f.endsEarly).toMatch(/^The recording ends before “The cat did not move/);
  });

  it("mentions a long pause inside a sentence but not one after a full stop", () => {
    const words = read(plain);
    const at = (w: string) => words.find((x) => x.text === w)!;
    // Leave 2 s of silence after a word: everything after it starts 2 s later.
    const gapAfter = (w: string) => {
      const p: Pause = { start: at(w).end + 0.05, end: at(w).end + 2.05, duration: 2 };
      for (const x of words.slice(words.indexOf(at(w)) + 1)) {
        x.start += 2.1;
        x.end += 2.1;
      }
      return p;
    };
    const inside = gapAfter("on");
    const between = gapAfter("mat");
    const f = fb(words, [inside, between]);
    expect(f.moments).toHaveLength(1);
    expect(f.moments[0]).toMatchObject({
      kind: "pause",
      text: "About 2 seconds in “sat on … the”.",
    });
  });

  it("ignores a “silence” that has words heard inside it", () => {
    const words = read(plain);
    const quiet: Pause = { start: 1.1, end: 12, duration: 10.9 };
    expect(fb(words, [quiet]).moments).toEqual([]);
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
    expect(f.pace.summary).toMatch(/then quicker from about 0:\d\d\./);
    expect(f.tryNext).toMatch(/one easy breath/);
    const text = JSON.stringify(f);
    expect(text).not.toMatch(/because|nervous|accent is|score|tired|struggl|mistake/i);

    const untimed = words.map((w) => ({ ...w, start: null as unknown as number }));
    expect(fb(untimed).pace).toMatchObject({ bins: [], changeAt: null });
    expect(fb(untimed).pace.summary).toMatch(/couldn't be measured/);
  });

  it("charts words a minute every 20 seconds, with pauses taken out", () => {
    const words = read(plain + " " + plain + " " + plain + " " + plain, 0.4);
    const bins = paceBins(words, [], null);
    expect(bins.length).toBeGreaterThanOrEqual(3);
    for (const b of bins.slice(0, -1)) expect(b.wpm).toBeGreaterThan(140);
    const pause: Pause = { start: 2, end: 12, duration: 10 };
    expect(paceBins(words, [pause], null)[0]!.wpm).toBeGreaterThan(bins[0]!.wpm);
  });

  it("doesn't report skipped names or titles", () => {
    const passage = "Every evening Mrs Okafor Willow walked to the lane. She sat down.";
    const words = read("Every evening walked to the lane She sat down");
    const f = buildFeedback({
      passage,
      ops: align(passage, words),
      words,
      pauses: [],
      quality: timestampQuality(words),
    });
    expect(f.moments).toEqual([]);
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
    expect(fb(words, [pause]).moments.map((i) => i.kind)).toEqual(["pause"]);
  });

  it("is plain data that can be saved with the recording", () => {
    const f = fb(read(plain.replace("A bird sang in the tree ", "")));
    expect(JSON.parse(JSON.stringify(f))).toEqual(f);
  });
});

import { describe, expect, it } from "vitest";
import { align, findPauses, timestampQuality, type Word } from "./analysis";

const W = (s: string): Word[] => s.split(" ").map((text, i) => ({ text, start: i * 0.4, end: i * 0.4 + 0.3 }));
const kinds = (ops: ReturnType<typeof align>) => ops.filter((o) => o.type !== "match").map((o) => (o.type === "ins" ? `ins:${o.hyp.text}${o.repeatOf ? `(rep:${o.repeatOf})` : ""}` : o.type === "sub" ? `sub:${o.ref}->${o.hyp.text}` : `del:${o.ref}`));

describe("align", () => {
  it("finds no differences for an exact reading (case/punctuation ignored)", () => {
    expect(kinds(align("Some said an hour; others swore", W("some said an hour others swore")))).toEqual([]);
  });
  it("labels a repeated word as a possible repetition", () => {
    expect(kinds(align("Some said an hour", W("Some said said an hour")))).toEqual(["ins:said(rep:said)"]);
  });
  it("labels a restarted phrase as a possible repetition (all its words)", () => {
    const k = kinds(align("carried a small brass lantern", W("carried a small brass a small brass lantern")));
    expect(k).toHaveLength(3);
    expect(k.every((x) => x.includes("rep:a small brass"))).toBe(true);
  });
  it("separates omissions, additions and substitutions", () => {
    const k = kinds(align("on the low stone wall the warm circle three neighbours", W("on the stone wall the very warm circle two neighbours")));
    expect(k).toEqual(["del:low", "ins:very", "sub:three->two"]);
  });
});

describe("align equivalences", () => {
  it("treats spelling variants and joined/split compounds as matches", () => {
    expect(kinds(align("beside the post box three neighbours", W("beside the postbox three neighbors")))).toEqual([]);
    expect(kinds(align("the postbox", W("the post box")))).toEqual([]);
  });
});

describe("findPauses", () => {
  it("measures a 2 s gap between two sounds and ignores leading/trailing silence", () => {
    const rate = 16000;
    const a = new Float32Array(rate * 6);
    const tone = (from: number, to: number) => {
      for (let i = from * rate; i < to * rate; i++) a[i] = 0.3 * Math.sin((2 * Math.PI * 220 * i) / rate);
    };
    tone(1, 2);
    tone(4, 5);
    const { pauses } = findPauses(a, rate, 0.3);
    expect(pauses).toHaveLength(1);
    expect(pauses[0]!.duration).toBeGreaterThan(1.9);
    expect(pauses[0]!.duration).toBeLessThan(2.1);
  });
});

describe("timestampQuality", () => {
  it("flags out-of-order and zero-length timestamps", () => {
    const q = timestampQuality([
      { text: "a", start: 0, end: 0.3 },
      { text: "b", start: 0.2, end: 0.2 },
      { text: "c", start: 0.1, end: 0.4 },
    ]);
    expect(q.zeroLength).toBe(1);
    expect(q.backwards).toBe(1);
    expect(q.reliable).toBe(false);
  });
});

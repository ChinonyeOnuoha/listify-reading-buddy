import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * WCAG contrast for the design tokens, read straight from src/styles.css so the test can't drift from the CSS.
 * Text needs 4.5:1 (3:1 for large text); control boundaries and state indicators need 3:1.
 * Apricot is deliberately absent from the text pairs: it is decoration only and never carries text or an essential edge.
 */
const css = readFileSync(path.resolve(process.cwd(), "src/styles.css"), "utf8");
const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
const token = (name: string) => {
  const m = root.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`--${name} is not a plain hex token in :root`);
  return m[1]!;
};

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const page = token("ivory-page");
const card = token("ivory-card");
const tint = token("tint");
const muted = token("muted");
const apricotTint = token("apricot-tint");
const white = "#ffffff";

const TEXT: [string, string, string][] = [
  ["ink-text", "page", page], ["ink-text", "card", card], ["ink-text", "tint", tint], ["ink-text", "white field", white], ["ink-text", "apricot-tint chip", apricotTint],
  ["ink-text", "muted (segmented control)", muted],
  ["ink-heading", "page", page], ["ink-heading", "card", card], ["ink-heading", "tint", tint], ["ink-heading", "apricot-tint (response modal circle)", apricotTint],
  ["ink-support", "page", page], ["ink-support", "card", card], ["ink-support", "tint", tint], ["ink-support", "muted", muted],
  ["ink", "page", page], ["ink", "card", card], ["ink", "tint", tint],
  ["destructive", "page", page], ["destructive", "card", card], ["destructive", "white field", white],
];
const NON_TEXT: [string, string, string][] = [
  ["line", "page", page], ["line", "card", card], ["line", "white field", white],
  ["ink", "page", page], ["ink", "card", card], ["ink", "tint", tint], ["ink", "apricot-tint", apricotTint],
];

describe("design token contrast", () => {
  it.each(TEXT)("%s text on %s ≥ 4.5:1", (fg, _name, bg) => {
    expect(ratio(token(fg), bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("ivory text on the primary ink button ≥ 4.5:1", () => {
    expect(ratio(card, token("ink"))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT)("%s boundary / indicator on %s ≥ 3:1", (fg, _name, bg) => {
    expect(ratio(token(fg), bg)).toBeGreaterThanOrEqual(3);
  });

  it("apricot is too light to carry text — keep it decorative", () => {
    expect(ratio(token("apricot"), card)).toBeLessThan(3);
  });

  it("page and card stay distinct warm ivory surfaces (card slightly lighter)", () => {
    expect(lum(card)).toBeGreaterThan(lum(page));
  });
});

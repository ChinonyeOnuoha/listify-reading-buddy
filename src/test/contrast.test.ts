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

const night = token("night");
const panel = token("panel");
const raised = token("raised");
const selected = token("selected");
const soft = token("soft");
const SURFACES: [string, string][] = [
  ["night (page)", night],
  ["panel", panel],
  ["raised (cards, options)", raised],
  ["selected (hover, chosen)", selected],
];

/** Body and supporting text on every surface it appears on. */
const TEXT: [string, string, string][] = [
  ...SURFACES.map(([n, bg]) => ["cream", n, bg] as [string, string, string]),
  ...SURFACES.map(([n, bg]) => ["cream-2", n, bg] as [string, string, string]),
  ["cream", "soft (secondary buttons)", soft],
  ["cream-3", "night (placeholders)", night],
  ["cream-3", "panel", panel],
  ["cream-3", "raised", raised],
  ["amber", "panel (links)", panel],
  ["amber", "raised", raised],
  ["rose", "panel (delete links)", panel],
  ["rose", "raised (menus)", raised],
  ["paper-ink", "paper (sample passage)", token("paper")],
];
/** Control boundaries, focus rings and state colours: 3:1. */
const NON_TEXT: [string, string, string][] = [
  ...SURFACES.map(([n, bg]) => ["line", n, bg] as [string, string, string]),
  ...SURFACES.map(([n, bg]) => ["amber", n, bg] as [string, string, string]),
  ["lilac", "panel (recording dot)", panel],
  ["lilac", "raised", raised],
];

describe("design token contrast", () => {
  it.each(TEXT)("%s text on %s ≥ 4.5:1", (fg, _name, bg) => {
    expect(ratio(token(fg), bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("dark ink on the amber primary button and the rose delete button ≥ 4.5:1", () => {
    expect(ratio(token("amber-ink"), token("amber"))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(token("amber-ink"), token("rose"))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT)("%s boundary / indicator on %s ≥ 3:1", (fg, _name, bg) => {
    expect(ratio(token(fg), bg)).toBeGreaterThanOrEqual(3);
  });

  it("surfaces step up in lightness from the page to the selected state", () => {
    expect(lum(panel)).toBeGreaterThan(lum(night));
    expect(lum(raised)).toBeGreaterThan(lum(panel));
    expect(lum(selected)).toBeGreaterThan(lum(raised));
  });
});

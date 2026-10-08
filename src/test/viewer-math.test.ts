import { describe, expect, it } from "vitest";
import {
  FIT_VIEW,
  MAX_ZOOM,
  MIN_ZOOM,
  anchorAt,
  centreOf,
  clampZoom,
  fitSize,
  isFit,
  panBy,
  translateFor,
  viewFromTranslate,
  zoomAbout,
} from "@/lib/viewer-math";

const box = { w: 400, h: 600 };
const portrait = { w: 1170, h: 2532 }; // a phone screenshot
const tall = { w: 800, h: 4000 }; // a long scrolling page
const landscape = { w: 1600, h: 900 };

describe("fitSize", () => {
  it.each([
    ["portrait screenshot", portrait],
    ["tall page", tall],
    ["landscape image", landscape],
  ])("shows the whole %s inside the box without changing its proportions", (_n, nat) => {
    const f = fitSize(box, nat);
    expect(f.w).toBeLessThanOrEqual(box.w + 1e-9);
    expect(f.h).toBeLessThanOrEqual(box.h + 1e-9);
    expect(f.w / f.h).toBeCloseTo(nat.w / nat.h, 6);
    // touches the box on at least one axis: as large as it can be while still whole
    expect(Math.max(f.w / box.w, f.h / box.h)).toBeCloseTo(1, 6);
  });
  it("returns nothing to draw until both sizes are known", () => {
    expect(fitSize({ w: 0, h: 0 }, portrait)).toEqual({ w: 0, h: 0 });
    expect(fitSize(box, { w: 0, h: 0 })).toEqual({ w: 0, h: 0 });
  });
});

describe("fitted view", () => {
  it.each([portrait, tall, landscape])("is centred, whole and at zoom 1", (nat) => {
    const fit = fitSize(box, nat);
    const t = translateFor(FIT_VIEW, box, fit);
    expect(t.x).toBeCloseTo((box.w - fit.w) / 2, 6);
    expect(t.y).toBeCloseTo((box.h - fit.h) / 2, 6);
    expect(isFit(FIT_VIEW)).toBe(true);
  });
});

describe("zoom limits", () => {
  it("clamps to the minimum and maximum, and survives nonsense", () => {
    expect(clampZoom(0.2)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(Number.NaN)).toBe(MIN_ZOOM);
  });
  it("cannot be zoomed past the maximum or below fit", () => {
    const fit = fitSize(box, portrait);
    const huge = zoomAbout(FIT_VIEW, 1000, centreOf(box), box, fit);
    expect(huge.k).toBe(MAX_ZOOM);
    const tiny = zoomAbout(huge, 0.001, centreOf(box), box, fit);
    expect(tiny.k).toBe(MIN_ZOOM);
    expect(isFit(tiny)).toBe(true);
  });
});

describe("zooming keeps the point you are looking at", () => {
  it.each([portrait, tall, landscape])("zooming about a point leaves the page point under it unchanged", (nat) => {
    const fit = fitSize(box, nat);
    const p = centreOf(box); // on the page for every shape; at zoom 4 every shape overflows the box on both axes
    const before = anchorAt(FIT_VIEW, p, box, fit);
    const after = anchorAt(zoomAbout(FIT_VIEW, 4, p, box, fit), p, box, fit);
    expect(after.ix).toBeCloseTo(before.ix, 6);
    expect(after.iy).toBeCloseTo(before.iy, 6);
  });

  it("zooming about a point near an edge never shows empty space beyond the page", () => {
    const fit = fitSize(box, portrait);
    const z = zoomAbout(FIT_VIEW, 4, { x: 10, y: 10 }, box, fit);
    const t = translateFor(z, box, fit);
    expect(t.x).toBeLessThanOrEqual(1e-6);
    expect(t.y).toBeLessThanOrEqual(1e-6);
  });

  it("when the zoomed image is still smaller than the box on an axis, it stays centred on that axis", () => {
    const fit = fitSize(box, landscape); // 400 × 225
    const z = zoomAbout(FIT_VIEW, 2, centreOf(box), box, fit); // 800 × 450: wider than the box, shorter than it
    const t = translateFor(z, box, fit);
    expect(t.y).toBeCloseTo((box.h - 450) / 2, 6);
  });
});

describe("every part of the image stays reachable, and nothing else", () => {
  it.each([portrait, tall, landscape])("panning to each extreme brings every edge into view without empty space", (nat) => {
    const fit = fitSize(box, nat);
    const z = zoomAbout(FIT_VIEW, 4, centreOf(box), box, fit);
    const W = fit.w * z.k;
    const H = fit.h * z.k;

    for (const [dx, dy] of [
      [1e6, 1e6],
      [-1e6, -1e6],
      [1e6, -1e6],
      [-1e6, 1e6],
    ] as const) {
      const t = translateFor(panBy(z, dx, dy, box, fit), box, fit);
      // never any gap between the image and the box on an axis the image overflows
      if (W > box.w) {
        expect(t.x).toBeLessThanOrEqual(1e-6);
        expect(t.x + W).toBeGreaterThanOrEqual(box.w - 1e-6);
      } else expect(t.x).toBeCloseTo((box.w - W) / 2, 6);
      if (H > box.h) {
        expect(t.y).toBeLessThanOrEqual(1e-6);
        expect(t.y + H).toBeGreaterThanOrEqual(box.h - 1e-6);
      } else expect(t.y).toBeCloseTo((box.h - H) / 2, 6);
    }
  });

  it("a tall page can be read top to bottom: the bottom edge reaches the bottom of the box", () => {
    const fit = fitSize(box, tall); // 120 × 600 — narrow
    const z = zoomAbout(FIT_VIEW, 6, centreOf(box), box, fit); // 720 × 3600
    const top = translateFor(panBy(z, 0, 1e9, box, fit), box, fit);
    const bottom = translateFor(panBy(z, 0, -1e9, box, fit), box, fit);
    expect(top.y).toBeCloseTo(0, 6);
    expect(bottom.y).toBeCloseTo(box.h - fit.h * 6, 6);
  });

  it("panning when fitted does nothing (there is nowhere to go)", () => {
    const fit = fitSize(box, portrait);
    const t0 = translateFor(FIT_VIEW, box, fit);
    const t1 = translateFor(panBy(FIT_VIEW, 300, -300, box, fit), box, fit);
    expect(t1).toEqual(t0);
  });
});

describe("resizing and rotating", () => {
  // The view stores which part of the page is at the centre; sizes are applied (and clamped) whenever it is read.
  it("keeps the same zoom, and every overflowing edge stays reachable with no empty gap, at any new size", () => {
    const fit = fitSize(box, portrait);
    const z = panBy(zoomAbout(FIT_VIEW, 4, centreOf(box), box, fit), -150, -200, box, fit);
    for (const rotated of [
      { w: 600, h: 400 },
      { w: 900, h: 500 },
      { w: 320, h: 480 },
    ]) {
      const fit2 = fitSize(rotated, portrait);
      const t = translateFor(z, rotated, fit2);
      const W = fit2.w * z.k;
      const H = fit2.h * z.k;
      if (W > rotated.w) {
        expect(t.x).toBeLessThanOrEqual(1e-6);
        expect(t.x + W).toBeGreaterThanOrEqual(rotated.w - 1e-6);
      } else expect(t.x).toBeCloseTo((rotated.w - W) / 2, 6);
      if (H > rotated.h) {
        expect(t.y).toBeLessThanOrEqual(1e-6);
        expect(t.y + H).toBeGreaterThanOrEqual(rotated.h - 1e-6);
      } else expect(t.y).toBeCloseTo((rotated.h - H) / 2, 6);
    }
  });

  it("rotating to a shape where the page is smaller than the viewer and back returns to exactly the same view", () => {
    const fit = fitSize(box, portrait);
    const z = panBy(zoomAbout(FIT_VIEW, 3, centreOf(box), box, fit), -80, -120, box, fit);
    const wide = { w: 600, h: 400 }; // here the zoomed page is narrower than the viewer, so it is centred
    translateFor(z, wide, fitSize(wide, portrait));
    const back = translateFor(z, box, fit);
    expect(back.x).toBeCloseTo(translateFor(z, box, fit).x, 6);
    expect(z.u).not.toBeCloseTo(0.5, 2); // the stored view was not overwritten by the clamped one
  });

  it("round-trips a translation through a view", () => {
    const fit = fitSize(box, landscape); // 400 × 225
    const v = viewFromTranslate(4, -120, -200, box, fit); // 1600 × 900: both axes overflow
    const t = translateFor(v, box, fit);
    expect(t.x).toBeCloseTo(-120, 6);
    expect(t.y).toBeCloseTo(-200, 6);
  });
});

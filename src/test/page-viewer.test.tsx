import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PageViewer } from "@/components/reading/PageViewer";
import { PassageView } from "@/components/reading/PassageView";

// jsdom has no layout: give the viewer a 400 × 600 box and let the image report a portrait size.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 400 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 600 });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
});

const loaded = (container: HTMLElement, w = 1170, h = 2532) => {
  const img = container.querySelector("img")!;
  Object.defineProperty(img, "naturalWidth", { configurable: true, value: w });
  Object.defineProperty(img, "naturalHeight", { configurable: true, value: h });
  fireEvent.load(img);
  return img;
};
const scaleOf = (img: HTMLElement) => Number(/scale\(([\d.]+)\)/.exec(img.style.transform)![1]);
const translateOf = (img: HTMLElement) => {
  const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(img.style.transform)!;
  return { x: Number(m[1]), y: Number(m[2]) };
};
const ptr = (el: Element, type: string, id: number, x: number, y: number, pointerType = "touch") => {
  const ev = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperty(ev, "pointerId", { value: id });
  Object.defineProperty(ev, "pointerType", { value: pointerType });
  fireEvent(el, ev);
};
const viewer = () => screen.getByRole("group", { name: "Page 1 of 2" });
const btn = (name: string) => screen.getByRole("button", { name });

let img: HTMLImageElement;
let box: HTMLElement;
beforeEach(() => {
  const r = render(<PageViewer src="blob:x" alt="Page 1 of 2" />);
  img = loaded(r.container);
  box = viewer();
});

describe("PageViewer controls", () => {
  it("starts fitted, with every control labelled and the unusable ones marked disabled but still focusable", () => {
    expect(scaleOf(img)).toBe(1);
    expect(btn("Zoom in").getAttribute("aria-disabled")).toBe("false");
    expect(btn("Zoom out").getAttribute("aria-disabled")).toBe("true");
    expect(btn("Fit page").getAttribute("aria-disabled")).toBe("true");
    for (const n of ["Zoom in", "Zoom out", "Fit page"]) expect(btn(n).hasAttribute("disabled")).toBe(false); // focus is never lost
    expect(screen.getByRole("toolbar", { name: "Zoom the page image" })).toBeTruthy();
  });

  it("keeps the controls outside the transformed layer", () => {
    expect(box.contains(btn("Zoom in"))).toBe(false);
    expect(box.contains(img)).toBe(true);
    fireEvent.click(btn("Zoom in"));
    expect(scaleOf(img)).toBeGreaterThan(1);
    // the toolbar is not a descendant of anything that carries the transform
    expect(btn("Zoom in").closest("[style*='transform']")).toBeNull();
  });

  it("Zoom in / Zoom out / Fit page change only the image's scale, and Fit restores the whole page", () => {
    fireEvent.click(btn("Zoom in"));
    fireEvent.click(btn("Zoom in"));
    const k = scaleOf(img);
    expect(k).toBeCloseTo(2.25, 5);
    expect(btn("Fit page").getAttribute("aria-disabled")).toBe("false");
    fireEvent.click(btn("Zoom out"));
    expect(scaleOf(img)).toBeCloseTo(1.5, 5);
    fireEvent.click(btn("Fit page"));
    expect(scaleOf(img)).toBe(1);
    expect(btn("Fit page").getAttribute("aria-disabled")).toBe("true");
  });

  it("does not zoom past the maximum, and says so by disabling Zoom in", () => {
    for (let i = 0; i < 20; i++) fireEvent.click(btn("Zoom in"));
    expect(scaleOf(img)).toBe(6);
    expect(btn("Zoom in").getAttribute("aria-disabled")).toBe("true");
  });

  it("announces discrete changes politely", () => {
    fireEvent.click(btn("Zoom in"));
    expect(screen.getByRole("status").textContent).toBe("Zoom 150 percent");
    fireEvent.click(btn("Fit page"));
    expect(screen.getByRole("status").textContent).toBe("Page fitted to the viewer");
  });

  it("never changes the image's own proportions: width and height stay at the fitted ratio at every zoom", () => {
    const ratio = parseFloat(img.style.width) / parseFloat(img.style.height);
    expect(ratio).toBeCloseTo(1170 / 2532, 4);
    fireEvent.click(btn("Zoom in"));
    expect(parseFloat(img.style.width) / parseFloat(img.style.height)).toBeCloseTo(ratio, 6); // scaling is by transform only
    expect(img.style.maxWidth).toBe("none");
  });
});

describe("PageViewer keyboard", () => {
  it("the viewer is focusable and described", () => {
    expect(box.getAttribute("tabindex")).toBe("0");
    expect(box.getAttribute("aria-describedby")).toBeTruthy();
    expect(document.getElementById(box.getAttribute("aria-describedby")!)!.textContent).toMatch(/arrow keys/);
  });

  it("+ and − zoom, 0 fits", () => {
    fireEvent.keyDown(box, { key: "+" });
    expect(scaleOf(img)).toBeCloseTo(1.5, 5);
    fireEvent.keyDown(box, { key: "=" });
    expect(scaleOf(img)).toBeCloseTo(2.25, 5);
    fireEvent.keyDown(box, { key: "-" });
    expect(scaleOf(img)).toBeCloseTo(1.5, 5);
    fireEvent.keyDown(box, { key: "0" });
    expect(scaleOf(img)).toBe(1);
  });

  it("arrow keys move the zoomed page without dragging, and keep scrolling the page when fitted", () => {
    // fitted: not handled, so the browser may scroll the page
    expect(fireEvent.keyDown(box, { key: "ArrowDown" })).toBe(true);
    fireEvent.keyDown(box, { key: "+" });
    fireEvent.keyDown(box, { key: "+" });
    const before = translateOf(img);
    expect(fireEvent.keyDown(box, { key: "ArrowDown" })).toBe(false); // handled: default (page scroll) prevented
    expect(translateOf(img).y).toBeLessThan(before.y);
    const afterDown = translateOf(img);
    fireEvent.keyDown(box, { key: "ArrowRight" });
    expect(translateOf(img).x).toBeLessThan(afterDown.x);
    fireEvent.keyDown(box, { key: "ArrowUp" });
    fireEvent.keyDown(box, { key: "ArrowUp" });
    fireEvent.keyDown(box, { key: "ArrowUp" });
    expect(translateOf(img).y).toBeLessThanOrEqual(0); // clamped: never an empty gap above the page
  });

  it("leaves the browser's own zoom shortcuts alone", () => {
    expect(fireEvent.keyDown(box, { key: "+", ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(box, { key: "-", metaKey: true })).toBe(true);
    expect(fireEvent.keyDown(box, { key: "0", ctrlKey: true })).toBe(true);
    expect(scaleOf(img)).toBe(1);
  });
});

describe("PageViewer gestures", () => {
  it("one-finger drag does nothing while fitted (so the page can scroll), and pans once zoomed", () => {
    expect(box.style.touchAction).toBe("pan-y");
    ptr(box, "pointerdown", 1, 200, 300);
    ptr(box, "pointermove", 1, 100, 200);
    ptr(box, "pointerup", 1, 100, 200);
    expect(scaleOf(img)).toBe(1);
    fireEvent.click(btn("Zoom in"));
    fireEvent.click(btn("Zoom in"));
    expect(box.style.touchAction).toBe("none"); // the viewer now owns one-finger drags
    const before = translateOf(img);
    ptr(box, "pointerdown", 1, 200, 300);
    ptr(box, "pointermove", 1, 150, 240);
    ptr(box, "pointerup", 1, 150, 240);
    const after = translateOf(img);
    expect(after.x).toBeLessThan(before.x);
    expect(after.y).toBeLessThan(before.y);
    expect(scaleOf(img)).toBeCloseTo(2.25, 5);
  });

  it("mouse dragging pans a zoomed page; only the main button", () => {
    fireEvent.click(btn("Zoom in"));
    fireEvent.click(btn("Zoom in"));
    const before = translateOf(img);
    const right = new MouseEvent("pointerdown", { bubbles: true, clientX: 200, clientY: 300, button: 2 });
    Object.defineProperty(right, "pointerId", { value: 9 });
    Object.defineProperty(right, "pointerType", { value: "mouse" });
    fireEvent(box, right);
    ptr(box, "pointermove", 9, 100, 300, "mouse");
    expect(translateOf(img)).toEqual(before);
    ptr(box, "pointerdown", 1, 200, 300, "mouse");
    ptr(box, "pointermove", 1, 120, 300, "mouse");
    ptr(box, "pointerup", 1, 120, 300, "mouse");
    expect(translateOf(img).x).toBeLessThan(before.x);
  });

  it("pinch with two fingers zooms (and spreading fingers apart enlarges, bringing them together shrinks)", () => {
    ptr(box, "pointerdown", 1, 150, 300);
    ptr(box, "pointerdown", 2, 250, 300);
    ptr(box, "pointermove", 2, 350, 300); // distance 100 → 200
    expect(scaleOf(img)).toBeCloseTo(2, 5);
    ptr(box, "pointermove", 2, 200, 300); // distance 200 → 50
    expect(scaleOf(img)).toBe(1); // never below fit
    ptr(box, "pointerup", 2, 200, 300);
    ptr(box, "pointerup", 1, 150, 300);
  });

  it("a pinch cannot exceed the maximum zoom", () => {
    ptr(box, "pointerdown", 1, 190, 300);
    ptr(box, "pointerdown", 2, 210, 300);
    ptr(box, "pointermove", 2, 1000, 300);
    expect(scaleOf(img)).toBe(6);
  });

  it("Ctrl/⌘ + wheel zooms the image and stops the browser zooming the page; plain wheel is left to scroll the page", () => {
    expect(fireEvent.wheel(box, { deltaY: 100 })).toBe(true); // not cancelled → page scrolls normally
    expect(scaleOf(img)).toBe(1);
    expect(fireEvent.wheel(box, { deltaY: -50, ctrlKey: true, clientX: 200, clientY: 300 })).toBe(false);
    expect(scaleOf(img)).toBeGreaterThan(1);
    expect(fireEvent.wheel(box, { deltaY: -50, metaKey: true })).toBe(false);
  });

  it("double-click zooms in and a second double-click fits", () => {
    fireEvent.doubleClick(box, { clientX: 200, clientY: 300 });
    expect(scaleOf(img)).toBeCloseTo(2.5, 5);
    fireEvent.doubleClick(box);
    expect(scaleOf(img)).toBe(1);
  });

  it("a gesture that ends leaves nothing pending", () => {
    ptr(box, "pointerdown", 1, 150, 300);
    ptr(box, "pointerdown", 2, 250, 300);
    ptr(box, "pointercancel", 2, 250, 300);
    ptr(box, "pointercancel", 1, 150, 300);
    ptr(box, "pointermove", 1, 400, 300); // unknown pointer now: ignored
    expect(scaleOf(img)).toBe(1);
  });
});

describe("PageViewer layout safety", () => {
  it("clips its contents and positions the image absolutely, so zooming cannot widen the document", () => {
    expect(box.className).toContain("overflow-hidden");
    expect(img.style.position).toBe("absolute");
    for (let i = 0; i < 6; i++) fireEvent.click(btn("Zoom in"));
    expect(box.className).toContain("overflow-hidden");
  });
});

describe("pages in PassageView", () => {
  const images = [
    { id: "a", url: "blob:a", name: "a.png" },
    { id: "b", url: "blob:b", name: "b.png" },
  ];
  it("each newly selected page starts fitted, and the counter stays on one line", () => {
    const { container } = render(<PassageView images={images} />);
    const first = loaded(container);
    fireEvent.click(within(container).getAllByRole("button", { name: "Zoom in" })[0]!);
    fireEvent.click(within(container).getAllByRole("button", { name: "Zoom in" })[0]!);
    expect(scaleOf(first)).toBeCloseTo(2.25, 5);

    act(() => void fireEvent.click(within(container).getByRole("button", { name: "Next page" })));
    const second = loaded(container);
    expect(scaleOf(second)).toBe(1);
    expect(translateOf(second).x).toBeGreaterThanOrEqual(0); // centred, not inheriting the previous pan
    const counter = within(container).getByText("Page 2 of 2");
    expect(counter.className).toContain("whitespace-nowrap");
  });

  it("page navigation sits outside the viewer", () => {
    const { container } = render(<PassageView images={images} />);
    const group = within(container).getByRole("group", { name: "Page 1 of 2" });
    expect(group.contains(within(container).getByRole("button", { name: "Next page" }))).toBe(false);
  });
});

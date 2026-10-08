import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Companion } from "@/components/reading/Companion";

const realMatchMedia = window.matchMedia;
const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = ((q: string) => ({ ...realMatchMedia(q), matches: reduce && q.includes("reduce") })) as typeof window.matchMedia;
};

const animationEnd = (el: Element, animationName: string) => {
  const ev = new Event("animationend", { bubbles: true });
  Object.defineProperty(ev, "animationName", { value: animationName });
  fireEvent(el, ev);
};
const hello = () => screen.getByRole("button", { name: "Say hello to your buddy" });
const hover = (el: HTMLElement, pointerType: string) => {
  const ev = new MouseEvent("pointerover", { bubbles: true });
  Object.defineProperty(ev, "pointerType", { value: pointerType });
  const enter = new MouseEvent("pointerenter", { bubbles: false });
  Object.defineProperty(enter, "pointerType", { value: pointerType });
  fireEvent(el, ev);
  fireEvent(el, enter);
};

beforeEach(() => {
  vi.useFakeTimers();
  setReducedMotion(false);
});
afterEach(() => {
  vi.useRealTimers();
  window.matchMedia = realMatchMedia;
});

describe("interactive companion", () => {
  it("is a native button with a concise name; the drawing inside stays hidden from assistive tech", () => {
    render(<Companion pose="wave" interactive />);
    const b = hello();
    expect(b.tagName).toBe("BUTTON");
    expect(b.getAttribute("type")).toBe("button");
    const svg = b.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("focusable")).toBe("false");
    expect(b.textContent).toBe(""); // no visible or hidden explanatory text
  });

  it("is not a button at all when not interactive (reading, recording, playback)", () => {
    const { container } = render(<Companion pose="listen" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("a click gives one wiggle that clears itself when the animation ends", () => {
    render(<Companion pose="peek" interactive />);
    fireEvent.click(hello());
    expect(hello().getAttribute("data-reacting")).toBe("wiggle");
    animationEnd(hello().querySelector("svg")!, "companion-wiggle");
    expect(hello().hasAttribute("data-reacting")).toBe(false);
  });

  it("input during a reaction is dropped, not queued", () => {
    render(<Companion pose="celebrate" interactive />);
    fireEvent.click(hello());
    fireEvent.click(hello());
    fireEvent.click(hello());
    hover(hello(), "mouse");
    expect(hello().getAttribute("data-reacting")).toBe("wiggle"); // the first one, unchanged
    animationEnd(hello().querySelector("svg")!, "companion-wiggle");
    expect(hello().hasAttribute("data-reacting")).toBe(false);
    act(() => void vi.advanceTimersByTime(5000));
    expect(hello().hasAttribute("data-reacting")).toBe(false); // nothing was waiting behind it
  });

  it("clears itself even if the browser never reports the animation ending", () => {
    render(<Companion pose="wave" interactive />);
    fireEvent.click(hello());
    expect(hello().hasAttribute("data-reacting")).toBe(true);
    act(() => void vi.advanceTimersByTime(1700));
    expect(hello().hasAttribute("data-reacting")).toBe(false);
    fireEvent.click(hello());
    expect(hello().getAttribute("data-reacting")).toBe("wiggle"); // usable again
  });

  it("a mouse hover waves; a touch 'hover' does not (so touching while scrolling never sets it off)", () => {
    render(<Companion pose="wave" interactive />);
    hover(hello(), "touch");
    expect(hello().hasAttribute("data-reacting")).toBe(false);
    hover(hello(), "pen");
    expect(hello().hasAttribute("data-reacting")).toBe(false);
    hover(hello(), "mouse");
    expect(hello().getAttribute("data-reacting")).toBe("wave");
  });

  it("does nothing at all for reduced-motion users", () => {
    setReducedMotion(true);
    render(<Companion pose="wave" interactive animate />);
    fireEvent.click(hello());
    hover(hello(), "mouse");
    expect(hello().hasAttribute("data-reacting")).toBe(false);
  });

  it("ignores input while the arrival wave plays, then responds", () => {
    render(<Companion pose="wave" interactive animate />);
    fireEvent.click(hello());
    expect(hello().hasAttribute("data-reacting")).toBe(false);
    act(() => void vi.advanceTimersByTime(2900));
    fireEvent.click(hello());
    expect(hello().getAttribute("data-reacting")).toBe("wiggle");
  });

  it("the arrival wave ending does not cancel a reaction that has started", () => {
    render(<Companion pose="wave" interactive animate />);
    act(() => void vi.advanceTimersByTime(2900));
    fireEvent.click(hello());
    animationEnd(hello().querySelector("svg")!, "companion-wave");
    expect(hello().getAttribute("data-reacting")).toBe("wiggle");
  });
});

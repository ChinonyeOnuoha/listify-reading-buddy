import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { shouldOfferUpdate, usePwa } from "@/lib/pwa";

type Pwa = ReturnType<typeof usePwa>;
function Probe({ onState }: { onState: (s: Pwa) => void }) {
  onState(usePwa());
  return null;
}
const renderPwa = () => {
  let last: Pwa | null = null;
  render(<Probe onState={(s) => (last = s)} />);
  return () => last!;
};
const setUA = (ua: string, platform = "iPhone", touch = 5) => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
  vi.spyOn(navigator, "platform", "get").mockReturnValue(platform);
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: touch });
};
const setStandalone = (on: boolean) =>
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (q: string) => ({ matches: on && q.includes("standalone"), media: q, addEventListener: () => {}, removeEventListener: () => {} }),
  });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setStandalone(false);
});

describe("usePwa", () => {
  it("detects iPhone Safari so Share → Add to Home Screen can be shown", () => {
    setStandalone(false);
    setUA("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1");
    const get = renderPwa();
    expect(get().ios).toBe(true);
    expect(get().standalone).toBe(false);
  });

  it("detects iPadOS that reports itself as a Mac", () => {
    setStandalone(false);
    setUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15", "MacIntel", 5);
    expect(renderPwa()().ios).toBe(true);
  });

  it("does not treat a desktop Mac as iOS", () => {
    setStandalone(false);
    setUA("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/141.0 Safari/537.36", "MacIntel", 0);
    expect(renderPwa()().ios).toBe(false);
  });

  it("knows when it's already installed (standalone), so install prompts can be hidden", () => {
    setStandalone(true);
    setUA("Mozilla/5.0 (Linux; Android 15) Chrome/141.0 Mobile Safari/537.36", "Linux armv8l", 5);
    expect(renderPwa()().standalone).toBe(true);
  });

  it("offers install only after the browser's beforeinstallprompt, and hides it once installed", async () => {
    setStandalone(false);
    setUA("Mozilla/5.0 (Linux; Android 15) Chrome/141.0 Mobile Safari/537.36", "Linux armv8l", 5);
    const get = renderPwa();
    expect(get().canInstall).toBe(false);
    const ev = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: vi.fn(async () => {}),
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    await act(async () => {
      window.dispatchEvent(ev);
    });
    expect(ev.defaultPrevented).toBe(true);
    expect(get().canInstall).toBe(true);
    await act(async () => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(get().canInstall).toBe(false);
    expect(get().standalone).toBe(true);
  });
});

describe("shouldOfferUpdate — an update is never offered where reloading could lose work", () => {
  const ready = { updateReady: true, sample: false, hasSession: false, view: "prepare" as const };
  it("is offered on the welcome screens when there is no session", () => {
    expect(shouldOfferUpdate(ready)).toBe(true);
    expect(shouldOfferUpdate({ ...ready, view: "home" })).toBe(true);
  });
  it("is not offered when no new version is waiting", () => {
    expect(shouldOfferUpdate({ ...ready, updateReady: false })).toBe(false);
  });
  it("is not offered while any session exists (target, content or recording)", () => {
    expect(shouldOfferUpdate({ ...ready, hasSession: true })).toBe(false);
    expect(shouldOfferUpdate({ ...ready, hasSession: true, view: "home" })).toBe(false);
  });
  it("is not offered while reading, reviewing or looking at sample feedback — even with no session flag", () => {
    for (const view of ["read", "review", "samples"] as const) expect(shouldOfferUpdate({ ...ready, view })).toBe(false);
  });
  it("is not offered inside the sample walkthrough", () => {
    expect(shouldOfferUpdate({ ...ready, sample: true })).toBe(false);
  });
});

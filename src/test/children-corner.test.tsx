import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { Route as RootRoute } from "@/routes/__root";

// A controllable recorder: same shape as the real hook, no microphone. Each caller (the main session, the children's
// corner) gets its own instance, exactly like the real thing.
vi.mock("@/components/reading/useRecorder", async () => {
  const { useRef, useState } = await import("react");
  return {
    formatTime: (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
    useRecorder: (onComplete: () => void) => {
      const [state, setState] = useState<"idle" | "recording" | "paused">("idle");
      const [take, setTake] = useState<{ url: string; duration: number; source: "recording" } | null>(null);
      const done = useRef(onComplete);
      done.current = onComplete;
      const made = () => setTake({ url: "blob:take", duration: 12, source: "recording" });
      return {
        state,
        recording: state === "recording",
        unfinished: state !== "idle",
        micError: false,
        problem: null,
        elapsed: 3,
        take,
        start: async () => setState("recording"),
        pause: async () => setState("paused"),
        resume: async () => setState("recording"),
        previewSoFar: async () => "blob:preview",
        finish: async () => {
          made();
          setState("idle");
          done.current();
          return true;
        },
        finishQuietly: async () => {
          made();
          setState("idle");
          return true;
        },
        upload: () => {},
        clear: () => setTake(null),
        discard: () => {
          setTake(null);
          setState("idle");
        },
      };
    },
  };
});

const Passthrough = ({ children }: { children: ReactNode }) => <>{children}</>;
RootRoute.update({ shellComponent: Passthrough } as unknown as Parameters<typeof RootRoute.update>[0]);

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLMediaElement.prototype.play = vi.fn(async () => {});
});

function renderApp() {
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

const getUserMedia = vi.fn();
beforeEach(() => {
  getUserMedia.mockReset();
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  window.history.replaceState(null, "");
});
afterEach(() => cleanup());

const btn = (name: string | RegExp) => screen.getByRole("button", { name });
const click = (name: string | RegExp) => fireEvent.click(btn(name));
const enter = async () => {
  await screen.findByRole("heading", { name: /read aloud/i });
  click(/step inside/i);
  await screen.findByRole("heading", { name: /where shall we go today/i });
};
const openStory = async (title: RegExp) => {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(title.source, "i") }));
  click(/read this story/i);
  await screen.findAllByRole("button", { name: /start recording/i }); // the phone dock and the desktop card both render here
};
const dock = () => screen.getAllByRole("region", { name: /recording controls/i })[0]!;

describe("welcome screen doorway", () => {
  it("adds a quiet invitation without disturbing the target, the sample link or the welcome copy", async () => {
    renderApp();
    await screen.findByRole("heading", { name: /read aloud/i });
    expect(screen.getByRole("heading", { name: "A doorway to stories" })).toBeTruthy();
    expect(screen.getByText("A reading corner for children")).toBeTruthy();
    expect(btn(/step inside/i).textContent).toMatch(/Step inside/);
    // existing welcome content is intact
    expect(screen.getByRole("heading", { name: "What shall we read aloud together today?" })).toBeTruthy();
    expect(screen.getByText("Today's reading target")).toBeTruthy();
    expect(btn("Try a sample session")).toBeTruthy();
    // and nothing from the mock-ups that was asked to be left out
    expect(screen.queryByRole("button", { name: /start reading/i })).toBeNull();
    expect(screen.queryByText(/for younger readers/i)).toBeNull();
    // the picture is decorative
    expect(document.querySelector('img[src="/illustrations/doorway.png"]')!.getAttribute("alt")).toBe("");
  });

  it("entering needs no adult reading target", async () => {
    renderApp();
    await enter();
    expect(screen.queryByText(/reading target/i)).toBeNull();
    expect(screen.queryByText(/\bmin\b/)).toBeNull();
  });
});

describe("choosing a story", () => {
  it("shows the collection with lengths, honest filters and no search", async () => {
    renderApp();
    await enter();
    expect(screen.getByRole("tab", { name: "Pick a story", selected: true })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Bring your own" })).toBeTruthy();
    expect(screen.getAllByRole("button", { pressed: false }).filter((b) => /words/.test(b.textContent ?? ""))).toHaveLength(8);
    expect(screen.queryByRole("searchbox")).toBeNull();

    fireEvent.click(btn("Folktales"));
    expect(screen.getAllByRole("button").filter((b) => /words/.test(b.textContent ?? ""))).toHaveLength(4);
    fireEvent.click(btn("Real world"));
    expect(screen.getAllByRole("button").filter((b) => /words/.test(b.textContent ?? ""))).toHaveLength(4);
    fireEvent.click(btn("All"));
    expect(screen.getAllByRole("button").filter((b) => /words/.test(b.textContent ?? ""))).toHaveLength(8);
  });

  it("selecting a story previews it with attribution and does not start anything", async () => {
    renderApp();
    await enter();
    fireEvent.click(screen.getByRole("button", { name: /Lazy Anansi/ }));
    const preview = (await screen.findByRole("heading", { name: "Lazy Anansi", level: 2 })).closest("section")!;
    expect(within(preview).getByText(/Why spiders have long, thin legs/)).toBeTruthy();
    expect(within(preview).getByText(/Illustrated by Wiehan de Jager/)).toBeTruthy();
    expect(within(preview).getByText(/CC BY 4\.0/)).toBeTruthy();
    expect(within(preview).getByRole("button", { name: /read this story/i })).toBeTruthy();
    expect(within(preview).getByRole("button", { name: "About this story" })).toBeTruthy();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /start recording/i })).toBeNull();
  });

  it("About this story shows credit, licence and source", async () => {
    renderApp();
    await enter();
    fireEvent.click(screen.getByRole("button", { name: /Kariza/ }));
    fireEvent.click(await screen.findByRole("button", { name: "About this story" }));
    const d = await screen.findByRole("dialog");
    expect(within(d).getByText("Jean de Dieu Bavugempore")).toBeTruthy();
    expect(within(d).getByText("Aloysie Uwizeyemariya")).toBeTruthy();
    expect(within(d).getByText("Rob Owen")).toBeTruthy();
    expect(within(d).getByRole("link", { name: /Creative Commons Attribution 4\.0/ }).getAttribute("href")).toBe(
      "https://creativecommons.org/licenses/by/4.0/",
    );
    expect(within(d).getByRole("link", { name: /African Storybook/ }).getAttribute("href")).toContain("africanstorybook.org/reader.php?id=22197");
    expect(within(d).getByText(/not endorsed by African Storybook/)).toBeTruthy();
  });

  it("Bring your own reuses paste and upload with child-friendly wording, and there is no timed target", async () => {
    renderApp();
    await enter();
    fireEvent.click(screen.getByRole("tab", { name: "Bring your own" }));
    expect(screen.getByRole("heading", { name: "Bring a story you love." })).toBeTruthy();
    expect(screen.getByText("Paste a passage or add photos of your pages.")).toBeTruthy();
    expect(btn(/Paste text/)).toBeTruthy();
    expect(btn(/Upload pages/)).toBeTruthy();
    fireEvent.click(btn(/Paste text/));
    const box = await screen.findByLabelText("Your passage");
    fireEvent.change(box, { target: { value: "A short passage I love to read." } });
    fireEvent.blur(box);
    click(/continue to reading/i);
    await screen.findAllByRole("button", { name: /start recording/i });
    expect(screen.getByText("A short passage I love to read.")).toBeTruthy();
    expect(dock().textContent).not.toMatch(/\bmin\b/); // no target, no countdown
  });
});

describe("reading and recording a built-in story", () => {
  it("shows the story, resizes only its text, and runs several pause/listen/resume cycles", async () => {
    renderApp();
    await enter();
    await openStory(/Lazy Anansi/);

    // illustrated, real text, one-line page counter, no target
    expect(await screen.findByText(/There was a spider called Anansi/)).toBeTruthy();
    expect(screen.getByText("Page 1 of 8").className).toContain("whitespace-nowrap");
    expect(document.querySelector('main img[src="/stories/lazy-anansi/p1.jpg"]')!.getAttribute("alt")).toBe("");
    expect(screen.queryByText(/of \d+ min target/)).toBeNull();

    // text size changes the story text, not the controls
    const para = screen.getByText(/There was a spider called Anansi/).closest("div")!;
    const before = para.style.fontSize;
    const controlsBefore = btn("Make the text larger").className;
    fireEvent.click(btn("Make the text larger"));
    expect(para.style.fontSize).not.toBe(before);
    expect(btn("Make the text larger").className).toBe(controlsBefore);
    for (let i = 0; i < 6; i++) fireEvent.click(btn("Make the text larger"));
    expect(btn("Make the text larger").getAttribute("aria-disabled")).toBe("true");
    expect(btn("Make the text smaller").getAttribute("aria-disabled")).toBe("false");

    // pages
    fireEvent.click(btn("Next page"));
    expect(screen.getByText("Page 2 of 8")).toBeTruthy();
    expect(await screen.findByText(/Rabbit's house/)).toBeTruthy();

    // start → (pause → listen so far → resume) × 2 → finish
    fireEvent.click(within(dock()).getByRole("button", { name: /start recording/i }));
    for (let cycle = 0; cycle < 2; cycle++) {
      await waitFor(() => expect(within(dock()).getByRole("status").textContent).toMatch(/Recording/));
      fireEvent.click(within(dock()).getByRole("button", { name: "Pause" }));
      await waitFor(() => expect(within(dock()).getByRole("status").textContent).toMatch(/Paused/));
      expect(within(dock()).getByRole("button", { name: /listen so far/i })).toBeTruthy();
      expect(within(dock()).getByRole("button", { name: /resume recording/i })).toBeTruthy();
      fireEvent.click(within(dock()).getByRole("button", { name: /resume recording/i }));
    }
    // changing page mid-recording doesn't touch the recording
    fireEvent.click(btn("Next page"));
    expect(within(dock()).getByRole("status").textContent).toMatch(/Recording/);
    fireEvent.click(within(dock()).getByRole("button", { name: /finish recording/i }));
    expect(await screen.findByRole("heading", { name: "You made time to read." })).toBeTruthy();
  });
});

describe("listening back", () => {
  async function toReview() {
    renderApp();
    await enter();
    await openStory(/Lazy Anansi/);
    fireEvent.click(within(dock()).getByRole("button", { name: /start recording/i }));
    fireEvent.click(await within(dock()).findByRole("button", { name: /finish recording/i }));
    await screen.findByRole("heading", { name: "You made time to read." });
  }

  it("offers playback without autoplay, optional reflection and the three next steps — with no scores or claims", async () => {
    await toReview();
    const audio = document.querySelector("audio")!;
    expect(audio.hasAttribute("controls")).toBe(true);
    expect(audio.hasAttribute("autoplay")).toBe(false);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();

    expect(screen.getByRole("heading", { name: "How did that feel?" })).toBeTruthy();
    const feelings = ["Comfortable", "A little tricky", "Not sure"].map((n) => btn(n));
    feelings.forEach((f) => expect(f.getAttribute("aria-pressed")).toBe("false"));
    fireEvent.click(feelings[1]!);
    expect(btn("A little tricky").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(btn("Not sure"));
    expect(btn("A little tricky").getAttribute("aria-pressed")).toBe("false"); // one at a time
    expect(btn("Not sure").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(btn("Not sure"));
    expect(btn("Not sure").getAttribute("aria-pressed")).toBe("false"); // and optional: it can be cleared

    expect(btn(/choose another story/i)).toBeTruthy();
    expect(btn("I’m done for now")).toBeTruthy();
    expect(btn(/record again/i)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/score|points|streak|badge|rank|pronunciation|improve|literacy|well done/i);
  });

  it("Record again asks before replacing the recording", async () => {
    await toReview();
    click(/record again/i);
    expect(screen.getByText("Record again? This replaces your current recording.")).toBeTruthy();
    click(/^Keep it$/i);
    expect(document.querySelector("audio")).not.toBeNull(); // nothing was replaced
    click(/record again/i);
    click(/yes, record again/i);
    expect((await screen.findAllByRole("button", { name: /start recording/i })).length).toBeGreaterThan(0);
  });

  it("choosing another story keeps the recording until you clearly choose to replace it", async () => {
    await toReview();
    click(/choose another story/i);
    await screen.findByRole("heading", { name: /where shall we go today/i });
    expect(screen.getByText(/Your recording of “Lazy Anansi” is saved for now/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /The Magic Mokoro/ }));
    click(/read this story/i);
    expect(screen.getByText(/Your recording of “Lazy Anansi” will be replaced/)).toBeTruthy();
    click(/keep my recording/i);
    expect(screen.getByText(/saved for now/)).toBeTruthy(); // still there
    // listening back still works from here
    click(/listen back/i);
    expect(await screen.findByRole("heading", { name: "You made time to read." })).toBeTruthy();

    // and replacing is possible, deliberately
    click(/choose another story/i);
    fireEvent.click(screen.getByRole("button", { name: /The Magic Mokoro/ }));
    click(/read this story/i);
    click(/replace and read/i);
    expect((await screen.findAllByRole("button", { name: /start recording/i })).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "The Magic Mokoro", level: 1 })).toBeTruthy();
  });
});

describe("adult and children's sessions stay separate", () => {
  async function adultWithTarget() {
    renderApp();
    await screen.findByRole("heading", { name: /read aloud/i });
    fireEvent.click(screen.getByRole("button", { name: "10 min" }));
    await screen.findByLabelText("Today's target");
  }

  it("entering, reading and leaving the corner leaves the main session as it was", async () => {
    await adultWithTarget();
    expect((screen.getByLabelText("Today's target") as HTMLInputElement).value).toBe("10");
    click(/step inside/i);
    await screen.findByRole("heading", { name: /where shall we go today/i });
    fireEvent.click(screen.getByRole("button", { name: /Lazy Anansi/ }));
    click(/read this story/i);
    await screen.findAllByRole("button", { name: /start recording/i });
    click("Reading Buddy home");
    await screen.findByLabelText("Today's target");
    expect((screen.getByLabelText("Today's target") as HTMLInputElement).value).toBe("10");
  });

  it("exiting inside the corner discards only the children's session", async () => {
    await adultWithTarget();
    click(/step inside/i);
    await screen.findByRole("heading", { name: /where shall we go today/i });
    fireEvent.click(screen.getByRole("button", { name: /Lazy Anansi/ }));
    click(/read this story/i);
    await screen.findAllByRole("button", { name: /start recording/i });

    click("Exit session");
    const d = await screen.findByRole("alertdialog");
    expect(within(d).getByText(/children’s corner will be cleared/)).toBeTruthy();
    expect(within(d).getByText("Your main Reading Buddy session isn’t affected.")).toBeTruthy();
    fireEvent.click(within(d).getByRole("button", { name: "Leave and discard" }));
    await screen.findByRole("heading", { name: /where shall we go today/i });
    expect(screen.queryByRole("button", { name: "Exit session" })).toBeNull(); // nothing left to exit

    click("Reading Buddy home");
    await screen.findByLabelText("Today's target");
    expect((screen.getByLabelText("Today's target") as HTMLInputElement).value).toBe("10"); // adult session survived
  });

  it("exiting the main session leaves the children's session alone, and says so", async () => {
    await adultWithTarget();
    click(/step inside/i);
    await screen.findByRole("heading", { name: /where shall we go today/i });
    fireEvent.click(screen.getByRole("button", { name: /Lazy Anansi/ }));
    click(/read this story/i);
    await screen.findAllByRole("button", { name: /start recording/i });
    fireEvent.click(within(dock()).getByRole("button", { name: /start recording/i }));
    fireEvent.click(await within(dock()).findByRole("button", { name: /finish recording/i }));
    await screen.findByRole("heading", { name: "You made time to read." });
    click("Reading Buddy home");
    await screen.findByLabelText("Today's target");

    click("Exit session");
    const d = await screen.findByRole("alertdialog");
    expect(within(d).getByText("Your children’s corner session isn’t affected.")).toBeTruthy();
    fireEvent.click(within(d).getByRole("button", { name: "Leave and discard" }));
    await screen.findByRole("button", { name: "10 min" }); // fresh adult welcome

    click(/step inside/i); // the children's session is still there, exactly where it was left
    expect(await screen.findByRole("heading", { name: "You made time to read." })).toBeTruthy();
  });

  it("cancelling the exit dialog changes nothing", async () => {
    await adultWithTarget();
    click(/step inside/i);
    await screen.findByRole("heading", { name: /where shall we go today/i });
    fireEvent.click(screen.getByRole("button", { name: /Lazy Anansi/ }));
    click(/read this story/i);
    await screen.findAllByRole("button", { name: /start recording/i });
    click("Exit session");
    fireEvent.click(await screen.findByRole("button", { name: "Stay in session" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByRole("heading", { name: "Lazy Anansi", level: 1 })).toBeTruthy();
  });
});

describe("leaving mid-recording and browser Back", () => {
  async function recordingInCorner() {
    renderApp();
    await enter();
    await openStory(/Lazy Anansi/);
    fireEvent.click(within(dock()).getByRole("button", { name: /start recording/i }));
    await within(dock()).findByRole("button", { name: /finish recording/i });
  }

  it("going home explains that the recording will be finished and kept, and cancelling changes nothing", async () => {
    await recordingInCorner();
    click("Reading Buddy home");
    const d = await screen.findByRole("alertdialog");
    expect(within(d).getByText(/will finish your recording and keep it/)).toBeTruthy();
    fireEvent.click(within(d).getByRole("button", { name: "Keep recording" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(within(dock()).getByRole("status").textContent).toMatch(/Recording/);
  });

  it("confirming finishes and keeps the recording; stepping back in opens it, never restarts recording", async () => {
    await recordingInCorner();
    click("Reading Buddy home");
    fireEvent.click(await screen.findByRole("button", { name: "Finish and go home" }));
    await screen.findByRole("heading", { name: /read aloud/i });
    click(/step inside/i);
    expect(await screen.findByRole("heading", { name: "You made time to read." })).toBeTruthy();
    expect(document.querySelector("audio")!.hasAttribute("autoplay")).toBe(false);
  });

  it("browser Back leaves the corner, preserves its session, and Forward returns to it", async () => {
    renderApp();
    await enter();
    fireEvent.click(screen.getByRole("button", { name: /Lazy Anansi/ }));
    click(/read this story/i);
    await screen.findAllByRole("button", { name: /start recording/i });
    expect(window.history.state).toEqual({ rb: "children" });

    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 30));
    });
    await screen.findByRole("heading", { name: /read aloud/i });
    await act(async () => {
      window.history.forward();
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(await screen.findByRole("heading", { name: "Lazy Anansi", level: 1 })).toBeTruthy();
  });

  it("browser Back mid-recording stays put and asks first", async () => {
    await recordingInCorner();
    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    expect(window.history.state).toEqual({ rb: "children" });
  });
});

describe("the main (adult) flow still works", () => {
  it("target → paste → continue → read shows the pasted passage and the timed target", async () => {
    renderApp();
    await screen.findByRole("heading", { name: /read aloud/i });
    fireEvent.click(screen.getByRole("button", { name: "5 min" }));
    fireEvent.click(await screen.findByRole("button", { name: /Paste text/ }));
    const box = await screen.findByLabelText("Your passage");
    fireEvent.change(box, { target: { value: "Maya found a tiny seed beside the garden gate." } });
    fireEvent.blur(box);
    click(/continue to reading/i);
    expect(await screen.findByText("Maya found a tiny seed beside the garden gate.")).toBeTruthy();
    expect(dock().textContent).toMatch(/\/ 5 min/);
    expect(screen.getByRole("button", { name: /edit passage/i })).toBeTruthy();
  });
});

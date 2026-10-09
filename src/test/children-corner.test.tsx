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
    formatTime: (s: number) =>
      `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
    useRecorder: (onComplete: () => void) => {
      const [state, setState] = useState<"idle" | "recording" | "paused">("idle");
      const [take, setTake] = useState<{
        url: string;
        duration: number;
        source: "recording";
      } | null>(null);
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
RootRoute.update({ shellComponent: Passthrough } as unknown as Parameters<
  typeof RootRoute.update
>[0]);

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
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
  it("is one control around the whole invitation, and leaves the target, sample link and welcome copy alone", async () => {
    renderApp();
    await screen.findByRole("heading", { name: /read aloud/i });
    const door = btn(/step inside/i);
    // one control: it contains the picture, the title and "Step inside", with nothing interactive nested inside
    expect(door.tagName).toBe("BUTTON");
    expect(door.textContent).toMatch(/A doorway to stories/);
    expect(door.textContent).toMatch(/A reading corner for children/);
    expect(door.textContent).toMatch(/Step inside/);
    expect(door.querySelectorAll("button, a, input, [tabindex]")).toHaveLength(0);
    expect(door.querySelector("svg[aria-hidden='true']")).not.toBeNull(); // the illustration is inside it, decorative
    expect(screen.getAllByRole("button", { name: /step inside/i })).toHaveLength(1); // one keyboard focus stop
    expect(screen.queryByRole("link", { name: /step inside/i })).toBeNull();
    // "Step inside" is quiet text: no pill, border, fill or permanent underline
    const label = within(door).getByText("Step inside");
    expect(label.className).not.toMatch(/btn-|border|bg-|underline|rounded-full/);
    // existing welcome content is intact
    expect(
      screen.getByRole("heading", { name: "What shall we read aloud together today?" }),
    ).toBeTruthy();
    expect(screen.getByText("Today's reading target")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Try a sample session" }).length).toBeGreaterThan(
      0,
    );
    // and nothing from the mock-ups that was asked to be left out
    expect(screen.queryByRole("button", { name: /start reading/i })).toBeNull();
    expect(screen.queryByText(/for younger readers/i)).toBeNull();
  });

  it("puts the sample link inside the target card (wide screens) and keeps a copy below the doorway (phones)", async () => {
    renderApp();
    await screen.findByRole("heading", { name: /read aloud/i });
    const card = screen.getByText("Today's reading target").closest("section")!;
    const inside = within(card).getByRole("button", { name: "Try a sample session" });
    expect(inside.closest("p")!.className).toContain("hidden"); // shown from the lg breakpoint up
    expect(inside.closest("p")!.className).toContain("lg:block");
    const all = screen.getAllByRole("button", { name: "Try a sample session" });
    expect(all).toHaveLength(2);
    const outside = all.find((b) => b !== inside)!;
    expect(outside.closest("p")!.className).toContain("lg:hidden"); // phones keep the earlier arrangement
    // the doorway sits below and outside the card
    expect(card.contains(btn(/step inside/i))).toBe(false);
  });

  it("clicking the title, the subtitle, the picture or Step inside all enter the corner, with no target", async () => {
    for (const part of ["title", "subtitle", "picture", "label"]) {
      renderApp();
      await screen.findByRole("heading", { name: /read aloud/i });
      const door = btn(/step inside/i);
      const target =
        part === "title"
          ? within(door).getByText("A doorway to stories")
          : part === "subtitle"
            ? within(door).getByText("A reading corner for children")
            : part === "picture"
              ? door.querySelector("svg")!
              : within(door).getByText("Step inside");
      fireEvent.click(target);
      await screen.findByRole("heading", { name: /where shall we go today/i });
      expect(screen.queryByText(/reading target/i)).toBeNull();
      cleanup();
      window.history.replaceState(null, "");
    }
  });

  it("entering from the keyboard works (a real button: Enter and Space activate it)", async () => {
    renderApp();
    await screen.findByRole("heading", { name: /read aloud/i });
    const door = btn(/step inside/i);
    door.focus();
    expect(document.activeElement).toBe(door);
    fireEvent.click(door); // a native <button> turns Enter/Space into this click
    await screen.findByRole("heading", { name: /where shall we go today/i });
  });

  it("entering needs no adult reading target and keeps an existing main session", async () => {
    renderApp();
    await screen.findByRole("heading", { name: /read aloud/i });
    fireEvent.click(screen.getByRole("button", { name: "10 min" }));
    await screen.findByLabelText("Today's target");
    click(/step inside/i);
    await screen.findByRole("heading", { name: /where shall we go today/i });
    click("Reading Buddy home");
    await screen.findByLabelText("Today's target");
    expect((screen.getByLabelText("Today's target") as HTMLInputElement).value).toBe("10");
  });
});

const cards = () =>
  screen
    .queryAllByRole("button", { name: /words$/ })
    .filter((b) => b.getAttribute("aria-haspopup") === "dialog");

describe("choosing a story", () => {
  it("shows the collection with lengths, honest filters and no search", async () => {
    renderApp();
    await enter();
    expect(screen.getByRole("tab", { name: "Pick a story", selected: true })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Bring your own" })).toBeTruthy();
    expect(cards()).toHaveLength(8);
    expect(screen.queryByRole("searchbox")).toBeNull();
    fireEvent.click(btn("Folktales"));
    expect(cards()).toHaveLength(4);
    fireEvent.click(btn("Real world"));
    expect(cards()).toHaveLength(4);
    fireEvent.click(btn("All"));
    expect(cards()).toHaveLength(8);
  });

  it("cards are equal height within a row and long titles wrap in full", async () => {
    renderApp();
    await enter();
    for (const card of cards()) {
      expect(card.className).toContain("h-full"); // fills its (stretched) grid cell
      expect(card.closest("li")!.className).toContain("flex");
      const title = card.querySelector(".display-serif")!;
      expect(title.className).not.toMatch(/truncate|line-clamp|text-ellipsis|overflow-hidden/); // never cut off
      const meta = within(card).getByText(/words$/);
      expect(meta.className).toContain("mt-auto"); // metadata pinned to the bottom so it lines up
    }
    // the grid adapts to larger text instead of squeezing: columns are sized in rem
    expect(document.querySelector("ul")!.className).toMatch(/minmax\(9\.5rem/);
  });

  it("selecting a story opens ONE modal with its cover, description, length and actions — not a preview below the grid", async () => {
    renderApp();
    await enter();
    fireEvent.click(screen.getByRole("button", { name: /Lazy Anansi/ }));
    const d = await screen.findByRole("dialog", { name: "Lazy Anansi" });
    expect(within(d).getByText(/Why spiders have long, thin legs/)).toBeTruthy();
    expect(within(d).getByText(/Short read · 406 words · 8 pages/)).toBeTruthy();
    expect(within(d).getByRole("button", { name: /read this story/i })).toBeTruthy();
    expect(within(d).getByRole("button", { name: "About this story" })).toBeTruthy();
    expect(within(d).getAllByRole("button", { name: "Close" })).toHaveLength(1); // exactly one close control
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    // the older inline preview section is gone
    expect(document.querySelector("section[aria-labelledby=preview-h]")).toBeNull();
    // nothing started, the microphone untouched, no audio playing
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /start recording/i })).toBeNull();
  });

  it("About this story shows credit, licence and source in the SAME modal, with a way back", async () => {
    renderApp();
    await enter();
    fireEvent.click(screen.getByRole("button", { name: /Kariza/ }));
    const d = await screen.findByRole("dialog", { name: /Kariza/ });
    fireEvent.click(within(d).getByRole("button", { name: "About this story" }));
    const about = await screen.findByRole("dialog", { name: "About this story" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1); // never stacked
    expect(within(about).getByText("Jean de Dieu Bavugempore")).toBeTruthy();
    expect(within(about).getByText("Aloysie Uwizeyemariya")).toBeTruthy();
    expect(within(about).getByText("Rob Owen")).toBeTruthy();
    expect(
      within(about)
        .getByRole("link", { name: /Creative Commons Attribution 4\.0/ })
        .getAttribute("href"),
    ).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(
      within(about)
        .getByRole("link", { name: /African Storybook/ })
        .getAttribute("href"),
    ).toContain("africanstorybook.org/reader.php?id=22197");
    expect(within(about).getByText(/not endorsed by African Storybook/)).toBeTruthy();
    expect(within(about).getAllByRole("button", { name: "Close" })).toHaveLength(1);
    fireEvent.click(within(about).getByRole("button", { name: /back to the story/i }));
    expect(await screen.findByRole("dialog", { name: /Kariza/ })).toBeTruthy();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("Escape closes the modal and focus returns to the same card; nothing else changes", async () => {
    renderApp();
    await enter();
    const card = screen.getByRole("button", { name: /The Magic Mokoro/ });
    card.focus();
    fireEvent.click(card);
    await screen.findByRole("dialog", { name: "The Magic Mokoro" });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(card));
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(cards()).toHaveLength(8); // the catalogue is exactly as it was
  });

  it("closing with the close control also returns to the card", async () => {
    renderApp();
    await enter();
    const card = screen.getByRole("button", { name: /Lazy Anansi/ });
    fireEvent.click(card);
    const d = await screen.findByRole("dialog");
    fireEvent.click(within(d).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(card));
  });

  it("opening a preview pauses any playing audio and closing never resumes it", async () => {
    renderApp();
    await enter();
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause");
    pause.mockClear();
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    play.mockClear();
    const stray = document.createElement("audio");
    document.body.appendChild(stray);
    fireEvent.click(screen.getByRole("button", { name: /Lazy Anansi/ }));
    await screen.findByRole("dialog");
    expect(pause).toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(play).not.toHaveBeenCalled();
    stray.remove();
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
    expect(
      document.querySelector('main img[src="/stories/lazy-anansi/p1.jpg"]')!.getAttribute("alt"),
    ).toBe("");
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
      await waitFor(() =>
        expect(within(dock()).getByRole("status").textContent).toMatch(/Recording/),
      );
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
  async function toReview(story: RegExp = /Lazy Anansi/) {
    renderApp();
    await enter();
    await openStory(story);
    fireEvent.click(within(dock()).getByRole("button", { name: /start recording/i }));
    fireEvent.click(await within(dock()).findByRole("button", { name: /finish recording/i }));
    await screen.findByRole("heading", { name: "You made time to read." });
  }
  // `hidden: true` because, correctly, the page behind an open modal is hidden from assistive technology.
  const feeling = (name: string) =>
    screen.getByRole("button", { name: new RegExp(name), hidden: true });

  it("offers playback without autoplay and the next steps — with no scores or claims", async () => {
    await toReview();
    const audio = document.querySelector("audio")!;
    expect(audio.hasAttribute("controls")).toBe(true);
    expect(audio.hasAttribute("autoplay")).toBe(false);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(btn(/choose another story/i)).toBeTruthy();
    expect(btn("I’m done for now")).toBeTruthy();
    expect(btn(/record again/i)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(
      /score|points|streak|badge|rank|pronunciation|improve|literacy|well done/i,
    );
  });

  it("asks 'How was reading?' with real emoji and visible labels; the emoji are hidden from assistive technology", async () => {
    await toReview();
    expect(screen.getByRole("heading", { name: "How was reading?" })).toBeTruthy();
    for (const [emoji, label] of [
      ["😊", "Easy"],
      ["🙂", "A bit hard"],
      ["🤔", "Not sure"],
    ] as const) {
      const b = feeling(label);
      expect(b.textContent).toContain(emoji);
      expect(b.textContent).toContain(label); // the visible text label stays
      expect(b.getAttribute("aria-pressed")).toBe("false");
      expect(within(b).getByText(emoji).getAttribute("aria-hidden")).toBe("true");
      expect(b.getAttribute("aria-haspopup")).toBe("dialog");
    }
    expect(screen.queryByText(/Comfortable|A little tricky|How did that feel/)).toBeNull(); // the older wording is gone
  });

  it.each([
    [
      "Easy",
      "😊",
      "Ready for another?",
      "Pick a story you’d like to read next.",
      "Choose a story",
      "Back to my recording",
    ],
    [
      "A bit hard",
      "🙂",
      "That’s okay.",
      "Would you like a shorter story?",
      "Find a shorter story",
      "Back to my recording",
    ],
    [
      "Not sure",
      "🤔",
      "That’s okay too.",
      "You can listen again or pick another story.",
      "Listen again",
      "Choose a story",
    ],
  ])(
    "choosing %s highlights it and opens a focused modal — nothing is revealed on the page itself",
    async (label, emoji, heading, message, primary, secondary) => {
      await toReview();
      const before = document.body.textContent;
      fireEvent.click(feeling(label));
      const d = await screen.findByRole("dialog", { name: heading });
      expect(within(d).getByText(emoji).getAttribute("aria-hidden")).toBe("true");
      expect(within(d).getByText(message)).toBeTruthy();
      expect(within(d).getByRole("button", { name: primary })).toBeTruthy();
      expect(within(d).getByRole("button", { name: secondary })).toBeTruthy();
      expect(within(d).getAllByRole("button", { name: "Close" })).toHaveLength(1);
      expect(feeling(label).getAttribute("aria-pressed")).toBe("true"); // highlighted
      expect(screen.getAllByRole("dialog")).toHaveLength(1);
      const page = screen
        .getByRole("heading", { name: "How was reading?", hidden: true })
        .closest("section")!;
      expect(page.textContent).not.toContain(message); // the response lives only in the modal
      expect(before).not.toContain(message);
      await waitFor(() =>
        expect(document.activeElement).toBe(within(d).getByRole("button", { name: primary })),
      );
    },
  );

  it("closing keeps the choice and the recording, returns focus, and the choice can be changed or its response reopened", async () => {
    await toReview();
    fireEvent.click(feeling("Easy"));
    const d = await screen.findByRole("dialog");
    fireEvent.click(within(d).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(feeling("Easy").getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(feeling("Easy")));
    expect(document.querySelector("audio")).not.toBeNull(); // the recording is untouched
    fireEvent.click(feeling("Easy")); // reopen the same response
    expect(await screen.findByRole("dialog", { name: "Ready for another?" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(feeling("A bit hard")); // change the choice
    expect(await screen.findByRole("dialog", { name: "That’s okay." })).toBeTruthy();
    expect(feeling("A bit hard").getAttribute("aria-pressed")).toBe("true");
    expect(feeling("Easy").getAttribute("aria-pressed")).toBe("false");
  });

  it("opening a response pauses the player and nothing resumes it", async () => {
    await toReview();
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause");
    pause.mockClear();
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    play.mockClear();
    fireEvent.click(feeling("Not sure"));
    await screen.findByRole("dialog");
    expect(pause).toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(play).not.toHaveBeenCalled();
  });

  it("Choose a story opens the catalogue and keeps the recording", async () => {
    await toReview();
    fireEvent.click(feeling("Easy"));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Choose a story" }),
    );
    await screen.findByRole("heading", { name: /where shall we go today/i });
    expect(cards()).toHaveLength(8);
    expect(screen.getByText(/Your recording of “Lazy Anansi” is saved for now/)).toBeTruthy();
  });

  it("Find a shorter story filters by word count against the current story, clearly and removably — never 'easier'", async () => {
    await toReview(/How Stories Came to People/); // 630 words
    fireEvent.click(feeling("A bit hard"));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Find a shorter story",
      }),
    );
    await screen.findByRole("heading", { name: /where shall we go today/i });
    const chip = screen.getByRole("button", {
      name: /Remove filter: shorter than How Stories Came to People/i,
    });
    expect(chip.textContent).toContain("Shorter than “How Stories Came to People”");
    const shown = cards();
    expect(shown).toHaveLength(7); // everything except the story itself is shorter than 630 words
    expect(shown.some((c) => /How Stories Came to People/.test(c.textContent ?? ""))).toBe(false);
    expect(shown.every((c) => Number(/(\d+) words/.exec(c.textContent ?? "")![1]) < 630)).toBe(
      true,
    );
    expect(document.body.textContent).not.toMatch(/easier|simpler/i);
    expect(screen.getByText(/saved for now/)).toBeTruthy(); // recording kept while browsing
    fireEvent.click(chip);
    expect(cards()).toHaveLength(8); // removable
    expect(screen.queryByRole("button", { name: /Remove filter/ })).toBeNull();
  });

  it("says so, and offers the full collection, when no story is shorter", async () => {
    await toReview(/Kariza/); // the shortest story, 385 words
    fireEvent.click(feeling("A bit hard"));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Find a shorter story",
      }),
    );
    const status = await screen.findByRole("status");
    expect(status.textContent).toContain(
      "There isn’t a shorter story than “Kariza’s Questions” in this collection yet.",
    );
    expect(cards()).toHaveLength(0);
    fireEvent.click(within(status).getByRole("button", { name: "Show all stories" }));
    expect(cards()).toHaveLength(8);
    expect(screen.queryByRole("button", { name: /Remove filter/ })).toBeNull();
  });

  it("for your own story (no reliable word count) it offers 'Browse short stories' using the catalogue's short-read category", async () => {
    renderApp();
    await enter();
    fireEvent.click(screen.getByRole("tab", { name: "Bring your own" }));
    fireEvent.click(btn(/Paste text/));
    const box = await screen.findByLabelText("Your passage");
    fireEvent.change(box, { target: { value: "A story I love." } });
    fireEvent.blur(box);
    click(/continue to reading/i);
    await screen.findAllByRole("button", { name: /start recording/i });
    fireEvent.click(within(dock()).getByRole("button", { name: /start recording/i }));
    fireEvent.click(await within(dock()).findByRole("button", { name: /finish recording/i }));
    await screen.findByRole("heading", { name: "You made time to read." });
    fireEvent.click(feeling("A bit hard"));
    const d = await screen.findByRole("dialog");
    expect(within(d).queryByRole("button", { name: "Find a shorter story" })).toBeNull();
    fireEvent.click(within(d).getByRole("button", { name: "Browse short stories" }));
    await screen.findByRole("heading", { name: /where shall we go today/i });
    expect(screen.getByRole("button", { name: /Remove filter: short reads/i })).toBeTruthy();
    expect(screen.getByText(/Short reads are stories of up to 420 words/)).toBeTruthy();
    const shown = cards();
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.every((c) => /Short read/.test(c.textContent ?? ""))).toBe(true);
  });

  it("Listen again closes the modal and starts the existing recording from the beginning after the click", async () => {
    await toReview();
    const audio = document.querySelector("audio")!;
    audio.currentTime = 7;
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    expect(play).not.toHaveBeenCalled(); // never before the explicit click
    fireEvent.click(feeling("Not sure"));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Listen again" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(play).toHaveBeenCalledTimes(1);
    expect(audio.currentTime).toBe(0);
    expect(document.querySelector("audio")).toBe(audio); // the same recording
  });

  it("shows a visible message if the recording can't be played", async () => {
    await toReview();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("blocked"));
    fireEvent.click(feeling("Not sure"));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Listen again" }),
    );
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/couldn’t be played/);
  });

  it("Back to my recording closes the modal and focuses the player, without playing", async () => {
    await toReview();
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    play.mockClear();
    const focus = vi.spyOn(document.querySelector("audio")!, "focus");
    fireEvent.click(feeling("A bit hard"));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Back to my recording",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(focus).toHaveBeenCalled()); // focus is sent to the player (jsdom cannot focus <audio> itself)
    expect(play).not.toHaveBeenCalled();
    expect(feeling("A bit hard").getAttribute("aria-pressed")).toBe("true"); // the choice is kept
  });

  it("Record again asks before replacing the recording", async () => {
    await toReview();
    click(/record again/i);
    expect(screen.getByText("Record again? This replaces your current recording.")).toBeTruthy();
    click(/^Keep it$/i);
    expect(document.querySelector("audio")).not.toBeNull(); // nothing was replaced
    click(/record again/i);
    click(/yes, record again/i);
    expect(
      (await screen.findAllByRole("button", { name: /start recording/i })).length,
    ).toBeGreaterThan(0);
  });

  it("choosing another story keeps the recording until you clearly choose to replace it", async () => {
    await toReview();
    click(/choose another story/i);
    await screen.findByRole("heading", { name: /where shall we go today/i });
    expect(screen.getByText(/Your recording of “Lazy Anansi” is saved for now/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /The Magic Mokoro/ }));
    const d = await screen.findByRole("dialog", { name: "The Magic Mokoro" });
    fireEvent.click(within(d).getByRole("button", { name: /read this story/i }));
    expect(within(d).getByText(/Your recording of “Lazy Anansi” will be replaced/)).toBeTruthy(); // inside the modal
    fireEvent.click(within(d).getByRole("button", { name: /keep my recording/i }));
    expect(screen.queryByText(/will be replaced/)).toBeNull();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText(/saved for now/)).toBeTruthy(); // still there
    click(/listen back/i);
    expect(await screen.findByRole("heading", { name: "You made time to read." })).toBeTruthy();

    click(/choose another story/i); // and replacing is possible, deliberately
    fireEvent.click(screen.getByRole("button", { name: /The Magic Mokoro/ }));
    const d2 = await screen.findByRole("dialog");
    fireEvent.click(within(d2).getByRole("button", { name: /read this story/i }));
    fireEvent.click(within(d2).getByRole("button", { name: /replace and read/i }));
    expect(
      (await screen.findAllByRole("button", { name: /start recording/i })).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "The Magic Mokoro", level: 1 })).toBeTruthy();
  });
});

describe("modals never leave the page locked", () => {
  const locked = () =>
    document.body.style.pointerEvents === "none" ||
    document.body.hasAttribute("data-scroll-locked");

  it("starting a story from its modal leaves nothing locked or hidden", async () => {
    renderApp();
    await enter();
    fireEvent.click(screen.getByRole("button", { name: /Lazy Anansi/ }));
    fireEvent.click(await screen.findByRole("button", { name: /read this story/i }));
    await screen.findAllByRole("button", { name: /start recording/i });
    await waitFor(() => expect(locked()).toBe(false));
    expect(document.querySelector("[aria-hidden='true'] main")).toBeNull(); // the page isn't left hidden from assistive technology
    expect(screen.getAllByRole("button", { name: /start recording/i }).length).toBeGreaterThan(0);
  });

  it.each(["Easy", "A bit hard"])(
    "leaving the review through a %s response leaves nothing locked",
    async (label) => {
      renderApp();
      await enter();
      await openStory(/Lazy Anansi/);
      fireEvent.click(within(dock()).getByRole("button", { name: /start recording/i }));
      fireEvent.click(await within(dock()).findByRole("button", { name: /finish recording/i }));
      await screen.findByRole("heading", { name: "You made time to read." });
      fireEvent.click(screen.getByRole("button", { name: new RegExp(label), hidden: false }));
      const d = await screen.findByRole("dialog");
      fireEvent.click(
        within(d)
          .getAllByRole("button")
          .find((b) => /Choose a story|Find a shorter story/.test(b.textContent ?? ""))!,
      );
      await screen.findByRole("heading", { name: /where shall we go today/i });
      await waitFor(() => expect(locked()).toBe(false));
      // and the page really is usable: a card can be opened
      fireEvent.click(screen.getAllByRole("button", { name: /words$/ })[0]!);
      expect(await screen.findByRole("dialog")).toBeTruthy();
    },
  );
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

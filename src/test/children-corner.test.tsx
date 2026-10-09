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

  it("puts the sample link inside the target card, beneath the choices, once, at every width", async () => {
    renderApp();
    await screen.findByRole("heading", { name: /read aloud/i });
    const card = screen.getByText("Today's reading target").closest("section")!;
    const inside = within(card).getByRole("button", { name: "Try a sample session" });
    // always visible (no breakpoint hides it), after the target choices, and text-styled: no button background or border
    expect(inside.closest("p")!.className).not.toMatch(/hidden|lg:/);
    expect(inside.className).not.toMatch(/btn-|border|bg-/);
    expect(inside.className).toContain("text-link");
    const choices = within(card).getByRole("button", { name: "10 min" });
    expect(choices.compareDocumentPosition(inside) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // the only copy: nothing is left beneath the doorway
    expect(screen.getAllByRole("button", { name: "Try a sample session" })).toHaveLength(1);
    // the doorway sits below and outside the card
    const door = btn(/step inside/i);
    expect(card.contains(door)).toBe(false);
    expect(card.compareDocumentPosition(door) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    .queryAllByRole("button")
    .filter((b) => b.getAttribute("aria-haspopup") === "dialog" && /words/.test(b.textContent ?? ""));

describe("choosing a story", () => {
  it("shows the collection with lengths, honest filters and no search", async () => {
    renderApp();
    await enter();
    expect(screen.getByRole("tab", { name: "Pick a story", selected: true })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Bring your own" })).toBeTruthy();
    expect(cards()).toHaveLength(8);
    expect(screen.queryByRole("searchbox")).toBeNull();
    // a story can have several themes; only themes the collection really has get a filter
    const counts = { "Tales and adventures": 2, Funny: 2, "Everyday life": 3, Nature: 3, Science: 3 };
    for (const [name, n] of Object.entries(counts)) {
      fireEvent.click(btn(name));
      expect(cards()).toHaveLength(n);
      expect(btn(name).getAttribute("aria-pressed")).toBe("true");
    }
    expect(screen.queryByRole("button", { name: "Folktales" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Real world" })).toBeNull();
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
      const meta = within(card).getByText(/words/);
      expect(meta.className).toContain("mt-auto"); // metadata pinned to the bottom so it lines up
    }
    // the grid adapts to larger text instead of squeezing: columns are sized in rem
    expect(document.querySelector("ul")!.className).toMatch(/minmax\(9\.5rem/);
  });

  it("selecting a story opens ONE modal with its cover, description, length and actions — not a preview below the grid", async () => {
    renderApp();
    await enter();
    fireEvent.click(screen.getByRole("button", { name: /Jackal and the Sun/ }));
    const d = await screen.findByRole("dialog", { name: "Jackal and the Sun" });
    expect(within(d).getByText(/A lazy jackal falls for the sun/)).toBeTruthy();
    expect(
      within(d).getByText("Medium read · 316 words, plus 137 in the story notes · 10 pages"),
    ).toBeTruthy(); // the story's words and the separate notes are both said
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
    const card = screen.getByRole("button", { name: /How Zebra Got His Stripes/ });
    card.focus();
    fireEvent.click(card);
    await screen.findByRole("dialog", { name: "How Zebra Got His Stripes" });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(card));
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(cards()).toHaveLength(8); // the catalogue is exactly as it was
  });

  it("closing with the close control also returns to the card", async () => {
    renderApp();
    await enter();
    const card = screen.getByRole("button", { name: /Jackal and the Sun/ });
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
    fireEvent.click(screen.getByRole("button", { name: /Jackal and the Sun/ }));
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
    await openStory(/Jackal and the Sun/);

    // illustrated, real text, one-line page counter, no target
    expect(await screen.findByText(/Long ago, there was a foolish lazy jackal/)).toBeTruthy();
    expect(screen.getByText("Page 1 of 10").className).toContain("whitespace-nowrap");
    // the picture is described, not left as decoration
    expect(
      document.querySelector('main img[src="/stories/jackal-and-the-sun/p1.jpg"]')!.getAttribute("alt"),
    ).toMatch(/jackals/);
    expect(screen.queryByText(/of \d+ min target/)).toBeNull();

    // text size changes the story text, not the controls
    const para = screen.getByText(/Long ago, there was a foolish lazy jackal/).closest("div")!;
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
    expect(screen.getByText("Page 2 of 10")).toBeTruthy();
    expect(await screen.findByText(/Old Jackal woke up to find his son sleeping/)).toBeTruthy();

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
  async function toReview(story: RegExp = /Jackal and the Sun/) {
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

  it("marks the chosen feeling with a checkmark as well as the darker border", async () => {
    await toReview();
    expect(feeling("A bit hard").querySelector("svg")).toBeNull();
    fireEvent.click(feeling("A bit hard"));
    fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(feeling("A bit hard").querySelector("svg[aria-hidden='true']")).not.toBeNull();
    expect(feeling("Easy").querySelector("svg")).toBeNull();
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
    expect(screen.getByText(/Your recording of “Jackal and the Sun” is saved for now/)).toBeTruthy();
  });

  it("Find a shorter story filters by word count against the current story, clearly and removably — never 'easier'", async () => {
    await toReview(/A Fish and a Gift/); // 655 words
    fireEvent.click(feeling("A bit hard"));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Find a shorter story",
      }),
    );
    await screen.findByRole("heading", { name: /where shall we go today/i });
    const chip = screen.getByRole("button", {
      name: /Remove filter: shorter than A Fish and a Gift/i,
    });
    expect(chip.textContent).toContain("Shorter than “A Fish and a Gift”");
    // by full reading length (story plus any notes): Whoop 350, Kariza 385, Jackal 453, Zebra 488 are under 655;
    // Spring (679), the laughing story (797) and the science story (1,188) are not
    const shown = cards();
    expect(shown.map((c) => c.querySelector(".display-serif")!.textContent)).toEqual([
      "Whoop, Goes the Pufferfish",
      "Kariza’s Questions",
      "Jackal and the Sun",
      "How Zebra Got His Stripes",
    ]);
    expect(document.body.textContent).not.toMatch(/easier|simpler/i);
    expect(screen.getByText(/saved for now/)).toBeTruthy(); // recording kept while browsing
    fireEvent.click(chip);
    expect(cards()).toHaveLength(8); // removable
    expect(screen.queryByRole("button", { name: /Remove filter/ })).toBeNull();
  });

  it("a story's separate notes count towards its full reading length, so it is never called shorter than it reads", async () => {
    // Jackal and the Sun is 316 words but has 137 more in its notes (453 in all). A story with 400 words reading
    // length would be shorter than that; Kariza (385) is, Zebra (488) is not.
    await toReview(/Jackal and the Sun/);
    fireEvent.click(feeling("A bit hard"));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Find a shorter story",
      }),
    );
    await screen.findByRole("heading", { name: /where shall we go today/i });
    expect(cards().map((c) => c.querySelector(".display-serif")!.textContent)).toEqual([
      "Whoop, Goes the Pufferfish",
      "Kariza’s Questions",
    ]);
  });

  it("says so, and offers the full collection, when no story is shorter", async () => {
    await toReview(/Whoop/); // the shortest reading, 350 words including its notes
    fireEvent.click(feeling("A bit hard"));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Find a shorter story",
      }),
    );
    const status = await screen.findByRole("status");
    expect(status.textContent).toContain(
      "There isn’t a shorter story than “Whoop, Goes the Pufferfish” in this collection yet.",
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
    expect(screen.getByText(/Your recording of “Jackal and the Sun” is saved for now/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /How Zebra Got His Stripes/ }));
    const d = await screen.findByRole("dialog", { name: "How Zebra Got His Stripes" });
    fireEvent.click(within(d).getByRole("button", { name: /read this story/i }));
    expect(within(d).getByText(/Your recording of “Jackal and the Sun” will be replaced/)).toBeTruthy(); // inside the modal
    fireEvent.click(within(d).getByRole("button", { name: /keep my recording/i }));
    expect(screen.queryByText(/will be replaced/)).toBeNull();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText(/saved for now/)).toBeTruthy(); // still there
    click(/listen back/i);
    expect(await screen.findByRole("heading", { name: "You made time to read." })).toBeTruthy();

    click(/choose another story/i); // and replacing is possible, deliberately
    fireEvent.click(screen.getByRole("button", { name: /How Zebra Got His Stripes/ }));
    const d2 = await screen.findByRole("dialog");
    fireEvent.click(within(d2).getByRole("button", { name: /read this story/i }));
    fireEvent.click(within(d2).getByRole("button", { name: /replace and read/i }));
    expect(
      (await screen.findAllByRole("button", { name: /start recording/i })).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "How Zebra Got His Stripes", level: 1 })).toBeTruthy();
  });
});

describe("modals never leave the page locked", () => {
  const locked = () =>
    document.body.style.pointerEvents === "none" ||
    document.body.hasAttribute("data-scroll-locked");

  it("starting a story from its modal leaves nothing locked or hidden", async () => {
    renderApp();
    await enter();
    fireEvent.click(screen.getByRole("button", { name: /Jackal and the Sun/ }));
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
      await openStory(/Jackal and the Sun/);
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
    fireEvent.click(screen.getByRole("button", { name: /Jackal and the Sun/ }));
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
    fireEvent.click(screen.getByRole("button", { name: /Jackal and the Sun/ }));
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
    fireEvent.click(screen.getByRole("button", { name: /Jackal and the Sun/ }));
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

    click(/back to your story/i); // the children's session is still there, exactly where it was left
    expect(await screen.findByRole("heading", { name: "You made time to read." })).toBeTruthy();
  });

  it("cancelling the exit dialog changes nothing", async () => {
    await adultWithTarget();
    click(/step inside/i);
    await screen.findByRole("heading", { name: /where shall we go today/i });
    fireEvent.click(screen.getByRole("button", { name: /Jackal and the Sun/ }));
    click(/read this story/i);
    await screen.findAllByRole("button", { name: /start recording/i });
    click("Exit session");
    fireEvent.click(await screen.findByRole("button", { name: "Stay in session" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByRole("heading", { name: "Jackal and the Sun", level: 1 })).toBeTruthy();
  });
});

describe("leaving mid-recording and browser Back", () => {
  async function recordingInCorner() {
    renderApp();
    await enter();
    await openStory(/Jackal and the Sun/);
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
    click(/back to your story/i);
    expect(await screen.findByRole("heading", { name: "You made time to read." })).toBeTruthy();
    expect(document.querySelector("audio")!.hasAttribute("autoplay")).toBe(false);
  });

  it("browser Back leaves the corner, preserves its session, and Forward returns to it", async () => {
    renderApp();
    await enter();
    fireEvent.click(screen.getByRole("button", { name: /Jackal and the Sun/ }));
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
    expect(await screen.findByRole("heading", { name: "Jackal and the Sun", level: 1 })).toBeTruthy();
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

describe("a retained children's session on the welcome screen", () => {
  const door = () => btn(/step inside|back to your story|continue your reading/i);
  const home = async () => {
    click("Reading Buddy home");
    await screen.findByRole("heading", { name: /read aloud/i });
  };
  const nextPage = async (n: number) => {
    await screen.findByText(/^Page 1 of/);
    for (let i = 0; i < n; i++) fireEvent.click(btn("Next page"));
  };

  it("browsing the catalogue alone never makes an unfinished-session indicator", async () => {
    renderApp();
    await enter();
    fireEvent.click(screen.getByRole("tab", { name: "Bring your own" })); // looking, choosing nothing
    fireEvent.click(screen.getByRole("tab", { name: "Pick a story" }));
    fireEvent.click(screen.getByRole("button", { name: /Tales and adventures/ }));
    fireEvent.click(screen.getByRole("button", { name: /Jackal and the Sun/ })); // opens and closes a preview
    fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByRole("button", { name: "Exit session" })).toBeNull();
    await home();
    expect(door().textContent).toMatch(/A doorway to stories/);
    expect(door().textContent).toMatch(/Step inside/);
    expect(screen.queryByText(/back to your story/i)).toBeNull();
  });

  it("shows the chosen story and Continue; it is still one control and returns to the page that was being read", async () => {
    renderApp();
    await enter();
    await openStory(/Jackal and the Sun/);
    await nextPage(2);
    expect(screen.getByText("Page 3 of 10")).toBeTruthy();
    await home();

    const d = door();
    expect(d.tagName).toBe("BUTTON");
    expect(within(d).getByText("Back to your story")).toBeTruthy();
    expect(within(d).getByText("Jackal and the Sun")).toBeTruthy();
    expect(within(d).getByText("Continue")).toBeTruthy();
    expect(d.textContent).not.toMatch(/doorway to stories|Step inside/);
    expect(d.querySelectorAll("button, a, input, [tabindex]")).toHaveLength(0);
    expect(d.querySelector("svg[aria-hidden='true']")).not.toBeNull(); // the picture is part of the same control
    expect(screen.getAllByRole("button", { name: /back to your story/i })).toHaveLength(1);
    // still quiet text: no pill, border or fill, and no permanent underline
    expect(within(d).getByText("Continue").className).not.toMatch(
      /btn-|border|bg-|underline|rounded-full/,
    );
    // the accessible name says which corner it belongs to
    expect(d.textContent).toMatch(/children’s reading corner/);

    fireEvent.click(d.querySelector("svg")!); // clicking the picture continues too
    expect(await screen.findByRole("heading", { name: "Jackal and the Sun", level: 1 })).toBeTruthy();
    expect(screen.getByText("Page 3 of 10")).toBeTruthy(); // the same page, not a new session
    expect(within(dock()).getByRole("button", { name: /start recording/i })).toBeTruthy(); // nothing started
  });
});

describe("continuing a retained children's session", () => {
  const door = () => btn(/step inside|back to your story|continue your reading/i);
  const home = async () => {
    click("Reading Buddy home");
    await screen.findByRole("heading", { name: /read aloud/i });
  };
  const toReview = async () => {
    renderApp();
    await enter();
    await openStory(/Jackal and the Sun/);
    fireEvent.click(within(dock()).getByRole("button", { name: /start recording/i }));
    fireEvent.click(await within(dock()).findByRole("button", { name: /finish recording/i }));
    await screen.findByRole("heading", { name: "You made time to read." });
  };

  it("brings back the review, the recording and the reflection — nothing restarts or plays", async () => {
    await toReview();
    const before = document.querySelector("audio")!.getAttribute("src");
    fireEvent.click(screen.getByRole("button", { name: /A bit hard/, hidden: true }));
    fireEvent.keyDown(await screen.findByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await home();
    expect(within(door()).getByText("Jackal and the Sun")).toBeTruthy();

    click(/back to your story/i);
    expect(await screen.findByRole("heading", { name: "You made time to read." })).toBeTruthy();
    expect(document.querySelector("audio")!.getAttribute("src")).toBe(before); // the same recording
    expect(document.querySelector("audio")!.hasAttribute("autoplay")).toBe(false);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /A bit hard/, hidden: true }).getAttribute("aria-pressed"),
    ).toBe("true"); // the reflection came back too
    expect(screen.queryByRole("button", { name: /start recording/i })).toBeNull();
  });

  it("returning home mid-recording still asks first; cancelling keeps recording; confirming keeps the audio", async () => {
    renderApp();
    await enter();
    await openStory(/Jackal and the Sun/);
    fireEvent.click(within(dock()).getByRole("button", { name: /start recording/i }));
    await within(dock()).findByRole("button", { name: /finish recording/i });
    click("Reading Buddy home");
    const d = await screen.findByRole("alertdialog");
    fireEvent.click(within(d).getByRole("button", { name: "Keep recording" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(within(dock()).getByRole("status").textContent).toMatch(/Recording/);
    click("Reading Buddy home");
    fireEvent.click(await screen.findByRole("button", { name: "Finish and go home" }));
    await screen.findByRole("heading", { name: /read aloud/i });
    expect(within(door()).getByText("Jackal and the Sun")).toBeTruthy();
    click(/back to your story/i);
    expect(await screen.findByRole("heading", { name: "You made time to read." })).toBeTruthy();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("uses 'Your own story' for the child's own content", async () => {
    renderApp();
    await enter();
    fireEvent.click(screen.getByRole("tab", { name: "Bring your own" }));
    fireEvent.click(btn(/Paste text/));
    const box = await screen.findByLabelText("Your passage");
    fireEvent.change(box, { target: { value: "A short passage I love to read." } });
    fireEvent.blur(box);
    click(/continue to reading/i);
    await screen.findAllByRole("button", { name: /start recording/i });
    await home();
    expect(within(door()).getByText("Back to your story")).toBeTruthy();
    expect(within(door()).getByText("Your own story")).toBeTruthy();
    click(/back to your story/i);
    await screen.findAllByRole("button", { name: /start recording/i });
    expect(screen.getByText("A short passage I love to read.")).toBeTruthy();
  });

  it("while pages are still being prepared it says so, and Continue returns to them", async () => {
    renderApp();
    await enter();
    fireEvent.click(screen.getByRole("tab", { name: "Bring your own" }));
    fireEvent.click(btn(/Paste text/));
    const box = await screen.findByLabelText("Your passage");
    fireEvent.change(box, { target: { value: "Half a story I have not started yet." } });
    await home();
    expect(within(door()).getByText("Continue your reading")).toBeTruthy();
    expect(within(door()).getByText("Your pages are waiting")).toBeTruthy();
    expect(within(door()).getByText("Continue")).toBeTruthy();
    click(/continue your reading/i);
    await screen.findByRole("heading", { name: "Bring a story you love." });
    expect((screen.getByLabelText("Your passage") as HTMLTextAreaElement).value).toBe(
      "Half a story I have not started yet.",
    );
  });

  it("an explicit discard brings back the plain doorway", async () => {
    renderApp();
    await enter();
    await openStory(/Jackal and the Sun/);
    click("Exit session");
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Leave and discard",
      }),
    );
    await screen.findByRole("heading", { name: /where shall we go today/i });
    await home();
    expect(door().textContent).toMatch(/A doorway to stories/);
    expect(door().textContent).toMatch(/A reading corner for children/);
    expect(door().textContent).toMatch(/Step inside/);
  });

  it("both sessions coexist, each with its own clearly different resume control, and neither loses anything", async () => {
    renderApp();
    await screen.findByRole("heading", { name: /read aloud/i });
    fireEvent.click(screen.getByRole("button", { name: "10 min" }));
    await screen.findByLabelText("Today's target");
    fireEvent.click(await screen.findByRole("button", { name: /Paste t/ }));
    const box = await screen.findByLabelText("Your passage");
    fireEvent.change(box, { target: { value: "Maya found a tiny seed." } });
    fireEvent.blur(box);
    click(/continue to reading/i);
    await screen.findAllByRole("button", { name: /start recording/i });
    // into the corner, choose a story, read a page or two
    click("Reading Buddy home");
    await screen.findByRole("button", { name: /resume session/i });
    click(/step inside/i);
    await screen.findByRole("heading", { name: /where shall we go today/i });
    await openStory(/Jackal and the Sun/);
    click("Reading Buddy home");
    await screen.findByRole("heading", { name: /read aloud/i });

    // two different, both visible controls
    const resume = screen.getByRole("button", { name: /resume session/i });
    const doorway = btn(/back to your story/i);
    expect(resume).not.toBe(doorway);
    expect(screen.getByText("Your session is waiting")).toBeTruthy();
    expect(within(doorway).getByText("Jackal and the Sun")).toBeTruthy();
    expect(doorway.textContent).toMatch(/children’s reading corner/);
    expect(resume.textContent).not.toMatch(/children|Jackal and the Sun/);

    click(/resume session/i); // the adult session is intact
    await screen.findAllByRole("button", { name: /start recording/i });
    expect(screen.getByText("Maya found a tiny seed.")).toBeTruthy();
    click("Reading Buddy home");
    await screen.findByRole("heading", { name: /read aloud/i });
    click(/back to your story/i); // and so is the children's
    expect(await screen.findByRole("heading", { name: "Jackal and the Sun", level: 1 })).toBeTruthy();
  });

  it("the sample session keeps both personal sessions and returns to the same welcome screen", async () => {
    await toReview();
    await home();
    expect(screen.getAllByRole("button", { name: "Try a sample session" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Try a sample session" }));
    await screen.findByText("Sample session");
    click("Exit sample");
    await screen.findByRole("heading", { name: /read aloud/i });
    expect(within(door()).getByText("Jackal and the Sun")).toBeTruthy(); // the children's session is untouched
    click(/back to your story/i);
    expect(await screen.findByRole("heading", { name: "You made time to read." })).toBeTruthy();
  });
});

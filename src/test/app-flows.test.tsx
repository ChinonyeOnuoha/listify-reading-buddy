import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { Route as RootRoute } from "@/routes/__root";

// A controllable recorder with the real hook's shape and no microphone. Each corner gets its own instance.
vi.mock("@/components/reading/useRecorder", async () => {
  const { useRef, useState } = await import("react");
  type Take = { url: string; duration: number; source: "recording" | "upload"; name?: string };
  return {
    formatTime: (s: number) =>
      `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
    useRecorder: (onComplete: () => void) => {
      const [state, setState] = useState<"idle" | "recording" | "paused">("idle");
      const [take, setTake] = useState<Take | null>(null);
      const takeRef = useRef<Take | null>(null);
      takeRef.current = take;
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
        restore: (t: Take | null) => setTake(t),
        detach: () => {
          const t = takeRef.current;
          setTake(null);
          return t;
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
  HTMLMediaElement.prototype.pause = vi.fn();
  HTMLMediaElement.prototype.play = vi.fn(async () => {});
  // Page photos "decode" instantly in tests.
  HTMLImageElement.prototype.decode = () => Promise.resolve();
  URL.createObjectURL = vi.fn(() => `blob:${Math.random().toString(36).slice(2)}`);
  URL.revokeObjectURL = vi.fn();
});

function renderApp() {
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "");
});
afterEach(() => {
  cleanup();
});

const btn = (name: string | RegExp) => screen.getAllByRole("button", { name })[0]!;
const click = (name: string | RegExp) => fireEvent.click(btn(name));
const radio = (name: string | RegExp) => fireEvent.click(screen.getByRole("radio", { name }));
const heading = (name: RegExp) => screen.findByRole("heading", { level: 1, name });
const tick = (ms = 500) => act(() => new Promise((r) => setTimeout(r, ms)));

async function setUpMain(opts: { text?: string } = {}) {
  renderApp();
  await heading(/who’s reading today/i);
  click(/practise reading aloud/i);
  await heading(/how long would you like to read/i);
  radio("10 minutes");
  click(/^continue$/i);
  await heading(/what are you reading today/i);
  fireEvent.change(screen.getByLabelText("Your passage"), {
    target: { value: opts.text ?? "First paragraph.\n\nSecond paragraph." },
  });
  click(/^continue$/i);
  await heading(/get comfortable/i);
  radio("Sky");
  click(/switch on the lamp/i);
  await heading(/your nook is ready/i);
}

describe("home", () => {
  it("offers three identical, left-aligned choices and no centred lone button", async () => {
    renderApp();
    await heading(/who’s reading today/i);
    const choices = ["Practise reading aloud", "Children’s corner", "Try a sample"].map((n) =>
      btn(new RegExp(n)),
    );
    for (const c of choices) expect(c.className).toContain("choice");
    expect(btn(/try a sample/i).textContent).toMatch(/no microphone needed/i);
  });
});

describe("main practice setup", () => {
  it("keeps the nook pinned during setup steps, but not while typing the passage or once set up", async () => {
    renderApp();
    await heading(/who’s reading today/i);
    const root = () => document.querySelector("main")!.parentElement!;
    expect(root().className).not.toContain("rb-pin");
    click(/practise reading aloud/i);
    await heading(/how long would you like to read/i);
    expect(root().className).toContain("rb-pin");
    radio("10 minutes");
    click(/^continue$/i);
    await heading(/what are you reading today/i);
    const box = screen.getByLabelText("Your passage");
    fireEvent.focus(box);
    fireEvent.focusIn(box);
    expect(root().className).not.toContain("rb-pin");
    fireEvent.change(box, { target: { value: "A short passage." } });
    fireEvent.focusOut(box);
    expect(root().className).toContain("rb-pin");
    click(/^continue$/i);
    await heading(/get comfortable/i);
    // Skip sits beside the main button on phones; the wide layout keeps it as a link below.
    expect(btn(/^skip$/i)).toBeTruthy();
    expect(btn(/skip for now/i)).toBeTruthy();
    click(/^skip$/i);
    await heading(/your nook is ready/i);
    expect(root().className).not.toContain("rb-pin");
  });

  it("Other minutes opens a real minutes field with steppers and a stated range", async () => {
    renderApp();
    await heading(/who’s reading today/i);
    click(/practise reading aloud/i);
    await heading(/how long/i);
    radio(/other/i);
    const field = screen.getByLabelText("Your minutes") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "400" } });
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Enter a whole number from 1 to 180.")).toBeTruthy();
    expect(btn(/^continue$/i)).toBeDisabled();
    fireEvent.change(field, { target: { value: "35" } });
    click("5 minutes more");
    expect(field.value).toBe("40");
    expect(btn(/^continue$/i)).not.toBeDisabled();
    click(/^continue$/i);
    await heading(/what are you reading today/i);
  });

  it("the passage field starts empty with a real placeholder", async () => {
    renderApp();
    await heading(/who’s reading today/i);
    click(/practise reading aloud/i);
    radio("5 minutes");
    click(/^continue$/i);
    const box = (await screen.findByLabelText("Your passage")) as HTMLTextAreaElement;
    expect(box.value).toBe("");
    expect(box.placeholder).toMatch(/paste or type/i);
    expect(btn(/^continue$/i)).toBeDisabled();
  });

  it("offers eight cushion colours as fixed-size swatches, and the summary lists each choice with Change", async () => {
    await setUpMain();
    const rows = screen.getByRole("list", { name: "Your nook" });
    expect(within(rows).getByText("10 minutes")).toBeTruthy();
    expect(within(rows).getByText("Pasted passage")).toBeTruthy();
    expect(within(rows).getByText("Sky")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Change cushion" }));
    await heading(/get comfortable/i);
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    for (const r of screen.getAllByRole("radio")) expect(r.className).toContain("swatch");
  });

  it("changing one thing from the summary returns to the summary, not to the start of setup", async () => {
    await setUpMain();
    fireEvent.click(screen.getByRole("button", { name: "Change reading time" }));
    await heading(/how long/i);
    expect(btn(/back to your nook/i)).toBeTruthy();
    expect(screen.queryByText(/step 1 of 3/i)).toBeNull();
    radio("15 minutes");
    click(/^save$/i);
    await heading(/your nook is ready/i);
    expect(
      within(screen.getByRole("list", { name: "Your nook" })).getByText("15 minutes"),
    ).toBeTruthy();
    // Back without saving also returns to the summary
    fireEvent.click(screen.getByRole("button", { name: "Change cushion" }));
    await heading(/get comfortable/i);
    click(/back to your nook/i);
    await heading(/your nook is ready/i);
  });
});

describe("photographed pages", () => {
  async function toPages(n: number) {
    renderApp();
    await heading(/who’s reading today/i);
    click(/practise reading aloud/i);
    radio("5 minutes");
    click(/^continue$/i);
    await heading(/what are you reading today/i);
    fireEvent.click(screen.getByRole("tab", { name: "Photos of pages" }));
    const input = document.querySelector("input[type=file][multiple]") as HTMLInputElement;
    const files = Array.from(
      { length: n },
      (_, i) => new File(["x"], `p${i + 1}.png`, { type: "image/png" }),
    );
    fireEvent.change(input, { target: { files } });
    await screen.findByText(`${n} pages`);
  }

  it("many pages sit in one sideways strip of fixed-size thumbnails, with one toolbar for the selected page", async () => {
    await toPages(8);
    const strip = screen.getByRole("listbox", { name: /your pages/i });
    expect(strip.className).toContain("overflow-x-auto");
    const thumbs = within(strip).getAllByRole("option");
    expect(thumbs).toHaveLength(8);
    for (const t of thumbs) expect(t.className).toContain("w-[84px]");
    // Three controls for the selection in total, not three per page.
    const bar = screen.getByRole("toolbar", { name: "Selected page" });
    expect(within(bar).getAllByRole("button")).toHaveLength(3);
  });

  it("select a page, move it with Earlier or Later, and hear where it went", async () => {
    await toPages(3);
    fireEvent.click(screen.getByRole("option", { name: "Page 1" }));
    click("Later");
    expect(screen.getByText("Page 1 moved to position 2 of 3.")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Page 2" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(
      within(screen.getByRole("toolbar", { name: "Selected page" })).getByText("Page 2 of 3"),
    ).toBeTruthy();
  });
});

describe("reading and recording", () => {
  it("explains the microphone once, records, and never highlights paragraphs on its own", async () => {
    await setUpMain();
    click(/sit down and read/i);
    const paras = () =>
      [...document.querySelectorAll("section[aria-label='Your reading'] p")].map(
        (p) => p.className,
      );
    const before = paras();
    click(/start recording/i);
    const d = await screen.findByRole("dialog", { name: /buddy needs to hear you/i });
    fireEvent.click(within(d).getByRole("button", { name: /allow microphone/i }));
    await screen.findAllByText("Recording");
    await tick(700);
    expect(paras()).toEqual(before); // the words stay still
  });

  it("leaving the reader mid-recording asks first, and finishing keeps the recording", async () => {
    await setUpMain();
    click(/sit down and read/i);
    click(/start recording/i);
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: /allow microphone/i }),
    );
    await screen.findAllByText("Recording");
    click(/^nook$/i);
    const d = await screen.findByRole("alertdialog", { name: /finish recording and go back/i });
    expect(within(d).getByRole("button", { name: "Keep reading" })).toBeTruthy();
    fireEvent.click(within(d).getByRole("button", { name: "Finish and go back" }));
    await heading(/your nook is ready/i);
    expect(btn(/your last recording, .*listen back/i)).toBeTruthy();
  });

  it("review has one main action; deleting a recording offers Undo and Undo puts it back", async () => {
    await setUpMain();
    click(/sit down and read/i);
    click(/start recording/i);
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: /allow microphone/i }),
    );
    await screen.findAllByText("Recording");
    click(/^finish$/i);
    await heading(/have a listen back/i);
    expect(btn(/record again/i).className).toContain("btn-primary");
    expect(btn(/^your nook$/i)).toBeTruthy(); // Back sits at the top, not in the footer
    btn("More options").focus();
    fireEvent.keyDown(btn("More options"), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete recording" }));
    const status = await screen.findByText("Recording deleted.");
    fireEvent.click(within(status.parentElement!).getByRole("button", { name: "Undo" }));
    click(/^nook$/i);
    await heading(/your nook is ready/i);
    expect(btn(/your last recording, .*listen back/i)).toBeTruthy();
  });
});

describe("children’s corner", () => {
  async function toStories() {
    renderApp();
    await heading(/who’s reading today/i);
    click(/children’s corner/i);
    await heading(/set a reading time/i);
    click(/hand over to the reader/i);
    await heading(/pick your beanbag/i);
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    radio("Marigold");
    click(/next: pick a story/i);
    await heading(/where shall we go today/i);
  }

  it("shows the theme filters in full and opens one fixed window with Story and About in the same space", async () => {
    await toStories();
    const filters = screen.getByRole("group", { name: "Show stories" });
    expect(within(filters).getAllByRole("button").length).toBeGreaterThanOrEqual(5);
    expect(filters.className).toContain("flex-wrap");
    fireEvent.click(screen.getByRole("button", { name: /jackal and the sun/i }));
    const d = await screen.findByRole("dialog");
    const views = d.querySelectorAll(".stack > *");
    expect(views).toHaveLength(2);
    expect(views[1]!.getAttribute("data-off")).toBe("true");
    fireEvent.click(within(d).getByRole("tab", { name: "About this book" }));
    expect(views[0]!.getAttribute("data-off")).toBe("true");
    expect(views[1]!.getAttribute("data-off")).toBe("false");
    fireEvent.click(within(d).getByRole("button", { name: "Read this story" }));
    await heading(/your corner is ready/i);
    expect(btn(/open the story/i)).toBeTruthy();
  });

  it("the corner's wall clock shows the grown-up's choice, never the main practice's minutes", async () => {
    await setUpMain(); // main practice: 10 minutes a day
    const clock = () => document.querySelector("svg[role=img]")!.textContent ?? "";
    expect(clock()).toMatch(/10\s*min a day/);
    click(/reading buddy home/i);
    click(/children’s corner/i);
    await heading(/set a reading time/i);
    radio(/^off/i);
    await waitFor(() => expect(clock()).not.toMatch(/10/));
    expect(clock()).toMatch(/not set/);
    radio("5 minutes");
    await waitFor(() => expect(clock()).toMatch(/5\s*min a day/));
  });

  it("Bring your own starts empty, separate from the main practice", async () => {
    // Main practice first, with its own passage
    await setUpMain({ text: "The grown-up’s passage." });
    click(/reading buddy home/i);
    click(/children’s corner/i);
    await heading(/set a reading time/i);
    click(/hand over to the reader/i);
    radio("Lilac");
    click(/next: pick a story/i);
    await heading(/where shall we go today/i);
    fireEvent.click(screen.getByRole("tab", { name: "Bring your own" }));
    await heading(/bring a story you love/i);
    expect((screen.getByLabelText("Your passage") as HTMLTextAreaElement).value).toBe("");
    fireEvent.click(screen.getByRole("tab", { name: "Photos of pages" }));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("How was reading? uses compact chips, opens a response only after a choice, and finds a shorter story", async () => {
    await toStories();
    fireEvent.click(screen.getByRole("button", { name: /jackal and the sun/i }));
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Read this story" }),
    );
    await heading(/your corner is ready/i);
    click(/open the story/i);
    click(/start recording/i);
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: /allow microphone/i }),
    );
    await screen.findAllByText("Recording");
    click(/i’ve finished/i);
    await heading(/you made time to read/i);
    expect(screen.queryByRole("dialog")).toBeNull();
    const chip = btn("A bit hard");
    expect(chip.className).toContain("min-h-12");
    fireEvent.click(chip);
    const d = await screen.findByRole("dialog", { name: /that’s okay/i });
    fireEvent.click(within(d).getByRole("button", { name: "Find a shorter story" }));
    await heading(/where shall we go today/i);
    expect(
      screen.getByRole("button", { name: /remove filter: shorter than jackal and the sun/i }),
    ).toBeTruthy();
  });
});

describe("sample", () => {
  it("walks three steps and shows one labelled sample note at a time", async () => {
    renderApp();
    await heading(/who’s reading today/i);
    click(/try a sample/i);
    await heading(/this is the reading screen/i);
    click(/next: listening back/i);
    await heading(/then you listen back/i);
    click(/next: sample notes/i);
    await heading(/notes buddy could offer/i);
    expect(screen.getByText("Sample · Note 1 of 6")).toBeTruthy();
    expect(screen.queryByRole("tablist")).toBeNull();
    click("Next note");
    expect(screen.getByText("Sample · Note 2 of 6")).toBeTruthy();
  });
});

describe("saved on this device", () => {
  it("deleting everything asks once, in plain words, with Cancel as the safe choice", async () => {
    await setUpMain();
    click("Saved on this device");
    await heading(/saved on this device/i);
    click(/delete all readings, recordings and notes/i);
    const d = await screen.findByRole("alertdialog", {
      name: /delete all readings, recordings and notes/i,
    });
    expect(d.textContent).toMatch(/can’t be undone/);
    expect(d.querySelector("[role=alert], .border")).toBeNull(); // no warning box inside the dialog
    expect(within(d).getByRole("button", { name: "Delete all" }).className).toContain("btn-danger");
    await waitFor(() =>
      expect(document.activeElement).toBe(within(d).getByRole("button", { name: "Cancel" })),
    );
  });

  it("deleting one reading is immediate, with Undo", async () => {
    await setUpMain();
    click("Saved on this device");
    await heading(/saved on this device/i);
    click(/^delete pasted passage$/i);
    const msg = await screen.findByText("“Pasted passage” deleted.");
    expect(screen.getAllByText(/nothing saved yet/i).length).toBeGreaterThan(0);
    fireEvent.click(within(msg.parentElement!).getByRole("button", { name: "Undo" }));
    expect(await screen.findByText("Pasted passage")).toBeTruthy();
  });
});

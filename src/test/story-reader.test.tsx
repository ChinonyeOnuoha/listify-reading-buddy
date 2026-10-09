import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { StoryReader } from "@/components/children/StoryReader";
import { getStory, loadStoryText } from "@/content/stories";

// Replace only the loader, so a failed download can be simulated and then recovered.
const load = vi.fn();
vi.mock("@/content/stories", async (orig) => ({
  ...(await orig<typeof import("@/content/stories")>()),
  loadStoryText: (s: string) => load(s),
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
const story = getStory("jackal-and-the-sun")!;
const text = {
  pages: [
    { paragraphs: ["Page one text."], image: "/stories/jackal-and-the-sun/p1.jpg" },
    { paragraphs: ["Page two text."], image: null },
  ],
};
beforeEach(() => load.mockReset());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks(); // spies on window.scrollBy etc. must not leak into the next test
});

describe("StoryReader failure handling", () => {
  it("explains a story that can't be opened, offers a retry, and recovers", async () => {
    load.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(text);
    render(<StoryReader story={story} textSize={1} onTextSize={() => {}} />);
    expect(screen.getByText("Opening the story…")).toBeTruthy();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/couldn’t be opened/);
    expect(screen.queryByRole("navigation", { name: "Pages" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Page one text.")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps the words when a picture fails to load", async () => {
    load.mockResolvedValue(text);
    const { container } = render(<StoryReader story={story} textSize={1} onTextSize={() => {}} />);
    await screen.findByText("Page one text.");
    fireEvent.error(container.querySelector("img")!);
    expect(await screen.findByText(/The picture couldn’t be loaded/)).toBeTruthy();
    expect(screen.getByText("Page one text.")).toBeTruthy(); // the story itself is untouched
  });

  it("turns pages and keeps the counter on one line; pictures are decorative", async () => {
    load.mockResolvedValue(text);
    const { container } = render(<StoryReader story={story} textSize={1} onTextSize={() => {}} />);
    await screen.findByText("Page one text.");
    expect(container.querySelector("img")!.getAttribute("alt")).toBe("");
    expect(screen.getByText("Page 1 of 2").className).toContain("whitespace-nowrap");
    expect(screen.getByRole("button", { name: "Previous page" }).hasAttribute("disabled")).toBe(
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Page two text.")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull(); // this page has no picture in the original edition
    expect(screen.getByRole("button", { name: "Next page" }).hasAttribute("disabled")).toBe(true);
  });

  it("announces text size changes and stops at the limits without losing focus", async () => {
    load.mockResolvedValue(text);
    const sizes: number[] = [];
    const { rerender } = render(
      <StoryReader story={story} textSize={0} onTextSize={(n) => sizes.push(n)} />,
    );
    await screen.findByText("Page one text.");
    const smaller = screen.getByRole("button", { name: "Make the text smaller" });
    expect(smaller.getAttribute("aria-disabled")).toBe("true");
    smaller.focus();
    fireEvent.click(smaller);
    expect(sizes).toEqual([]); // no change at the minimum
    expect(document.activeElement).toBe(smaller); // and it stays focusable
    fireEvent.click(screen.getByRole("button", { name: "Make the text larger" }));
    expect(sizes).toEqual([1]);
    rerender(<StoryReader story={story} textSize={1} onTextSize={(n) => sizes.push(n)} />);
    await waitFor(() =>
      expect(screen.getByRole("status", { hidden: true }).textContent).toBe("Text size 2 of 5"),
    );
  });
});

describe("real story modules", () => {
  it("each one loads through the manifest's own loader", async () => {
    const mod = await vi.importActual<typeof import("@/content/stories")>("@/content/stories");
    for (const s of mod.STORIES) expect((await mod.loadStoryText(s.slug)).pages.length).toBe(s.pageCount);
    expect(loadStoryText).toBeTypeOf("function");
  });
});

describe("descriptions, notes and picture-only pages", () => {
  const notesText = {
    pages: [
      { paragraphs: ["The story."], image: "/stories/sailing-ships-and-sinking-spoons/p1.jpg", alt: "Two boys sail paper boats." },
      { paragraphs: [], image: "/stories/sailing-ships-and-sinking-spoons/p2.jpg", alt: "A ship on the sea." },
      {
        heading: "What is Gravity?",
        paragraphs: ["Things fall."],
        image: null,
        extra: "Science notes",
      },
    ],
  };
  const notesStory = getStory("sailing-ships-and-sinking-spoons")!;

  it("describes each picture, and labels pages that come after the story so they are never mistaken for it", async () => {
    load.mockResolvedValue(notesText);
    const { container } = render(<StoryReader story={notesStory} textSize={1} onTextSize={() => {}} />);
    await screen.findByText("The story.");
    expect(container.querySelector("img")!.getAttribute("alt")).toBe("Two boys sail paper boats.");
    // the notes page is in the page (hidden until reached); the story page itself carries no label
    expect(screen.getByText(/after the story/).closest("[aria-hidden]")).not.toBeNull();
    expect(screen.getByText("The story.").closest("[aria-hidden]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next page" })); // picture-only page
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
    expect(container.querySelector("img")!.getAttribute("alt")).toBe("A ship on the sea.");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Science notes · after the story").closest("[aria-hidden]")).toBeNull();
    expect(screen.getByRole("heading", { name: "What is Gravity?", level: 2 })).toBeTruthy();
    expect(screen.getByText("Things fall.")).toBeTruthy();
  });

  it("keeps the picture slot and the controls in place on a picture-only page and on a notes page", async () => {
    load.mockResolvedValue(notesText);
    const { container } = render(<StoryReader story={notesStory} textSize={1} onTextSize={() => {}} />);
    await screen.findByText("The story.");
    const slots = () => [...container.querySelectorAll(".h-\\[clamp\\(11rem\\,32vh\\,20rem\\)\\]")];
    expect(slots()).toHaveLength(2); // a reserved slot on each story page; the written notes group has no pictures, so none
    const nav = screen.getByRole("navigation", { name: "Pages" });
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByRole("navigation", { name: "Pages" })).toBe(nav); // the same controls, not rebuilt
    expect(slots()).toHaveLength(2);
  });
});

const longText = {
  pages: [
    { paragraphs: ["One short line."], image: "/stories/jackal-and-the-sun/p1.jpg" },
    { paragraphs: ["A much longer page. ".repeat(40)], image: null },
    { paragraphs: ["Short again."], image: "/stories/jackal-and-the-sun/p3.jpg" },
  ],
};
/** Text that is on the visible page (pages that aren't current are kept in the layout but hidden from everyone). */
const visibleText = (t: RegExp | string) =>
  screen.queryAllByText(t).filter((el) => !el.closest("[aria-hidden='true']"));

describe("steady page turns", () => {
  it("keeps every page in one shared grid cell, so the reading area is as tall as the tallest page", async () => {
    load.mockResolvedValue(longText);
    const { container } = render(<StoryReader story={story} textSize={1} onTextSize={() => {}} />);
    await screen.findByText("One short line.");
    const cell = container.querySelector(".grid")!;
    const pages = [...cell.children] as HTMLElement[];
    expect(pages).toHaveLength(3);
    for (const p of pages) expect(p.className).toContain("col-start-1 row-start-1"); // all stacked in the same cell
    // only the current page is visible, and the others are hidden from keyboard and assistive technology
    expect(pages.map((p) => p.hasAttribute("inert"))).toEqual([false, true, true]);
    expect(pages.map((p) => p.getAttribute("aria-hidden"))).toEqual([null, "true", "true"]);
    expect(pages[1]!.className).toContain("invisible");
    expect(visibleText("One short line.")).toHaveLength(1);
    expect(visibleText(/A much longer page/)).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(visibleText(/A much longer page/)).toHaveLength(1);
    expect(visibleText("One short line.")).toHaveLength(0);
    // no height animation, no inner scrolling area
    expect(container.innerHTML).not.toMatch(
      /transition-\[height|animate-|overflow-y-(auto|scroll)|overflow-auto/,
    );
  });

  it("reserves the picture slot on every page, with or without a picture, and keeps it if the picture fails", async () => {
    load.mockResolvedValue(longText);
    const { container } = render(<StoryReader story={story} textSize={1} onTextSize={() => {}} />);
    await screen.findByText("One short line.");
    const slots = [...container.querySelectorAll(".grid > div")].map((p) =>
      p.querySelector("div.mb-4")!,
    );
    expect(slots.every((s) => s && s.className.includes("h-[clamp("))).toBe(true); // identical reserved height everywhere
    expect(slots.filter(Boolean)).toHaveLength(3);
    expect(container.querySelectorAll("img")).toHaveLength(1); // only the current page's picture is loaded
    const img = container.querySelector("img")!;
    expect(img.className).toContain("object-contain"); // whole picture, never cropped or stretched
    fireEvent.error(img);
    expect(await screen.findByText(/The picture couldn’t be loaded/)).toBeTruthy();
    expect(slots[0]!.className).toContain("h-[clamp("); // the area did not collapse
  });

  it("preloads the next and previous pictures", async () => {
    load.mockResolvedValue(longText);
    const created: string[] = [];
    const Real = window.Image;
    vi.stubGlobal(
      "Image",
      class {
        set src(v: string) {
          created.push(v);
        }
      },
    );
    render(<StoryReader story={story} textSize={1} onTextSize={() => {}} />);
    await screen.findByText("One short line.");
    fireEvent.click(screen.getByRole("button", { name: "Next page" })); // page 2 (no picture): neighbours are p1 and p3
    await waitFor(() => expect(created).toContain("/stories/jackal-and-the-sun/p3.jpg"));
    expect(created).toContain("/stories/jackal-and-the-sun/p1.jpg");
    vi.stubGlobal("Image", Real);
  });

  it("announces only the page number, never the passage", async () => {
    load.mockResolvedValue(longText);
    const { container } = render(<StoryReader story={story} textSize={1} onTextSize={() => {}} />);
    await screen.findByText("One short line.");
    const live = [...container.querySelectorAll("[aria-live]")];
    expect(live.map((l) => l.textContent)).toContain("Page 1 of 3");
    for (const l of live) expect(l.textContent).not.toMatch(/short line|longer page/i);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Page 2 of 3").getAttribute("aria-live")).toBe("polite");
  });

  it("keeps focus on the control used, and moves it to the neighbouring control when that one becomes unavailable", async () => {
    load.mockResolvedValue(longText);
    render(<StoryReader story={story} textSize={1} onTextSize={() => {}} />);
    await screen.findByText("One short line.");
    const next = screen.getByRole("button", { name: "Next page" });
    const prev = screen.getByRole("button", { name: "Previous page" });
    next.focus();
    fireEvent.click(next); // page 2: both controls available
    expect(document.activeElement).toBe(next);
    fireEvent.click(next); // page 3 (last): Next becomes unavailable → focus moves to Previous
    await waitFor(() => expect(document.activeElement).toBe(prev));
    expect(next.hasAttribute("disabled")).toBe(true);
    fireEvent.click(prev); // page 2
    expect(document.activeElement).toBe(prev);
    fireEvent.click(prev); // page 1 (first): Previous becomes unavailable → focus moves to Next
    await waitFor(() => expect(document.activeElement).toBe(next));
    expect(prev.hasAttribute("disabled")).toBe(true);
  });

  it("turning a page scrolls only when the start of the new page is out of view", async () => {
    load.mockResolvedValue(longText);
    const { container } = render(<StoryReader story={story} textSize={1} onTextSize={() => {}} />);
    await screen.findByText("One short line.");
    const area = container.querySelector(".scroll-mt-20")! as HTMLElement;
    const header = document.createElement("header");
    header.className = "sticky";
    header.getBoundingClientRect = () => ({ bottom: 64 }) as DOMRect;
    document.body.prepend(header);
    const scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
    const at = (top: number) => {
      area.getBoundingClientRect = () => ({ top }) as DOMRect;
    };

    at(150); // already comfortably in view
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(screen.getByText("Page 2 of 3")).toBeTruthy());
    expect(scrollBy).not.toHaveBeenCalled(); // no needless scroll

    at(-400); // the reader had scrolled down: the new page's start is above the screen
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(scrollBy).toHaveBeenCalledTimes(1));
    expect(scrollBy.mock.calls[0]![0]).toMatchObject({ top: -400 - 64 - 12, behavior: "auto" }); // lands just under the header, instantly
    header.remove();
  });

  it("opening and closing About this story changes nothing about the page or the scroll position", async () => {
    load.mockResolvedValue(longText);
    render(<StoryReader story={story} textSize={1} onTextSize={() => {}} />);
    await screen.findByText("One short line.");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
    const about = screen.getByRole("button", { name: "About this story" });
    fireEvent.click(about);
    const d = await screen.findByRole("dialog");
    fireEvent.click(within(d).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(about));
    expect(screen.getByText("Page 2 of 3")).toBeTruthy(); // same page
    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollBy).not.toHaveBeenCalled();
  });
});

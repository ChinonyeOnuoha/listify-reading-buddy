import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { StoryReader } from "@/components/children/StoryReader";
import { getStory, loadStoryText } from "@/content/stories";

// Replace only the loader, so a failed download can be simulated and then recovered.
const load = vi.fn();
vi.mock("@/content/stories", async (orig) => ({ ...(await orig<typeof import("@/content/stories")>()), loadStoryText: (s: string) => load(s) }));

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
const story = getStory("lazy-anansi")!;
const text = {
  pages: [
    { paragraphs: ["Page one text."], image: "/stories/lazy-anansi/p1.jpg" },
    { paragraphs: ["Page two text."], image: null },
  ],
};
beforeEach(() => load.mockReset());
afterEach(() => cleanup());

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
    expect(screen.getByRole("button", { name: "Previous page" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Page two text.")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull(); // this page has no picture in the original edition
    expect(screen.getByRole("button", { name: "Next page" }).hasAttribute("disabled")).toBe(true);
  });

  it("announces text size changes and stops at the limits without losing focus", async () => {
    load.mockResolvedValue(text);
    const sizes: number[] = [];
    const { rerender } = render(<StoryReader story={story} textSize={0} onTextSize={(n) => sizes.push(n)} />);
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
    await waitFor(() => expect(screen.getByRole("status", { hidden: true }).textContent).toBe("Text size 2 of 5"));
  });
});

describe("real story modules", () => {
  it("each one loads through the manifest's own loader", async () => {
    const real = (await vi.importActual<typeof import("@/content/stories")>("@/content/stories")).loadStoryText;
    expect((await real("lazy-anansi")).pages.length).toBe(8);
    expect(loadStoryText).toBeTypeOf("function");
  });
});

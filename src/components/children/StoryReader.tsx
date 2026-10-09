import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { loadStoryText, type StoryMeta, type StoryText } from "@/content/stories";
import { AboutStory } from "./AboutStory";
import { TEXT_SIZES } from "./useChildSession";

type Props = {
  story: StoryMeta;
  /** Index into TEXT_SIZES; kept by the session so it survives a trip to Review and back. */
  textSize: number;
  onTextSize: (i: number) => void;
  /** The page being read (0-based). The session passes it in so it survives a trip home and back; otherwise it is local. */
  page?: number;
  onPage?: (page: number) => void;
};

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; text: StoryText };

/**
 * One built-in story, a page at a time, built so that turning a page changes the words and the picture and nothing else.
 *
 * Why it doesn't jump:
 * - Every page sits in the SAME grid cell and only the current one is visible, so the reading area is always as tall as the
 *   tallest page at the current width and text size. The page counter and Previous/Next below it therefore never move
 *   (they are not below text of varying length), and neither does anything beneath them.
 * - The picture has a slot of fixed size, reserved before the image loads and kept if it fails or the page has no picture;
 *   the whole picture is shown (`object-contain`), never stretched or cropped.
 * - There is no inner scrolling: long text simply makes the area taller, and the page scrolls as usual.
 * - No height animation or sliding. Turning a page scrolls only if the start of the new page is out of view.
 * The text is real text (resizes, readable by assistive technology); pictures are decorative here.
 */
export function StoryReader({ story, textSize, onTextSize, page: controlled, onPage }: Props) {
  const [localPage, setLocalPage] = useState(0);
  const page = controlled ?? localPage;
  const setPage = (p: number) => (onPage ? onPage(p) : setLocalPage(p));
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [pictureFailed, setPictureFailed] = useState<Record<string, boolean>>({});
  const [announce, setAnnounce] = useState("");
  const area = useRef<HTMLDivElement>(null);
  const prevBtn = useRef<HTMLButtonElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const moved = useRef(false);
  const focusAfter = useRef<"prev" | "next" | null>(null);

  const fetchText = useCallback(() => {
    let cancelled = false;
    setLoad({ state: "loading" });
    loadStoryText(story.slug).then(
      (text) => !cancelled && setLoad({ state: "ready", text }),
      () => !cancelled && setLoad({ state: "error" }),
    );
    return () => {
      cancelled = true;
    };
  }, [story.slug]);
  useEffect(() => fetchText(), [fetchText]);

  const text = load.state === "ready" ? load.text : null;
  const total = text?.pages.length ?? story.pageCount;
  const current = Math.min(page, total - 1);
  // Pages printed after the story (notes, a game) are grouped apart from the story's own pages (see the render below).
  const extraStart = text?.pages.findIndex((p) => p.extra) ?? -1;
  const groupOf = (i: number) => (extraStart !== -1 && i >= extraStart ? 1 : 0);
  const activeGroup = groupOf(current);

  // Warm the pictures either side of the current page so a turn doesn't wait on the network.
  useEffect(() => {
    for (const i of [current + 1, current - 1]) {
      const img = text?.pages[i]?.image;
      if (img) new Image().src = img;
    }
  }, [text, current]);

  // After the reader turns a page: put focus somewhere sensible if the control they used just became unavailable, and
  // show the start of the new page only if it isn't already in view.
  useEffect(() => {
    if (!moved.current) return;
    if (focusAfter.current) {
      (focusAfter.current === "next" ? nextBtn : prevBtn).current?.focus({ preventScroll: true });
      focusAfter.current = null;
    }
    const el = area.current;
    if (!el) return;
    const headerBottom =
      document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
    const top = el.getBoundingClientRect().top;
    const startVisible = top >= headerBottom && top < window.innerHeight * 0.6;
    if (!startVisible) window.scrollBy({ top: top - headerBottom - 12, behavior: "auto" });
  }, [current]);

  const go = (to: number, via: "prev" | "next") => {
    moved.current = true;
    if (via === "prev" && to === 0) focusAfter.current = "next"; // Previous is about to become unavailable
    if (via === "next" && to === total - 1) focusAfter.current = "prev";
    setPage(to);
  };
  const size = (delta: -1 | 1) => {
    const next = Math.min(TEXT_SIZES.length - 1, Math.max(0, textSize + delta));
    if (next === textSize) return;
    onTextSize(next);
    setAnnounce(`Text size ${next + 1} of ${TEXT_SIZES.length}`);
  };

  const control =
    "btn-quiet min-h-11 min-w-11 justify-center px-2 text-lg font-semibold aria-disabled:pointer-events-none aria-disabled:opacity-45";

  return (
    <div>
      <h1
        id="child-h"
        tabIndex={-1}
        className="display-serif text-[1.75rem] leading-tight text-heading outline-none sm:text-[2rem]"
      >
        {story.title}
      </h1>

      <div
        role="toolbar"
        aria-label="Story text size"
        className="mt-1 mb-3 flex flex-wrap items-center gap-x-1 gap-y-0 sm:-ml-3"
      >
        <button
          type="button"
          className={control}
          aria-label="Make the text smaller"
          aria-disabled={textSize === 0}
          onClick={() => size(-1)}
        >
          <span aria-hidden className="text-base">
            A
          </span>
          <span aria-hidden className="-ml-1">
            −
          </span>
        </button>
        <button
          type="button"
          className={control}
          aria-label="Make the text larger"
          aria-disabled={textSize === TEXT_SIZES.length - 1}
          onClick={() => size(1)}
        >
          <span aria-hidden className="text-xl">
            A
          </span>
          <span aria-hidden className="-ml-1">
            +
          </span>
        </button>
        <AboutStory story={story} className="ml-auto" />
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      {load.state === "loading" && (
        <p className="flex items-center gap-2 py-10 text-muted-foreground" role="status">
          <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden /> Opening
          the story…
        </p>
      )}

      {load.state === "error" && (
        <div role="alert" className="rounded-2xl border border-border bg-tint p-4">
          <p className="font-medium">This story couldn’t be opened.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check your connection, then try again.
          </p>
          <button type="button" className="btn-secondary mt-3" onClick={() => void fetchText()}>
            Try again
          </button>
        </div>
      )}

      {text && (
        // `overflow-anchor: none` stops the browser nudging the scroll position when the visible page changes.
        <div ref={area} className="scroll-mt-20 [overflow-anchor:none]" lang="en">
          {/*
            The story's pages share one grid (one height); any pages printed after the story (notes, a game) share another, so
            a long notes page never makes every story page tall. The controls only move once, when the reader crosses from the
            story into those pages, and back.
          */}
          {[0, 1].map((group) => {
            // a group with no pictures at all (for example, written notes) reserves no picture slot
            const groupHasPictures = !!text.pages.some((p, i) => groupOf(i) === group && p.image);
            return (
            <div key={group} className={`grid ${activeGroup === group ? "" : "hidden"}`}>
            {text.pages.map((pg, i) => {
              if (groupOf(i) !== group) return null;
              const active = i === current;
              return (
                <div
                  key={i}
                  className={`col-start-1 row-start-1 ${active ? "" : "invisible"}`}
                  aria-hidden={active ? undefined : true}
                  inert={!active}
                >
                  {groupHasPictures && (
                    <div className="mb-4 flex h-[clamp(11rem,32vh,20rem)] items-center justify-center overflow-hidden rounded-2xl border border-border bg-white [@media(max-height:480px)]:h-[44vh]">
                      {active && pg.image ? (
                        pictureFailed[pg.image] ? (
                          <p className="px-4 text-center text-sm text-muted-foreground">
                            The picture couldn’t be loaded. The story is all here in words.
                          </p>
                        ) : (
                          <img
                            src={pg.image}
                            alt={pg.alt ?? ""}
                            decoding="async"
                            className="size-full object-contain"
                            onError={() => setPictureFailed((f) => ({ ...f, [pg.image!]: true }))}
                          />
                        )
                      ) : null}
                    </div>
                  )}
                  <div
                    style={{ fontSize: `${TEXT_SIZES[textSize]}rem` }}
                    className={`max-w-[65ch] space-y-4 leading-[1.7] ${pg.extra ? "border-l-4 border-apricot pl-4" : ""}`}
                  >
                    {/* Pages printed after the story (notes, a game) say so, so they are never mistaken for the story. */}
                    {pg.extra && (
                      <p className="!mt-0 text-[0.875rem] leading-snug font-medium text-muted-foreground">
                        {pg.extra} · after the story
                      </p>
                    )}
                    {pg.heading && (
                      <h2 className="display-serif !mt-2 text-[1.25em] leading-tight text-heading">
                        {pg.heading}
                      </h2>
                    )}
                    {pg.paragraphs.map((t, k) => (
                      <p key={k}>{t}</p>
                    ))}
                  </div>
                </div>
              );
            })}
            </div>
            );
          })}
        </div>
      )}

      {text && total > 1 && (
        <nav aria-label="Pages" className="mt-3 flex items-center justify-between gap-4">
          <button
            ref={prevBtn}
            className="btn-quiet min-h-11 min-w-11 justify-center px-2 sm:-ml-3 sm:px-3"
            disabled={current === 0}
            onClick={() => go(current - 1, "prev")}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-5 sm:size-4" aria-hidden />{" "}
            <span className="hidden sm:inline">Previous page</span>
          </button>
          {/* Announces only the page number (a polite live region); the passage itself is never read out automatically. */}
          <span className="text-sm whitespace-nowrap text-muted-foreground" aria-live="polite">
            Page {current + 1} of {total}
          </span>
          <button
            ref={nextBtn}
            className="btn-quiet min-h-11 min-w-11 justify-center px-2 sm:-mr-3 sm:px-3"
            disabled={current === total - 1}
            onClick={() => go(current + 1, "next")}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next page</span>{" "}
            <ChevronRight className="size-5 sm:size-4" aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}

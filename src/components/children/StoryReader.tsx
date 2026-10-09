import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { loadStoryText, type StoryMeta, type StoryText } from "@/content/stories";
import { AboutStory } from "./AboutStory";
import { TEXT_SIZES } from "./useChildSession";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Props = {
  story: StoryMeta;
  /** Index into TEXT_SIZES; kept by the session so it survives a trip to Review and back. */
  textSize: number;
  onTextSize: (i: number) => void;
};

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; text: StoryText };

/**
 * One built-in story, a page at a time. The text is real text (not part of a picture), so it resizes and can be read by
 * assistive technology; the pictures are decorative. Only the story text changes size — the controls stay put — and page
 * navigation, like the recording controls, stays available throughout.
 */
export function StoryReader({ story, textSize, onTextSize }: Props) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [page, setPage] = useState(0);
  const [pictureFailed, setPictureFailed] = useState<Record<string, boolean>>({});
  const [announce, setAnnounce] = useState("");
  const pageTop = useRef<HTMLDivElement>(null);
  const userMoved = useRef(false);

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
  const pg = text?.pages[current];

  // Warm the next picture so turning the page doesn't wait.
  useEffect(() => {
    const next = text?.pages[current + 1]?.image;
    if (next) new Image().src = next;
  }, [text, current]);

  // After the reader turns a page, bring the top of the new page into view (not on first load).
  useEffect(() => {
    if (!userMoved.current) return;
    pageTop.current?.scrollIntoView({
      block: "start",
      behavior: reducedMotion() ? "auto" : "smooth",
    });
  }, [current]);

  const go = (to: number) => {
    userMoved.current = true;
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

      <div ref={pageTop} className="scroll-mt-20" />

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

      {pg && (
        <div lang="en">
          {pg.image && (
            <div className="mb-4 flex h-[30vh] items-center justify-center overflow-hidden rounded-2xl border border-border bg-white sm:h-[32vh] [@media(max-height:480px)]:h-[44vh]">
              {pictureFailed[pg.image] ? (
                <p className="px-4 text-center text-sm text-muted-foreground">
                  The picture couldn’t be loaded. The story is all here in words.
                </p>
              ) : (
                <img
                  src={pg.image}
                  alt=""
                  decoding="async"
                  className="size-full object-contain"
                  onError={() => setPictureFailed((f) => ({ ...f, [pg.image!]: true }))}
                />
              )}
            </div>
          )}
          <div
            style={{ fontSize: `${TEXT_SIZES[textSize]}rem` }}
            className="max-w-[65ch] space-y-4 leading-[1.7]"
          >
            {pg.paragraphs.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
        </div>
      )}

      {text && total > 1 && (
        <nav aria-label="Pages" className="mt-3 flex items-center justify-between gap-4">
          <button
            className="btn-quiet min-h-11 min-w-11 justify-center px-2 sm:-ml-3 sm:px-3"
            disabled={current === 0}
            onClick={() => go(current - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-5 sm:size-4" aria-hidden />{" "}
            <span className="hidden sm:inline">Previous page</span>
          </button>
          <span className="text-sm whitespace-nowrap text-muted-foreground" aria-live="polite">
            Page {current + 1} of {total}
          </span>
          <button
            className="btn-quiet min-h-11 min-w-11 justify-center px-2 sm:-mr-3 sm:px-3"
            disabled={current === total - 1}
            onClick={() => go(current + 1)}
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

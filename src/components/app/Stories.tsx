import { useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { StoryCredits } from "@/components/children/StoryCredits";
import {
  SHORT_READ_MAX_WORDS,
  STORIES,
  THEME_LABEL,
  THEME_ORDER,
  getStory,
  lengthLabel,
  readingWords,
  wordsLine,
  type StoryMeta,
  type StoryTheme,
} from "@/content/stories";
import { Modal, ScreenTitle, StepHead } from "./ui";

/** A removable limit on the catalogue by length (word count), never a judgement of difficulty. */
export type LengthFilter = { kind: "shorter"; words: number; title: string } | { kind: "short" };

/** "Pick a story / Bring your own": the two ways to choose in the children's corner. */
export function KidTabs({
  tab,
  onTab,
}: {
  tab: "pick" | "own";
  onTab: (t: "pick" | "own") => void;
}) {
  return (
    <div role="tablist" aria-label="How would you like to choose?" className="segmented kid">
      <button type="button" role="tab" aria-selected={tab === "pick"} onClick={() => onTab("pick")}>
        Pick a story
      </button>
      <button type="button" role="tab" aria-selected={tab === "own"} onClick={() => onTab("own")}>
        Bring your own
      </button>
    </div>
  );
}

/** "Where shall we go today?": eight picture stories, filterable by theme, each opening a fixed-size story window. */
export function StoriesStep({
  editing,
  onBack,
  onTab,
  filter,
  onFilter,
  lengthFilter,
  onClearLength,
  onRead,
  notice,
}: {
  editing: boolean;
  onBack: () => void;
  onTab: (t: "pick" | "own") => void;
  filter: "all" | StoryTheme;
  onFilter: (f: "all" | StoryTheme) => void;
  lengthFilter: LengthFilter | null;
  onClearLength: () => void;
  onRead: (story: StoryMeta) => void;
  notice?: ReactNode;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [about, setAbout] = useState(false);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const returnRef = useRef<HTMLElement | null>(null);
  const lf = lengthFilter;
  const shown = STORIES.filter(
    (x) =>
      (filter === "all" || x.themes.includes(filter)) &&
      (!lf ||
        (lf.kind === "shorter"
          ? readingWords(x) < lf.words
          : readingWords(x) <= SHORT_READ_MAX_WORDS)),
  );
  const themes = THEME_ORDER.filter((t) => STORIES.some((x) => x.themes.includes(t)));
  const story = getStory(open);

  return (
    <>
      <div className="panel-body">
        <StepHead
          onBack={onBack}
          backLabel={editing ? "Back to your corner" : "Back"}
          step={editing ? undefined : 3}
          of={editing ? undefined : 3}
          name="Story"
        />
        <ScreenTitle kid>Where shall we go today?</ScreenTitle>
        <KidTabs tab="pick" onTab={onTab} />
        {notice}
        <div role="group" aria-label="Show stories" className="flex flex-wrap gap-2">
          {(["all", ...themes] as const).map((f) => (
            <button
              key={f}
              type="button"
              className="chip"
              aria-pressed={filter === f}
              onClick={() => onFilter(f)}
            >
              {f === "all" ? "All" : THEME_LABEL[f]}
            </button>
          ))}
          {lf && (
            <button
              type="button"
              className="chip"
              aria-pressed="true"
              aria-label={`Remove filter: ${lf.kind === "shorter" ? `shorter than ${lf.title}` : "short reads"}`}
              onClick={onClearLength}
            >
              {lf.kind === "shorter" ? `Shorter than “${lf.title}”` : "Short reads"}
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        {shown.length > 0 ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4">
            {shown.map((x) => (
              <li key={x.slug} className="flex">
                <button
                  ref={(el) => {
                    if (el) cardRefs.current.set(x.slug, el);
                    else cardRefs.current.delete(x.slug);
                  }}
                  type="button"
                  aria-haspopup="dialog"
                  className="group flex w-full flex-col gap-2 rounded-xl text-left"
                  onClick={() => {
                    returnRef.current = cardRefs.current.get(x.slug) ?? null;
                    setAbout(false);
                    setOpen(x.slug);
                  }}
                >
                  <span
                    className={`block aspect-square w-full overflow-hidden rounded-xl transition-transform duration-200 group-hover:-translate-y-0.5 ${x.cardFit === "contain" ? "bg-white" : "bg-raised"}`}
                  >
                    <img
                      src={x.cardImage}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width={480}
                      height={480}
                      className={`size-full ${x.cardFit === "contain" ? "object-contain" : "object-cover"}`}
                    />
                  </span>
                  <span className="kid text-[0.9375rem] leading-snug font-bold">{x.title}</span>
                  <span className="mt-auto text-[0.8125rem] text-muted-foreground">
                    {lengthLabel(readingWords(x)).replace(" read", "").replace(" story", "")} ·{" "}
                    {readingWords(x)} words
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div role="status" className="rounded-2xl bg-raised p-5">
            <p className="kid text-lg font-bold">
              {lf?.kind === "shorter"
                ? `There isn’t a shorter story than “${lf.title}” here yet.`
                : "No stories match these choices."}
            </p>
            <p className="mt-1 text-muted-foreground">The whole collection is still here.</p>
            <button
              type="button"
              className="btn-secondary mt-4"
              onClick={() => {
                onClearLength();
                onFilter("all");
              }}
            >
              Show all stories
            </button>
          </div>
        )}
        {lf?.kind === "short" && (
          <p className="text-sm text-muted-foreground">
            Short reads are stories of up to {SHORT_READ_MAX_WORDS} words. That describes length,
            not difficulty.
          </p>
        )}
      </div>

      {/* One fixed-size window. Story and About this book share the same space and crossfade, so it never resizes. */}
      <Modal
        open={!!story}
        onClose={() => setOpen(null)}
        title={<span className="kid">{story?.title}</span>}
        returnFocus={returnRef}
        className="h-[min(620px,calc(100dvh-3rem))] max-wide:h-[min(660px,92dvh)]"
      >
        {story && (
          <>
            <div role="tablist" aria-label="Story details" className="segmented">
              <button
                type="button"
                role="tab"
                aria-selected={!about}
                onClick={() => setAbout(false)}
              >
                Story
              </button>
              <button type="button" role="tab" aria-selected={about} onClick={() => setAbout(true)}>
                About this book
              </button>
            </div>
            <div className="stack min-h-0 flex-1">
              <div
                data-off={about}
                aria-hidden={about}
                inert={about}
                className="flex min-h-0 flex-col gap-3"
              >
                <span
                  className={`block h-48 w-full shrink-0 overflow-hidden rounded-2xl ${story.cardFit === "contain" ? "bg-white" : "bg-raised"}`}
                >
                  <img
                    src={story.cardImage}
                    alt=""
                    className={`size-full ${story.cardFit === "contain" ? "object-contain" : "object-cover"}`}
                  />
                </span>
                <p className="kid text-lg leading-normal">{story.summary}</p>
                <p className="text-sm text-muted-foreground">
                  {lengthLabel(readingWords(story))} · {wordsLine(story)} · {story.pageCount} pages
                </p>
              </div>
              <div
                data-off={!about}
                aria-hidden={!about}
                inert={!about}
                className="min-h-0 overflow-y-auto overscroll-contain pr-1"
              >
                <StoryCredits story={story} />
              </div>
            </div>
            <button
              type="button"
              className="btn-primary kid w-full"
              onClick={() => {
                const st = story;
                setOpen(null);
                // Start once the window has closed, so it never unmounts mid-close.
                window.setTimeout(() => onRead(st), 0);
              }}
            >
              Read this story
            </button>
          </>
        )}
      </Modal>
    </>
  );
}

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Headphones, X } from "lucide-react";
import { Companion } from "@/components/reading/Companion";
import { ConfirmInline } from "@/components/reading/ConfirmInline";
import { ContinueBar } from "@/components/reading/ContinueBar";
import { PrepareStep } from "@/components/reading/PrepareStep";
import {
  CATEGORY_LABEL,
  SHORT_READ_MAX_WORDS,
  STORIES,
  getStory,
  lengthLabel,
  type StoryMeta,
} from "@/content/stories";
import { StoryModal } from "./StoryModal";
import { sameSource, type ChildSession, type ChildSource, type ChildTab } from "./useChildSession";

const pauseAllAudio = () => document.querySelectorAll("audio").forEach((a) => a.pause());

const TABS: { id: ChildTab; label: string }[] = [
  { id: "pick", label: "Pick a story" },
  { id: "own", label: "Bring your own" },
];

/** A recording of something is being kept; say what, in the child's words. */
const nameOf = (source: ChildSource | null) => {
  if (source?.kind === "story") return `“${getStory(source.slug)?.title ?? "your story"}”`;
  return "your own story";
};

/**
 * Every card in a row is the same height: the picture area has a fixed shape, the title takes the room it needs (long titles
 * wrap in full, never truncated) and the length line is pinned to the bottom so the metadata lines up across a row.
 */
function StoryCard({
  story,
  onOpen,
  setRef,
}: {
  story: StoryMeta;
  onOpen: () => void;
  setRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <li className="flex">
      <button
        ref={setRef}
        type="button"
        aria-haspopup="dialog"
        onClick={onOpen}
        className="tile h-full w-full flex-col items-stretch gap-2 p-2.5 text-left"
      >
        <span
          className={`relative block aspect-[4/3] shrink-0 overflow-hidden rounded-xl ${story.cardFit === "contain" ? "bg-white" : "bg-tint"}`}
        >
          <img
            src={story.cardImage}
            alt=""
            loading="lazy"
            decoding="async"
            width={480}
            height={360}
            className={`size-full ${story.cardFit === "contain" ? "object-contain" : "object-cover"}`}
          />
        </span>
        <span className="flex flex-1 flex-col px-1 pb-1">
          <span className="display-serif block text-[1.0625rem] leading-snug">{story.title}</span>
          <span className="mt-auto block pt-1 text-sm text-muted-foreground">
            {lengthLabel(story.words)} · {story.words} words
          </span>
        </span>
      </button>
    </li>
  );
}

type Props = { s: ChildSession; onReserveBar: (px: number) => void };

/** "Where shall we go today?": pick a built-in story, or bring one you love. */
export function ChooseScreen({ s, onReserveBar }: Props) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const cardRefs = useRef(new Map<string, HTMLButtonElement>());
  const [confirm, setConfirm] = useState<ChildSource | null>(null);
  // Starting a story leaves this screen, so it waits until the modal has fully closed (see `begin`).
  const [starting, setStarting] = useState<ChildSource | null>(null);

  const lf = s.lengthFilter;
  const shown = STORIES.filter(
    (x) =>
      (s.filter === "all" || x.category === s.filter) &&
      (!lf || (lf.kind === "shorter" ? x.words < lf.words : x.words <= SHORT_READ_MAX_WORDS)),
  );
  const open = getStory(s.previewSlug);
  const kept = s.rec.take;

  // Choosing a different thing to read replaces the kept recording, so that is always the child's clear choice.
  const start = (next: ChildSource) => {
    if (kept && !sameSource(s.source, next)) return setConfirm(next);
    begin(next);
  };
  /**
   * Close any open modal first and start reading only after it has closed: navigating away while it is still open would
   * unmount it abruptly and leave the page locked (pointer events switched off on the body).
   */
  const begin = (next: ChildSource) => {
    setConfirm(null);
    s.setPreviewSlug(null);
    setStarting(next);
  };
  useEffect(() => {
    if (!starting || s.previewSlug) return;
    const next = starting;
    setStarting(null);
    s.begin(next);
  }, [starting, s]);
  const openStory = (slug: string) => {
    pauseAllAudio(); // opening a preview never leaves playback running, and closing it never resumes anything
    setConfirm(null);
    s.setPreviewSlug(slug);
  };
  const closeStory = () => {
    setConfirm(null);
    s.setPreviewSlug(null);
  };
  const clearFilters = () => {
    s.setLengthFilter(null);
    s.setFilter("all");
  };

  const onTabKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = (i + d + TABS.length) % TABS.length;
    s.setTab(TABS[next]!.id);
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <header
        className={`relative text-left sm:text-center ${s.tab === "pick" ? "pr-16 sm:pr-0" : ""}`}
      >
        {s.tab === "pick" && (
          <Companion pose="wave" interactive className="absolute top-0 right-0 w-12 sm:w-14" />
        )}
        <h1
          id="child-h"
          tabIndex={-1}
          className="display-serif text-[1.875rem] text-balance text-heading outline-none sm:text-[2.5rem]"
        >
          Where shall we <em>go</em> today?
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">Pick a story, or bring one you love.</p>
      </header>

      {kept && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-border bg-card px-4 py-2 text-sm">
          <span>Your recording of {nameOf(s.source)} is saved for now.</span>
          <button
            type="button"
            className="text-link inline-flex min-h-11 items-center gap-1.5"
            onClick={() => s.setView("review")}
          >
            <Headphones className="size-4" aria-hidden /> Listen back
          </button>
        </p>
      )}

      <div
        role="tablist"
        aria-label="How would you like to choose?"
        className="mx-auto grid w-full max-w-md grid-cols-2 gap-1 rounded-2xl bg-muted p-1"
      >
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            id={`child-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={s.tab === t.id}
            aria-controls={`child-panel-${t.id}`}
            tabIndex={s.tab === t.id ? 0 : -1}
            onClick={() => s.setTab(t.id)}
            onKeyDown={(e) => onTabKey(e, i)}
            className={`min-h-12 rounded-xl px-3 py-2 text-center font-medium transition-colors ${
              s.tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-tint"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {s.tab === "pick" ? (
        <div
          id="child-panel-pick"
          role="tabpanel"
          aria-labelledby="child-tab-pick"
          className="flex flex-col gap-4 lg:gap-6"
        >
          <div className="flex flex-wrap items-center gap-2 sm:justify-center">
            <div role="group" aria-label="Show stories" className="flex flex-wrap gap-2">
              {(["all", "folktale", "real"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={s.filter === f}
                  onClick={() => s.setFilter(f)}
                  className={`min-h-11 rounded-xl border px-4 text-sm font-medium transition-colors ${
                    s.filter === f
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-line bg-card text-foreground hover:border-primary hover:bg-tint"
                  }`}
                >
                  {f === "all" ? "All" : CATEGORY_LABEL[f]}
                </button>
              ))}
            </div>
            {lf && (
              // A clearly indicated, removable length filter. It describes length only; shorter is not "easier".
              <button
                type="button"
                onClick={() => s.setLengthFilter(null)}
                aria-label={`Remove filter: ${lf.kind === "shorter" ? `shorter than ${lf.title}` : "short reads"}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary bg-apricot-tint px-3 text-sm font-medium text-foreground hover:bg-tint"
              >
                {lf.kind === "shorter" ? `Shorter than “${lf.title}”` : "Short reads"}
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
          {lf?.kind === "short" && (
            <p className="text-center text-sm text-muted-foreground">
              Short reads are stories of up to {SHORT_READ_MAX_WORDS} words. That describes length,
              not difficulty.
            </p>
          )}

          {shown.length > 0 ? (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] sm:gap-4">
              {shown.map((story) => (
                <StoryCard
                  key={story.slug}
                  story={story}
                  onOpen={() => openStory(story.slug)}
                  setRef={(el) => {
                    if (el) cardRefs.current.set(story.slug, el);
                    else cardRefs.current.delete(story.slug);
                  }}
                />
              ))}
            </ul>
          ) : (
            <div role="status" className="card mx-auto w-full max-w-lg text-center">
              <p className="display-serif text-[1.25rem]">
                {lf?.kind === "shorter"
                  ? `There isn’t a shorter story than “${lf.title}” in this collection yet.`
                  : "No stories match these choices."}
              </p>
              <p className="mt-1 text-muted-foreground">The whole collection is still here.</p>
              <button type="button" className="btn-primary btn-pill mt-4" onClick={clearFilters}>
                Show all stories
              </button>
            </div>
          )}
          {shown.length > 0 && (
            <p className="text-center text-muted-foreground">
              Choose a cover to have a look inside.
            </p>
          )}
        </div>
      ) : (
        <div
          id="child-panel-own"
          role="tabpanel"
          aria-labelledby="child-tab-own"
          className="flex flex-col gap-2"
        >
          <h2 className="display-serif text-[1.5rem] leading-tight">Bring a story you love.</h2>
          {/* The extra room below keeps the peeking companion (above the card) clear of this line. */}
          <p className="mb-3 text-muted-foreground">Paste a passage or add photos of your pages.</p>
          {confirm?.kind === "own" && (
            <ConfirmInline
              className="mt-2"
              message={`Read your own story? Your recording of ${nameOf(s.source)} will be replaced.`}
              confirmLabel="Replace and read"
              cancelLabel="Keep my recording"
              onConfirm={() => begin(confirm)}
              onCancel={() => setConfirm(null)}
            />
          )}
          <PrepareStep
            mode={s.mode}
            onSelectMode={s.selectMode}
            text={s.text}
            setText={s.setText}
            images={s.images}
            setImages={s.setImages}
            collapsed={s.collapsed}
            changing={s.changing}
            onChangeContent={() => {
              s.modeAtChange.current = s.mode;
              s.setChanging(true);
            }}
            onCancelChange={() => {
              s.setMode(s.modeAtChange.current);
              s.setChanging(false);
            }}
            onPasteCommit={s.commitPaste}
            onPagesAdded={() => s.setChanging(false)}
            generation={s.generation}
            isCurrentSession={s.isCurrent}
            copy={{
              title: "How would you like to add it?",
              pasteHint: "Add a passage from your book.",
              uploadHint: "Add photos of your pages.",
            }}
          />
          {s.canContinue && (
            <ContinueBar onContinue={() => start({ kind: "own" })} onReserve={onReserveBar} />
          )}
        </div>
      )}

      <StoryModal
        story={open}
        onClose={closeStory}
        onRead={(story) => start({ kind: "story", slug: story.slug })}
        replacing={
          open && confirm?.kind === "story" && confirm.slug === open.slug
            ? {
                message: `Start “${open.title}”? Your recording of ${nameOf(s.source)} will be replaced.`,
              }
            : null
        }
        onConfirmReplace={() => {
          if (confirm) begin(confirm);
        }}
        onCancelReplace={() => setConfirm(null)}
        returnFocus={(slug) => cardRefs.current.get(slug)?.focus({ preventScroll: true })}
      />
    </>
  );
}

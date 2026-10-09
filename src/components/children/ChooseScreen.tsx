import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Check, Headphones } from "lucide-react";
import { Companion } from "@/components/reading/Companion";
import { ConfirmInline } from "@/components/reading/ConfirmInline";
import { ContinueBar } from "@/components/reading/ContinueBar";
import { PrepareStep } from "@/components/reading/PrepareStep";
import { CATEGORY_LABEL, STORIES, getStory, lengthLabel, type StoryMeta } from "@/content/stories";
import { AboutStory } from "./AboutStory";
import { sameSource, type ChildSession, type ChildSource, type ChildTab } from "./useChildSession";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const TABS: { id: ChildTab; label: string; hint?: string }[] = [
  { id: "pick", label: "Pick a story" },
  { id: "own", label: "Bring your own", hint: "Paste text or add page photos" },
];

/** A recording of something is being kept; say what, in the child's words. */
const nameOf = (source: ChildSource | null) => {
  if (source?.kind === "story") return `“${getStory(source.slug)?.title ?? "your story"}”`;
  return "your own story";
};

function StoryCard({
  story,
  selected,
  onSelect,
}: {
  story: StoryMeta;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="tile relative flex-col items-stretch gap-2 p-2.5 text-left"
      >
        <span
          className={`relative block aspect-[4/3] overflow-hidden rounded-xl ${story.cardFit === "contain" ? "bg-white" : "bg-tint"}`}
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
        <span className="block px-1 pb-1">
          <span className="display-serif block text-[1.0625rem] leading-snug">{story.title}</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {lengthLabel(story.words)} · {story.words} words
          </span>
        </span>
        {selected && (
          <span className="absolute top-4 right-4 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" strokeWidth={3} aria-hidden />
          </span>
        )}
      </button>
    </li>
  );
}

type Props = { s: ChildSession; onReserveBar: (px: number) => void };

/** "Where shall we go today?": pick a built-in story, or bring one you love. */
export function ChooseScreen({ s, onReserveBar }: Props) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const previewRef = useRef<HTMLElement>(null);
  const [confirm, setConfirm] = useState<ChildSource | null>(null);

  const shown = STORIES.filter((x) => s.filter === "all" || x.category === s.filter);
  const selected = getStory(s.previewSlug);
  const kept = s.rec.take;

  // Choosing a different thing to read replaces the kept recording, so that is always the child's clear choice.
  const start = (next: ChildSource) => {
    if (kept && !sameSource(s.source, next)) return setConfirm(next);
    s.begin(next);
  };

  // A newly selected cover brings its preview into view and moves focus to it, without any sound or auto-start.
  useEffect(() => {
    if (!selected) return;
    const el = previewRef.current;
    if (!el) return;
    el.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
  }, [selected?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <div
            role="group"
            aria-label="Show stories"
            className="flex flex-wrap gap-2 sm:justify-center"
          >
            {(["all", "folktale", "real"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={s.filter === f}
                onClick={() => {
                  s.setFilter(f);
                  if (selected && f !== "all" && selected.category !== f) s.setPreviewSlug(null);
                }}
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

          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {shown.map((story) => (
              <StoryCard
                key={story.slug}
                story={story}
                selected={story.slug === selected?.slug}
                onSelect={() => {
                  s.setPreviewSlug(story.slug);
                  setConfirm(null);
                }}
              />
            ))}
          </ul>

          {selected ? (
            <section ref={previewRef} aria-labelledby="preview-h" className="card reveal">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                <img
                  src={selected.cardImage}
                  alt=""
                  width={480}
                  height={360}
                  decoding="async"
                  className={`hidden aspect-[4/3] w-44 shrink-0 rounded-2xl sm:block ${
                    selected.cardFit === "contain" ? "bg-white object-contain" : "object-cover"
                  }`}
                />
                <div className="min-w-0">
                  <h2
                    id="preview-h"
                    tabIndex={-1}
                    className="display-serif text-[1.5rem] leading-tight outline-none"
                  >
                    {selected.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lengthLabel(selected.words)} · {selected.words} words · {selected.pageCount}{" "}
                    pages
                  </p>
                  <p className="mt-3">{selected.summary}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    By {selected.credit.author} · Illustrated by {selected.credit.illustrator} ·{" "}
                    {selected.credit.licence} · {selected.credit.sourceName}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1">
                    <button
                      type="button"
                      className="btn-primary btn-pill"
                      onClick={() => start({ kind: "story", slug: selected.slug })}
                    >
                      Read this story <ArrowRight className="size-[18px]" aria-hidden />
                    </button>
                    <AboutStory story={selected} />
                  </div>
                  {confirm?.kind === "story" && confirm.slug === selected.slug && (
                    <ConfirmInline
                      className="mt-4"
                      message={`Start “${selected.title}”? Your recording of ${nameOf(s.source)} will be replaced.`}
                      confirmLabel="Replace and read"
                      cancelLabel="Keep my recording"
                      onConfirm={() => {
                        setConfirm(null);
                        s.begin(confirm);
                      }}
                      onCancel={() => setConfirm(null)}
                    />
                  )}
                </div>
              </div>
            </section>
          ) : (
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
              onConfirm={() => {
                setConfirm(null);
                s.begin(confirm);
              }}
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
    </>
  );
}

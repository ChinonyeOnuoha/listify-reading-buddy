import { useCallback, useEffect, useRef, useState } from "react";
import type { InputMode, PageImage } from "@/components/reading/PrepareStep";
import { useRecorder } from "@/components/reading/useRecorder";
import type { StoryCategory } from "@/content/stories";

export type ChildView = "choose" | "read" | "review";
export type ChildTab = "pick" | "own";
/** The child's own impression, kept only in this session: never an assessment, never sent anywhere. */
export type Reflection = "easy" | "hard" | "unsure";
/** A removable limit on the catalogue by length (word count), set from the reflection answers. Never a judgement of difficulty. */
export type LengthFilter = { kind: "shorter"; words: number; title: string } | { kind: "short" };
/** What is being (or was last) read: a built-in story, or the child's own pasted text or page photos. */
export type ChildSource = { kind: "story"; slug: string } | { kind: "own" };

export const TEXT_SIZES = [1.125, 1.3125, 1.5, 1.75, 2] as const;
export const DEFAULT_TEXT_SIZE = 1;

export const sameSource = (a: ChildSource | null, b: ChildSource | null) =>
  !!a && !!b && a.kind === b.kind && (a.kind === "own" || (b.kind === "story" && a.slug === b.slug));

/**
 * The children's corner session. It lives in the page (so it survives visiting the main welcome screen) but shares nothing
 * with the adult session: its own recorder, its own content, its own review state. Everything is in this tab's memory.
 */
export function useChildSession() {
  const [view, setView] = useState<ChildView>("choose");
  const [tab, setTab] = useState<ChildTab>("pick");
  const [filter, setFilter] = useState<"all" | StoryCategory>("all");
  const [lengthFilter, setLengthFilter] = useState<LengthFilter | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [source, setSource] = useState<ChildSource | null>(null);
  const [textSize, setTextSize] = useState(DEFAULT_TEXT_SIZE);
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [reviewPos, setReviewPos] = useState(0);
  /** The page being read (stories and the child's own pages), kept so Continue from the welcome screen returns to it. */
  const [readPage, setReadPage] = useState(0);

  // The child's own content (same rules as the adult flow's: both drafts are kept when switching).
  const [mode, setMode] = useState<InputMode>(null);
  const [text, setText] = useState("");
  const [images, setImages] = useState<PageImage[]>([]);
  const [pasteDone, setPasteDone] = useState(false);
  const [changing, setChanging] = useState(false);
  const modeAtChange = useRef<InputMode>(null);
  const textRef = useRef(text);
  textRef.current = text;

  const rec = useRecorder(() => setView("review"));

  // Bumped on discard so uploads still decoding can't bring discarded pages back.
  const gen = useRef(0);
  const isCurrent = useCallback((g: number) => g === gen.current, []);

  useEffect(() => {
    if (!text.trim()) setPasteDone(false);
  }, [text]);
  useEffect(() => setReviewPos(0), [rec.take?.url]);

  const readyFor = (m: InputMode) =>
    (m === "upload" && images.length > 0) || (m === "paste" && !!text.trim() && pasteDone);
  const contentReady = readyFor(mode);
  const collapsed = contentReady && !changing;
  const canContinue =
    (mode === "paste" && text.trim().length > 0) || (mode === "upload" && images.length > 0);

  const hasOwnContent = !!text.trim() || images.length > 0;
  const hasSession = source !== null || hasOwnContent || !!rec.take || rec.unfinished;

  const selectMode = (m: Exclude<InputMode, null>) => {
    setMode(m);
    if (changing && readyFor(m)) setChanging(false);
  };
  const commitPaste = () => {
    if (!textRef.current.trim()) return;
    setPasteDone(true);
    setChanging(false);
  };

  /**
   * Begin reading a source. Reading the same thing again keeps its recording; reading something else starts a fresh reading
   * and clears the previous recording, so callers confirm with the child before calling this when a recording exists.
   */
  const begin = (next: ChildSource) => {
    if (!sameSource(source, next)) {
      rec.clear();
      setReflection(null);
      setReviewPos(0);
      setReadPage(0);
    }
    setSource(next);
    setView("read");
  };

  /** Throw away this session only. The adult session is a different object and is never touched here. */
  const discard = () => {
    gen.current += 1;
    rec.discard(); // stops any recording without keeping it, releases the microphone, ignores late callbacks
    images.forEach((i) => URL.revokeObjectURL(i.url));
    setImages([]);
    setText("");
    setMode(null);
    setPasteDone(false);
    setChanging(false);
    setSource(null);
    setPreviewSlug(null);
    setReflection(null);
    setReviewPos(0);
    setReadPage(0);
    setTextSize(DEFAULT_TEXT_SIZE);
    setTab("pick");
    setFilter("all");
    setLengthFilter(null);
    setView("choose");
  };

  return {
    view,
    setView,
    tab,
    setTab,
    filter,
    setFilter,
    lengthFilter,
    setLengthFilter,
    previewSlug,
    setPreviewSlug,
    source,
    textSize,
    setTextSize,
    reflection,
    setReflection,
    reviewPos,
    setReviewPos,
    readPage,
    setReadPage,
    mode,
    text,
    setText,
    images,
    setImages,
    changing,
    setChanging,
    modeAtChange,
    contentReady,
    collapsed,
    canContinue,
    selectMode,
    commitPaste,
    generation: gen.current,
    isCurrent,
    rec,
    hasSession,
    begin,
    discard,
    setMode,
  };
}

export type ChildSession = ReturnType<typeof useChildSession>;

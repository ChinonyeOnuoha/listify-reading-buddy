import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Info,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { loadPage, type ReadingSession } from "@/lib/reading-session";
import { Modal, ScreenTitle, StepHead } from "./ui";

type Props = {
  s: ReadingSession;
  kid: boolean;
  editing: boolean;
  step: number;
  title: string;
  lead: string;
  /** The children's corner shows "Pick a story / Bring your own" above. */
  tabs?: ReactNode;
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
  onRemovePage: (index: number) => void;
  onSound: (cue: "pages") => void;
};

/**
 * Paste a passage, or add photos of pages. Pages sit in a strip of fixed-size thumbnails that scrolls sideways inside the
 * panel, so adding pages never makes the panel or the scene grow. Tap a page to select it, then move it with Earlier and
 * Later (or drag it); ⋯ holds Add the words, Replace photo and Remove page. Each move is announced.
 */
export function BringStep(p: Props) {
  const { s } = p;
  const [failed, setFailed] = useState<string[]>([]);
  const [sel, setSel] = useState(0);
  const [live, setLive] = useState("");
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [wordsFor, setWordsFor] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const addRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const pages = s.pages;
  const current = Math.min(sel, Math.max(0, pages.length - 1));

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    const gen = s.generation;
    const loaded = await Promise.all(list.map(loadPage));
    const ok = loaded.filter((x): x is NonNullable<typeof x> => !!x);
    if (!s.isCurrent(gen)) return ok.forEach((x) => URL.revokeObjectURL(x.url));
    setFailed(list.filter((_, i) => !loaded[i]).map((f) => f.name));
    if (!ok.length) return;
    const start = pages.length;
    s.setPages((prev) => [...prev, ...ok]);
    setSel(start);
    setLive(`${ok.length} ${ok.length === 1 ? "page" : "pages"} added.`);
    p.onSound("pages");
    requestAnimationFrame(() => {
      const el = stripRef.current?.children[start] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= pages.length || from === to) return;
    s.setPages((prev) => {
      const next = [...prev];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m!);
      return next;
    });
    setSel(to);
    setLive(`Page ${from + 1} moved to position ${to + 1} of ${pages.length}.`);
  };
  const replace = async (f?: File) => {
    if (!f) return;
    const gen = s.generation;
    const page = await loadPage(f);
    if (!s.isCurrent(gen)) return page && URL.revokeObjectURL(page.url);
    if (!page) return setFailed([f.name]);
    setFailed([]);
    const old = pages[current];
    if (old) URL.revokeObjectURL(old.url);
    s.setPages((prev) =>
      prev.map((x, i) => (i === current ? { ...page, id: x.id, words: x.words } : x)),
    );
    setLive(`Photo replaced for page ${current + 1}.`);
  };

  const setMode = (m: "paste" | "upload") => s.setMode(m);
  // One of the two ways is always showing; pasting is the default.
  useEffect(() => {
    if (s.loaded && !s.mode) s.setMode("paste");
  }, [s.loaded, s.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="panel-body">
        <StepHead
          onBack={p.onBack}
          backLabel={p.editing ? "Back to your nook" : "Back"}
          step={p.editing ? undefined : p.step}
          of={p.editing ? undefined : 3}
          name={p.kid ? "Story" : "Your reading"}
        />
        <ScreenTitle kid={p.kid}>{p.title}</ScreenTitle>
        {p.tabs}
        <p className="lead">{p.lead}</p>
        <div role="tablist" aria-label="How would you like to add it?" className="segmented">
          <button
            type="button"
            role="tab"
            aria-selected={s.mode === "paste"}
            onClick={() => setMode("paste")}
          >
            Paste text
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={s.mode === "upload"}
            onClick={() => setMode("upload")}
          >
            Photos of pages
          </button>
        </div>

        {s.mode === "paste" && (
          <div className="flex flex-col gap-2">
            <label htmlFor="passage" className="sr-only">
              Your passage
            </label>
            <textarea
              id="passage"
              value={s.text}
              onChange={(e) => s.setText(e.target.value.slice(0, 10000))}
              placeholder="Paste or type the words you want to read aloud"
              className="field h-52 resize-none text-base"
            />
            {!s.text && typeof navigator !== "undefined" && navigator.clipboard?.readText && (
              <button
                type="button"
                className="btn-secondary self-start"
                onClick={async () => {
                  try {
                    const t = await navigator.clipboard.readText();
                    if (t) s.setText(t.slice(0, 10000));
                  } catch {
                    // The browser said no; the field still takes a normal paste.
                  }
                }}
              >
                <ClipboardPaste className="size-[18px]" aria-hidden /> Paste from clipboard
              </button>
            )}
          </div>
        )}

        {s.mode === "upload" && (
          <div className="flex flex-col gap-3">
            {pages.length === 0 ? (
              <button
                type="button"
                className="flex h-40 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-line/60 font-semibold"
                onClick={() => addRef.current?.click()}
              >
                <Plus className="size-7" aria-hidden />
                Add photos or screenshots
                <span className="text-sm font-normal text-muted-foreground">
                  You can add more and reorder them after.
                </span>
              </button>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <strong>
                    {pages.length} {pages.length === 1 ? "page" : "pages"}
                  </strong>
                  <span className="text-sm text-muted-foreground">
                    Tap a page, then move it. Or drag.
                  </span>
                </div>
                {/* The strip scrolls sideways inside the panel; the fade at the edge shows there is more. */}
                <div className="relative -mx-1 min-w-0">
                  <div
                    ref={stripRef}
                    role="listbox"
                    aria-label="Your pages, in reading order"
                    className="flex snap-x gap-2.5 overflow-x-auto overscroll-x-contain px-1.5 pt-1.5 pr-7 pb-2.5 [scrollbar-color:var(--selected)_transparent] [scrollbar-width:thin]"
                  >
                    {pages.map((pg, i) => (
                      <button
                        key={pg.id}
                        type="button"
                        role="option"
                        aria-selected={i === current}
                        aria-label={`Page ${i + 1}${pg.words ? ", words added" : ""}`}
                        draggable
                        onClick={() => setSel(i)}
                        onDragStart={(e: DragEvent) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", String(i));
                          setDrag(i);
                          setSel(i);
                        }}
                        onDragEnd={() => {
                          setDrag(null);
                          setOver(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (over !== i) setOver(i);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (drag !== null) move(drag, i);
                          setDrag(null);
                          setOver(null);
                        }}
                        className={`relative h-[108px] w-[84px] shrink-0 cursor-grab snap-start overflow-hidden rounded-lg bg-paper transition-[box-shadow,opacity] duration-200 ${
                          i === current ? "shadow-[0_0_0_3px_var(--amber)]" : ""
                        } ${over === i && drag !== i ? "shadow-[0_0_0_3px_var(--lilac)]" : ""} ${drag === i ? "opacity-40" : ""}`}
                      >
                        <img
                          src={pg.url}
                          alt=""
                          className="size-full object-cover"
                          draggable={false}
                        />
                        <span className="absolute top-1 left-1 min-w-5 rounded-md bg-night/85 px-1.5 text-xs leading-5 font-bold text-foreground">
                          {i + 1}
                        </span>
                        {pg.words && (
                          <span
                            className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#5E8C61]"
                            aria-hidden
                          />
                        )}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="flex h-[108px] w-[84px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-line/60 text-sm font-semibold text-muted-foreground"
                      onClick={() => addRef.current?.click()}
                    >
                      <Plus className="size-5" aria-hidden /> Add
                    </button>
                  </div>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute top-0 right-0 bottom-2 w-6 bg-gradient-to-r from-transparent to-card"
                  />
                </div>
                <div
                  role="toolbar"
                  aria-label="Selected page"
                  className="flex items-center justify-between gap-2 rounded-[14px] bg-raised py-2 pr-2 pl-4"
                >
                  <span className="font-semibold tabular-nums">
                    Page {current + 1} of {pages.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="btn-secondary min-h-10 px-3 text-[0.9375rem]"
                      disabled={current === 0}
                      onClick={() => move(current, current - 1)}
                    >
                      <ChevronLeft className="size-4" aria-hidden /> Earlier
                    </button>
                    <button
                      type="button"
                      className="btn-secondary min-h-10 px-3 text-[0.9375rem]"
                      disabled={current === pages.length - 1}
                      onClick={() => move(current, current + 1)}
                    >
                      Later <ChevronRight className="size-4" aria-hidden />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="btn-secondary min-h-10 w-10 px-0"
                        aria-label={`More for page ${current + 1}`}
                      >
                        <MoreHorizontal className="size-4" aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rb-menu">
                        <DropdownMenuItem
                          onSelect={() => {
                            setDraft(pages[current]?.words ?? "");
                            setWordsFor(current);
                          }}
                        >
                          Add the words on this page
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => replaceRef.current?.click()}>
                          Replace photo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="rb-menu-danger"
                          onSelect={() => p.onRemovePage(current)}
                        >
                          Remove page
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Info className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden />
                  Screen readers can’t read words in a photo. Use ⋯ › Add the words on any page you
                  want read out or enlarged.
                </p>
              </>
            )}
            {failed.length > 0 && (
              <p role="alert" className="text-sm text-destructive">
                Couldn’t open {failed.join(", ")}. Try a JPG or PNG photo or screenshot.
              </p>
            )}
            <p role="status" className="sr-only">
              {live}
            </p>
          </div>
        )}
      </div>
      <div className="panel-foot">
        <button
          type="button"
          className="btn-primary w-full"
          disabled={!s.hasContent}
          onClick={p.onNext}
        >
          {p.editing ? "Save" : p.nextLabel}
        </button>
      </div>

      <input
        ref={addRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void replace(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <Modal
        open={wordsFor !== null}
        onClose={() => setWordsFor(null)}
        title={`Add the words on page ${(wordsFor ?? 0) + 1}`}
        description="Screen readers will read these words, and they show as resizable text under the photo while you read."
      >
        <label htmlFor="page-words" className="sr-only">
          Words on this page
        </label>
        <textarea
          id="page-words"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 10000))}
          className="field h-36 resize-none"
        />
        <div className="rb-acts">
          <button type="button" className="btn-secondary" onClick={() => setWordsFor(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary min-h-12 text-base"
            onClick={() => {
              const i = wordsFor;
              s.setPages((prev) =>
                prev.map((x, k) => (k === i ? { ...x, words: draft.trim() || undefined } : x)),
              );
              setWordsFor(null);
              setLive(`Words saved for page ${(i ?? 0) + 1}.`);
            }}
          >
            Save words
          </button>
        </div>
      </Modal>
    </>
  );
}

import { useEffect, useRef, useState, type FocusEvent } from "react";
import { Check, ClipboardPaste, Info, MoreHorizontal, Plus, Upload } from "lucide-react";
import { Companion } from "./Companion";
import { PageGallery } from "./PageGallery";

export type PageImage = { id: string; url: string; name: string };
export type InputMode = "paste" | "upload" | null;

type Props = {
  mode: InputMode;
  onSelectMode: (m: Exclude<InputMode, null>) => void;
  text: string;
  setText: (t: string) => void;
  images: PageImage[];
  setImages: (fn: (prev: PageImage[]) => PageImage[]) => void;
  /** Content is ready and the choices are collapsed: show "Your pages" / "Your content" first. */
  collapsed: boolean;
  /** "Change content" reopened the choices. */
  changing: boolean;
  onChangeContent: () => void;
  onCancelChange: () => void;
  /** Pasted text is "done" (after a paste, or when leaving the field). */
  onPasteCommit: () => void;
  /** Pages were successfully added. */
  onPagesAdded: () => void;
  /** Session generation when this card rendered; uploads that finish after a discard are dropped. */
  generation: number;
  isCurrentSession: (g: number) => boolean;
  /** Optional wording for the children's corner; the adult flow passes nothing and keeps its own. */
  copy?: { title: string; pasteHint: string; uploadHint: string };
};

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Only pages that actually decode are added, so "at least one page" always means a usable image. */
async function loadPage(f: File): Promise<PageImage | null> {
  const url = URL.createObjectURL(f);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { id: crypto.randomUUID(), url, name: f.name };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

/** "Bring something to read" → once content is ready, "Your pages" / "Your content". */
export function PrepareStep(p: Props) {
  const [failed, setFailed] = useState<string[]>([]);
  const [reveal, setReveal] = useState<{ id: string; n: number } | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const pageCount = useRef(p.images.length);

  // After the first successful upload, bring the previews into view (instant for reduced motion).
  useEffect(() => {
    const before = pageCount.current;
    pageCount.current = p.images.length;
    if (before === 0 && p.images.length > 0) {
      requestAnimationFrame(() =>
        cardRef.current?.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" }),
      );
    }
  }, [p.images.length]);

  // When the paste layout settles, keep the caret's field on screen; focus and cursor are untouched.
  useEffect(() => {
    const ta = editorRef.current;
    if (p.collapsed && ta && document.activeElement === ta) ta.scrollIntoView({ block: "nearest" });
  }, [p.collapsed]);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    const gen = p.generation;
    const loaded = await Promise.all(list.map(loadPage));
    const ok = loaded.filter((x): x is PageImage => !!x);
    // The session was discarded while these were decoding: don't bring anything back.
    if (!p.isCurrentSession(gen)) return ok.forEach((x) => URL.revokeObjectURL(x.url));
    setFailed(list.filter((_, i) => !loaded[i]).map((f) => f.name));
    if (!ok.length) return;
    p.setImages((prev) => [...prev, ...ok]);
    p.onPagesAdded();
    // Reveal the first newly added page in the strip.
    setReveal((r) => ({ id: ok[0]!.id, n: (r?.n ?? 0) + 1 }));
  };
  const move = (i: number, d: -1 | 1) =>
    p.setImages((prev) => {
      const a = prev[i];
      const b = prev[i + d];
      if (!a || !b) return prev;
      const next = [...prev];
      next[i] = b;
      next[i + d] = a;
      return next;
    });
  const remove = (id: string) => {
    const hit = p.images.find((x) => x.id === id);
    if (hit) URL.revokeObjectURL(hit.url);
    p.setImages((prev) => prev.filter((x) => x.id !== id));
  };
  const replace = async (id: string, f?: File) => {
    if (!f) return;
    const gen = p.generation;
    const page = await loadPage(f);
    if (!p.isCurrentSession(gen)) return page && URL.revokeObjectURL(page.url);
    if (!page) return setFailed([f.name]);
    setFailed([]);
    const old = p.images.find((x) => x.id === id);
    if (old) URL.revokeObjectURL(old.url);
    p.setImages((prev) => prev.map((x) => (x.id === id ? { ...page, id } : x)));
  };

  // Leaving the editor commits the text — unless focus moved to the input choices, so a click there isn't lost to a layout change.
  const onEditorBlur = (e: FocusEvent<HTMLTextAreaElement>) => {
    const to = e.relatedTarget as HTMLElement | null;
    if (to?.closest("[data-input-choices]")) return;
    if (p.text.trim()) p.onPasteCommit();
  };

  const choice = (m: Exclude<InputMode, null>, Icon: typeof Upload, label: string, hint?: string) => (
    <button type="button" aria-pressed={p.mode === m} onClick={() => p.onSelectMode(m)} className="tile relative items-center">
      <Icon className="size-5 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 pr-6">
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
      {p.mode === m && (
        <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" strokeWidth={3} aria-hidden />
        </span>
      )}
    </button>
  );

  const addPages = (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
      <label className="btn-secondary cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
        <Plus className="size-4" aria-hidden /> Add pages
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {p.images.length > 1 && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <MoreHorizontal className="size-4 shrink-0" aria-hidden /> Use the page menu to reorder
        </p>
      )}
      <p className="flex items-start justify-center gap-2 text-sm text-muted-foreground sm:ml-auto">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        {p.images.length ? "Text extraction isn't connected yet." : "You can read from your photos. Text extraction isn't connected yet."}
      </p>
    </div>
  );

  const title = p.collapsed
    ? p.mode === "upload"
      ? "Your pages"
      : "Your content"
    : (p.copy?.title ?? "Bring something to read");

  // Structure stays stable across states so the text editor is never remounted (focus and caret survive).
  return (
    <section ref={cardRef} id="content-card" className="card relative mt-4 scroll-mt-4" aria-labelledby="content-h">
      {/* Peeks over the card's top-right corner, in the gap above it: never over the heading, text or controls. */}
      <Companion pose="peek" interactive className="absolute right-6 bottom-[calc(100%-1px)] w-12" />
      <div className="flex items-start justify-between gap-x-4 gap-y-1">
        <h2 id="content-h" tabIndex={-1} className="text-xl font-medium outline-none">
          {title}
          {p.collapsed && p.mode === "upload" && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              {p.images.length} {p.images.length === 1 ? "page" : "pages"}
            </span>
          )}
        </h2>
        {p.collapsed && (
          <button className="text-link mt-1 text-sm whitespace-nowrap" onClick={p.onChangeContent}>
            Change content
          </button>
        )}
        {p.changing && (
          <button className="text-link mt-1 text-sm whitespace-nowrap" onClick={p.onCancelChange}>
            Cancel
          </button>
        )}
      </div>

      {!p.collapsed && (
        <div className="reveal" data-input-choices>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5" role="group" aria-label="How to add your passage">
            {choice("paste", ClipboardPaste, "Paste text", p.copy?.pasteHint)}
            {choice("upload", Upload, "Upload pages", p.copy?.uploadHint)}
          </div>
        </div>
      )}

      {p.mode === "paste" && (
        <div className={p.collapsed ? "mt-4" : "mt-8"}>
          {!p.collapsed && (
            <>
              <label htmlFor="passage" className="font-medium">
                Your passage
              </label>
              <p id="passage-hint" className="text-sm text-muted-foreground">
                Paste the exact words you plan to read.
              </p>
            </>
          )}
          <textarea
            ref={editorRef}
            id="passage"
            aria-labelledby={p.collapsed ? "content-h" : undefined}
            aria-describedby={p.collapsed ? undefined : "passage-hint"}
            value={p.text}
            onChange={(e) => p.setText(e.target.value.slice(0, 10000))}
            // Commit after the paste lands, without touching focus or the caret.
            onPaste={() => setTimeout(p.onPasteCommit, 0)}
            onBlur={onEditorBlur}
            rows={9}
            className="field reading-text mt-2 max-w-none text-base"
          />
          {p.collapsed && <p className="mt-2 text-sm text-muted-foreground">You can still edit your passage.</p>}
        </div>
      )}

      {p.mode === "upload" && (
        <div className={p.collapsed ? "mt-4" : "mt-8"}>
          {p.images.length > 0 ? (
            <>
              <PageGallery images={p.images} onMove={move} onRemove={remove} onReplace={replace} reveal={reveal} />
              <div className="mt-6">{addPages}</div>
            </>
          ) : (
            <>
              <p>Add photos or screenshots of the pages you'll read.</p>
              <div className="mt-4">{addPages}</div>
            </>
          )}
          {failed.length > 0 && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              Couldn't open {failed.join(", ")}. Try a JPG or PNG photo or screenshot.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

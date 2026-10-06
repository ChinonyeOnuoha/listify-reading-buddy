import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { PageImage } from "./PrepareStep";

type Props = {
  images: PageImage[];
  onMove: (index: number, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  onReplace: (id: string, file?: File) => void;
  /** Bring this page into view (e.g. the first of newly added pages). `n` changes on each request. */
  reveal?: { id: string; n: number } | null;
};

const menuItem = "min-h-10 gap-2 rounded-xl px-3 text-base text-foreground focus:bg-tint focus:text-foreground [&>svg]:text-primary";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One horizontal strip of equal, fixed-height page frames. Desktop shows two previews, phones show one
 * with a peek of the next. Gallery arrows (round, overlaid) only scroll; reorder buttons sit under each page.
 */
export function PageGallery({ images, onMove, onRemove, onReplace, reveal }: Props) {
  const scroller = useRef<HTMLOListElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [moved, setMoved] = useState<string | null>(null);
  const total = images.length;

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setOverflow(el.scrollWidth > el.clientWidth + 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure]);
  useEffect(measure, [images, measure]);

  // Scroll only the strip (never the page) so a given page is fully visible.
  const showPage = useCallback((id: string) => {
    const el = scroller.current;
    const li = document.getElementById(`page-${id}`);
    if (!el || !li) return;
    const s = el.getBoundingClientRect();
    const r = li.getBoundingClientRect();
    const delta = r.left < s.left ? r.left - s.left : r.right > s.right ? r.right - s.right : 0;
    if (delta) el.scrollBy({ left: delta, behavior: reducedMotion() ? "auto" : "smooth" });
  }, []);

  // Keep a page in view after it's re-ordered.
  useEffect(() => {
    if (!moved) return;
    showPage(moved);
    setMoved(null);
  }, [moved, images, showPage]);

  // Reveal newly added pages.
  useEffect(() => {
    if (reveal) showPage(reveal.id);
  }, [reveal, showPage]);

  const step = (dir: -1 | 1) => {
    const el = scroller.current;
    const item = el?.querySelector("li");
    if (!el || !item) return;
    el.scrollBy({ left: dir * (item.getBoundingClientRect().width + 16), behavior: reducedMotion() ? "auto" : "smooth" });
  };

  // Spec: right arrow until the end; left arrow only at the end (earlier pages exist); none without overflow.
  const showRight = overflow && !atEnd;
  const showLeft = overflow && atEnd;
  const arrow = "absolute top-[calc(50%-2.25rem)] z-10 flex size-11 items-center justify-center rounded-full border border-line bg-card text-primary hover:bg-tint";

  return (
    <div className="relative">
      <ol
        ref={scroller}
        tabIndex={0}
        aria-label={`Page previews, ${total} ${total === 1 ? "page" : "pages"}. Scroll sideways to see more.`}
        className="no-scrollbar relative flex snap-x snap-mandatory gap-4 overflow-x-auto rounded-2xl pb-1"
      >
        {images.map((img, i) => (
          <li id={`page-${img.id}`} key={img.id} className="relative w-[85%] shrink-0 snap-start sm:w-[calc(50%-0.5rem)]">
            {/* Equal, fixed-height frame: the page is contained, never stretched or cropped. */}
            <div className="flex h-80 items-center justify-center overflow-hidden rounded-2xl bg-muted p-3 sm:h-96">
              <img src={img.url} alt={`Page ${i + 1}: ${img.name}`} title={img.name} className="h-full w-full object-contain" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-medium whitespace-nowrap">
                Page {i + 1} <span className="sr-only">of {total}</span>
              </span>
              {/* One "⋯" menu per page: the keyboard- and screen-reader-friendly way to reorder, replace or remove. */}
              <DropdownMenu>
                <DropdownMenuTrigger className="btn-icon" aria-label={`Page ${i + 1} options`}>
                  <MoreHorizontal className="size-5" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl border-border bg-card p-1.5 text-foreground shadow-md">
                  <DropdownMenuItem
                    disabled={i === 0}
                    className={menuItem}
                    onSelect={() => {
                      onMove(i, -1);
                      setMoved(img.id);
                    }}
                  >
                    <ArrowLeft aria-hidden /> Move earlier
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={i === total - 1}
                    className={menuItem}
                    onSelect={() => {
                      onMove(i, 1);
                      setMoved(img.id);
                    }}
                  >
                    <ArrowRight aria-hidden /> Move later
                  </DropdownMenuItem>
                  <DropdownMenuItem className={menuItem} onSelect={() => document.getElementById(`replace-${img.id}`)?.click()}>
                    <RefreshCw aria-hidden /> Replace…
                  </DropdownMenuItem>
                  <DropdownMenuItem className={menuItem} onSelect={() => onRemove(img.id)}>
                    <Trash2 aria-hidden /> Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                id={`replace-${img.id}`}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  onReplace(img.id, e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </li>
        ))}
      </ol>

      {showLeft && (
        <button className={`${arrow} -left-3 sm:-left-5`} onClick={() => step(-1)} aria-label="Show earlier pages">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      )}
      {showRight && (
        <button className={`${arrow} -right-3 sm:-right-5`} onClick={() => step(1)} aria-label="Show more pages">
          <ChevronRight className="size-5" aria-hidden />
        </button>
      )}
    </div>
  );
}

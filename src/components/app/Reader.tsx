import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { PageViewer } from "@/components/reading/PageViewer";
import { ScreenTitle } from "./ui";
import type { PageImage } from "@/lib/reading-session";

export const TEXT_STEPS = [1.125, 1.25, 1.375, 1.5, 1.75, 2] as const;

/** The reading frame: a toolbar that never moves, and the reading below it. */
export function ReaderFrame({
  label,
  onBack,
  tools,
  children,
  dock,
}: {
  label: string;
  onBack: () => void;
  tools?: ReactNode;
  children: ReactNode;
  /** The recording dock on narrow screens. */
  dock?: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className="flex min-w-0 flex-1 flex-col rounded-[20px] bg-card wide:min-h-0"
    >
      <ScreenTitleSrOnly>{label}</ScreenTitleSrOnly>
      <div className="sticky top-16 z-[5] flex min-h-16 flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-t-[20px] border-b border-border bg-card px-3 py-2 wide:static">
        <button type="button" className="btn-quiet" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden /> Nook
        </button>
        {tools}
      </div>
      <div className="flex-1 px-4 py-6 wide:min-h-0 wide:overflow-y-auto wide:overscroll-contain wide:px-[clamp(1rem,3vw,3rem)]">
        {children}
      </div>
      {dock}
    </section>
  );
}

/** A− and A+ for real text. */
export function TextSize({ size, onSize }: { size: number; onSize: (n: number) => void }) {
  return (
    <div role="toolbar" aria-label="Text size" className="flex items-center gap-1">
      <button
        type="button"
        className="btn-icon text-sm font-semibold"
        aria-label="Smaller text"
        aria-disabled={size === 0}
        onClick={() => size > 0 && onSize(size - 1)}
      >
        A−
      </button>
      <button
        type="button"
        className="btn-icon text-lg font-semibold"
        aria-label="Bigger text"
        aria-disabled={size === TEXT_STEPS.length - 1}
        onClick={() => size < TEXT_STEPS.length - 1 && onSize(size + 1)}
      >
        A+
      </button>
    </div>
  );
}

/**
 * Previous, "Page n of N", Next. The counter is announced; the passage is never read out automatically. When the button
 * just used becomes unavailable (first or last page), focus moves to the other one instead of being lost.
 */
export function Pager({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (n: number) => void;
}) {
  const prev = useRef<HTMLButtonElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const after = useRef<"prev" | "next" | null>(null);
  useEffect(() => {
    if (!after.current) return;
    (after.current === "next" ? next : prev).current?.focus();
    after.current = null;
  }, [page]);
  return (
    <nav aria-label="Pages" className="flex items-center gap-1">
      <button
        ref={prev}
        type="button"
        className="btn-icon"
        aria-label="Previous page"
        disabled={page === 0}
        onClick={() => {
          if (page - 1 === 0) after.current = "next";
          onPage(page - 1);
        }}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <span
        aria-live="polite"
        className="min-w-[5.5rem] text-center text-sm whitespace-nowrap text-foreground tabular-nums"
      >
        Page {page + 1} of {total}
      </span>
      <button
        ref={next}
        type="button"
        className="btn-icon"
        aria-label="Next page"
        disabled={page >= total - 1}
        onClick={() => {
          if (page + 1 >= total - 1) after.current = "prev";
          onPage(page + 1);
        }}
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </nav>
  );
}

/** Pasted text, as real resizable text. Paragraphs stay still: nothing highlights or moves on its own. */
export function PassageText({
  text,
  size,
  kid = false,
}: {
  text: string;
  size: number;
  kid?: boolean;
}) {
  const paras = text.split(/\n\s*\n+/).filter((t) => t.trim());
  return (
    <div
      lang="en"
      className={`mx-auto max-w-[34em] space-y-4 leading-[1.65] ${kid ? "kid" : ""}`}
      style={{ fontSize: `${TEXT_STEPS[size]}rem` }}
    >
      {paras.map((t, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {t}
        </p>
      ))}
    </div>
  );
}

/**
 * Photographed pages, one at a time, each with its own zoom and pan. Any words added for a page show under it as real,
 * resizable text. A new page always starts fitted.
 */
export function PagesView({
  pages,
  page,
  size,
}: {
  pages: PageImage[];
  page: number;
  size: number;
}) {
  const current = Math.min(page, pages.length - 1);
  const pg = pages[current];
  const top = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    top.current?.scrollIntoView({ block: "nearest" });
  }, [current]);
  if (!pg) return null;
  return (
    <div ref={top} className="scroll-mt-24">
      <PageViewer key={pg.id} src={pg.url} alt={`Page ${current + 1} of ${pages.length}`} />
      {pg.words && (
        <div className="mx-auto mt-5 max-w-[34em]">
          <p className="text-sm text-muted-foreground">The words on this page</p>
          <p
            className="mt-1 leading-[1.65] whitespace-pre-wrap"
            style={{ fontSize: `${TEXT_STEPS[size]}rem` }}
          >
            {pg.words}
          </p>
        </div>
      )}
    </div>
  );
}

/** Text size kept per corner for this visit. */
export function useTextSize(initial = 2) {
  return useState(initial);
}

/** The reading screen's heading: read out and focused when the screen opens, but not shown (the reading speaks for itself). */
function ScreenTitleSrOnly({ children }: { children: ReactNode }) {
  return (
    <div className="sr-only">
      <ScreenTitle id="reader-h">{children}</ScreenTitle>
    </div>
  );
}

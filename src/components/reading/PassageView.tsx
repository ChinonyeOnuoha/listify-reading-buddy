import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageImage } from "./PrepareStep";

type Props = { text?: string | undefined; images?: PageImage[] | undefined };

/** Read-only passage. Pages are shown one at a time; page navigation stays available while recording. */
export function PassageView({ text, images }: Props) {
  const [page, setPage] = useState(0);

  if (!images?.length) return <div className="reading-text">{text}</div>;

  const total = images.length;
  const current = Math.min(page, total - 1);
  const img = images[current]!;

  return (
    <div>
      <div className="flex h-[70vh] max-h-[52rem] min-h-80 items-center justify-center rounded-2xl border border-border bg-white p-2">
        <img src={img.url} alt={`Page ${current + 1} of ${total}`} className="h-full w-full object-contain" />
      </div>
      {total > 1 && (
        <nav aria-label="Pages" className="mt-3 flex items-center justify-between gap-2">
          <button className="btn-quiet -ml-3" disabled={current === 0} onClick={() => setPage(current - 1)}>
            <ChevronLeft className="size-4" aria-hidden /> Previous page
          </button>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            Page {current + 1} of {total}
          </span>
          <button className="btn-quiet -mr-3" disabled={current === total - 1} onClick={() => setPage(current + 1)}>
            Next page <ChevronRight className="size-4" aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}

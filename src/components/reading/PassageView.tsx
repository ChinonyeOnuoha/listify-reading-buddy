import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageViewer } from "./PageViewer";
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
      {/* A new page always starts fitted: the key remounts the viewer, so no pan or zoom is inherited. */}
      <PageViewer key={img.id} src={img.url} alt={`Page ${current + 1} of ${total}`} />
      {total > 1 && (
        <nav aria-label="Pages" className="mt-1 flex items-center justify-between gap-4">
          {/* Narrow screens: compact 44px arrow buttons; wider screens show the words too. */}
          <button
            className="btn-quiet min-h-11 min-w-11 justify-center px-2 sm:-ml-3 sm:px-3"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-5 sm:size-4" aria-hidden /> <span className="hidden sm:inline">Previous page</span>
          </button>
          <span className="text-sm whitespace-nowrap text-muted-foreground" aria-live="polite">
            Page {current + 1} of {total}
          </span>
          <button
            className="btn-quiet min-h-11 min-w-11 justify-center px-2 sm:-mr-3 sm:px-3"
            disabled={current === total - 1}
            onClick={() => setPage(current + 1)}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next page</span> <ChevronRight className="size-5 sm:size-4" aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}

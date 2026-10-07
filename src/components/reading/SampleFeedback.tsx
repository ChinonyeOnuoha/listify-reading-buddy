import { useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, Eye, Search } from "lucide-react";
import { SAMPLE_EXAMPLES, SAMPLE_PASSAGE, STATUS_LABEL, type SampleStatus } from "@/lib/sample-feedback";

const STATUS_STYLE: Record<SampleStatus, { Icon: typeof Eye; cls: string }> = {
  difference: { Icon: Search, cls: "border-border bg-peach" },
  review: { Icon: Eye, cls: "border-border bg-tint" },
  clear: { Icon: CheckCircle2, cls: "border-primary/50 bg-card" },
  unsure: { Icon: CircleHelp, cls: "border-dashed border-line bg-card" },
};

type Props = {
  /** Sample session only: the passage is already on screen, so the toggle is hidden. */
  hidePassage?: boolean;
};

/** One labelled SAMPLE example at a time. Never presented as analysis of the visitor's audio. */
export function SampleFeedback({ hidePassage }: Props) {
  const [i, setI] = useState(0);
  const ex = SAMPLE_EXAMPLES[i] ?? SAMPLE_EXAMPLES[0]!;
  const total = SAMPLE_EXAMPLES.length;
  const status = STATUS_STYLE[ex.status];

  return (
    <section className="card reveal" aria-labelledby="sample-h">
      <span className="rounded-md bg-peach px-2.5 py-1 text-xs font-semibold tracking-wider text-foreground uppercase">
        Sample feedback
      </span>
      <h2 id="sample-h" className="mt-4 text-xl font-medium">What feedback could look like</h2>
      <p className="mt-1 text-muted-foreground">
        Made-up examples on a sample passage. This is not an analysis of your recording 💛
      </p>

      {!hidePassage && (
        <details className="mt-4 rounded-2xl border border-border px-4 py-3">
          <summary className="cursor-pointer font-medium">Show the sample passage</summary>
          <p className="mt-2 text-muted-foreground">{SAMPLE_PASSAGE}</p>
        </details>
      )}

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Sample feedback examples">
        {SAMPLE_EXAMPLES.map((e, idx) => (
          <button
            key={e.kind}
            id={`sample-tab-${idx}`}
            role="tab"
            aria-selected={idx === i}
            aria-controls="sample-panel"
            tabIndex={idx === i ? 0 : -1}
            onClick={() => setI(idx)}
            onKeyDown={(k) => {
              // Arrow keys move between tabs, as screen-reader users expect.
              const d = k.key === "ArrowRight" ? 1 : k.key === "ArrowLeft" ? -1 : 0;
              if (!d) return;
              const next = (idx + d + total) % total;
              setI(next);
              document.getElementById(`sample-tab-${next}`)?.focus();
            }}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              idx === i ? "border-primary bg-tint text-foreground" : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      <article id="sample-panel" role="tabpanel" aria-labelledby={`sample-tab-${i}`} className="mt-6 border-t border-border pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-medium">{ex.label}</h3>
          <span className="text-sm text-muted-foreground">Sample {i + 1} of {total}</span>
        </div>
        <p className={`mt-2 inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-sm font-medium ${status.cls}`}>
          <status.Icon className="size-4" aria-hidden /> {STATUS_LABEL[ex.status]}
        </p>

        <h4 className="mt-5 text-sm font-medium tracking-wide text-muted-foreground uppercase">Observation</h4>
        <div className="mt-2 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="rounded-2xl bg-background p-4">
            <div className="text-sm text-muted-foreground">
              {ex.words && ex.status === "unsure" ? "Words not assessed" : "Words"}
              {ex.location && ` · ${ex.location}`}
            </div>
            <p className="mt-1 font-medium">{ex.words ?? "Whole sample passage"}</p>
          </div>
          <p>{ex.observation}</p>
        </div>

        {ex.experiment && (
          <div className="mt-6 rounded-2xl border border-border p-4">
            <h4 className="font-medium">Optional experiment for a new passage</h4>
            <p className="mt-1 text-muted-foreground">{ex.experiment}</p>
            {ex.extraTips && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-primary">One more optional tip</summary>
                <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                  {ex.extraTips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </article>

      <div className="mt-6 flex justify-between gap-3 border-t border-border pt-4">
        <button className="btn-quiet -ml-3" disabled={i === 0} onClick={() => setI(i - 1)}>
          <ChevronLeft className="size-4" aria-hidden /> Previous
        </button>
        <button className="btn-quiet -mr-3" disabled={i === total - 1} onClick={() => setI(i + 1)}>
          Next <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}

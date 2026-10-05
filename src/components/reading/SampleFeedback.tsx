import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { SAMPLE_EXAMPLES, SAMPLE_PASSAGE } from "@/lib/sample-feedback";

export function SampleFeedback({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const ex = SAMPLE_EXAMPLES[i];
  const total = SAMPLE_EXAMPLES.length;

  return (
    <section className="card-soft border-dashed p-5 sm:p-6" aria-labelledby="sample-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold tracking-widest text-peach-strong">
          SAMPLE FEEDBACK
        </span>
        <button className="pill pill-ghost px-4 py-1.5 text-sm" onClick={onClose}>
          <X className="size-4" aria-hidden /> Close samples
        </button>
      </div>
      <h2 id="sample-h" className="mt-3 text-xl font-bold">What feedback could look like</h2>
      <p className="mt-1 text-muted-foreground">
        Made-up examples on a sample passage. This is not about your recording. 💛
      </p>

      <details className="mt-3 rounded-2xl bg-peach p-3">
        <summary className="cursor-pointer text-sm font-bold">Show the sample passage</summary>
        <p className="reading-text mt-2 text-base">{SAMPLE_PASSAGE}</p>
      </details>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Sample examples">
        {SAMPLE_EXAMPLES.map((e, idx) => (
          <button
            key={e.kind}
            role="tab"
            aria-selected={idx === i}
            onClick={() => setI(idx)}
            className={`rounded-full border-[1.5px] px-3 py-1 text-sm font-bold transition ${
              idx === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/60"
            }`}
          >
            {idx + 1}. {e.label}
          </button>
        ))}
      </div>

      <article className="mt-4 rounded-2xl border-[1.5px] border-border bg-background/60 p-4" role="tabpanel">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span aria-hidden>{ex.emoji}</span> {ex.label}
          <span className="ml-auto text-xs font-normal text-muted-foreground">Sample {i + 1} of {total}</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          {ex.words ? (
            <div className="rounded-xl bg-peach p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Words {ex.location && `· ${ex.location}`}
              </div>
              <p className="mt-1 font-bold">{ex.words}</p>
            </div>
          ) : (
            <div className="rounded-xl bg-peach p-3 text-sm text-muted-foreground">All checked areas</div>
          )}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What I noticed</div>
            <p className="mt-1">{ex.observation}</p>
          </div>
        </div>
        {ex.experiment && (
          <div className="mt-3 rounded-xl bg-accent/60 p-3">
            <div className="text-xs font-bold uppercase tracking-wider">Try this on your next passage</div>
            <p className="mt-1">{ex.experiment}</p>
            {ex.extraTips && (
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-bold">Optional extra tip</summary>
                <ul className="mt-1 list-disc pl-5">
                  {ex.extraTips.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
      </article>

      <div className="mt-4 flex justify-between gap-3">
        <button className="pill pill-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
          <ChevronLeft className="size-4" aria-hidden /> Previous
        </button>
        <button className="pill pill-ghost" disabled={i === total - 1} onClick={() => setI(i + 1)}>
          Next <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}

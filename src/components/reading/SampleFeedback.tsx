import {
  SAMPLE_CARDS,
  SAMPLE_NO_FINDINGS,
  SAMPLE_PASSAGE,
  SAMPLE_UNCERTAIN,
} from "@/lib/sample-feedback";

export function SampleFeedback({ onClose }: { onClose: () => void }) {
  return (
    <section className="card-soft border-dashed p-5 sm:p-6" aria-labelledby="sample-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold tracking-widest text-peach-strong">
          SAMPLE FEEDBACK
        </span>
        <button className="pill pill-ghost px-4 py-1.5 text-sm" onClick={onClose}>Close</button>
      </div>
      <h2 id="sample-h" className="mt-3 text-xl font-bold">What feedback could look like</h2>
      <p className="mt-1 text-muted-foreground">
        This is made-up example data based on a sample passage, not your recording. 💛
      </p>

      <blockquote className="reading-text mt-4 rounded-2xl bg-peach p-4 text-base">
        {SAMPLE_PASSAGE}
      </blockquote>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {SAMPLE_CARDS.map((c) => (
          <article key={c.kind} className="rounded-2xl border-[1.5px] border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 font-bold">
              <span aria-hidden>{c.emoji}</span>
              {c.label}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">📍 {c.location}</div>
            <div className="mt-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What I noticed</div>
              <p className="mt-1">{c.observation}</p>
            </div>
            <div className="mt-3 rounded-xl bg-accent/60 p-3">
              <div className="text-xs font-bold uppercase tracking-wider">Optional experiment · new passage</div>
              <p className="mt-1">{c.experiment}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-secondary p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sample · no findings</div>
          <p className="mt-1">{SAMPLE_NO_FINDINGS}</p>
        </div>
        <div className="rounded-2xl bg-secondary p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sample · not sure</div>
          <p className="mt-1">{SAMPLE_UNCERTAIN}</p>
        </div>
      </div>
    </section>
  );
}

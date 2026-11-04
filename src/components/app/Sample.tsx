import { SAMPLE_EXAMPLES, SAMPLE_PASSAGE, STATUS_LABEL } from "@/lib/sample-feedback";
import { ScreenTitle, StepHead } from "./ui";

/**
 * A three-step look around, with no microphone and nothing recorded: the reading screen, listening back, then the sample
 * notes one at a time. Every step shares one space, so moving between them never changes the panel's size.
 * The notes are made-up examples on a sample passage, labelled as SAMPLE, and never about the visitor's own reading.
 */
export function SamplePanel({
  step,
  note,
  onStep,
  onNote,
  onHome,
  onStartMine,
}: {
  step: 1 | 2 | 3;
  note: number;
  onStep: (s: 1 | 2 | 3) => void;
  onNote: (n: number) => void;
  onHome: () => void;
  onStartMine: () => void;
}) {
  const total = SAMPLE_EXAMPLES.length;
  const ex = SAMPLE_EXAMPLES[note] ?? SAMPLE_EXAMPLES[0]!;
  const back = () =>
    step === 1 ? onHome() : step === 3 && note > 0 ? onNote(note - 1) : onStep((step - 1) as 1 | 2);
  const next = () =>
    step < 3 ? onStep((step + 1) as 2 | 3) : note < total - 1 ? onNote(note + 1) : onStartMine();
  const nextLabel =
    step === 1
      ? "Next: listening back"
      : step === 2
        ? "Next: sample notes"
        : note < total - 1
          ? "Next note"
          : "Start my own session";
  const off = (n: number) => ({
    "data-off": step !== n,
    "aria-hidden": step !== n,
    inert: step !== n,
  });

  return (
    <>
      <div className="panel-body">
        <StepHead onBack={back} backLabel={step === 1 ? "Home" : "Back"} />
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <span>Sample · {step} of 3</span>
          <div className="flex gap-1" aria-hidden>
            {[1, 2, 3].map((i) => (
              <i
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-selected"}`}
              />
            ))}
          </div>
        </div>
        <div className="stack">
          <div {...off(1)} className="flex flex-col gap-3">
            {step === 1 && <ScreenTitle>This is the reading screen</ScreenTitle>}
            {step !== 1 && <p className="title">This is the reading screen</p>}
            <p className="lead">
              You read your passage aloud while Buddy records. In the sample, recording is off.
            </p>
            <div className="rounded-xl bg-paper p-6 font-serif text-[1.1875rem] leading-relaxed text-paper-ink">
              {SAMPLE_PASSAGE}
            </div>
          </div>
          <div {...off(2)} className="flex flex-col gap-3">
            {step === 2 ? (
              <ScreenTitle>Then you listen back</ScreenTitle>
            ) : (
              <p className="title">Then you listen back</p>
            )}
            <p className="lead">
              After a real reading, your recording plays here. The sample has no demo audio, so
              there is nothing to play.
            </p>
          </div>
          <div {...off(3)} className="flex flex-col gap-3">
            {step === 3 ? (
              <ScreenTitle>Notes Buddy could offer</ScreenTitle>
            ) : (
              <p className="title">Notes Buddy could offer</p>
            )}
            <p className="lead">
              Made-up examples on the sample passage. Nothing analyses a recording yet.
            </p>
            <article
              aria-live="polite"
              className="flex min-h-[20rem] flex-col gap-3 rounded-2xl bg-raised p-5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
                  Sample · Note {note + 1} of {total}
                </span>
                <span className="flex gap-1.5" aria-hidden>
                  {SAMPLE_EXAMPLES.map((_, i) => (
                    <i
                      key={i}
                      className={`h-2 rounded-full transition-[width,background-color] duration-200 ${i === note ? "w-5 bg-primary" : "w-2 bg-selected"}`}
                    />
                  ))}
                </span>
              </div>
              <h2 className="text-lg font-semibold">{ex.label}</h2>
              <p className="text-sm text-muted-foreground">{STATUS_LABEL[ex.status]}</p>
              {ex.words && (
                <p className="rounded-lg bg-night px-3.5 py-2.5 shadow-[inset_3px_0_0_var(--amber)]">
                  {ex.words}
                </p>
              )}
              <p className="leading-normal">{ex.observation}</p>
              {ex.experiment && (
                <p className="mt-auto text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Optional, for a new passage:{" "}
                  </span>
                  {ex.experiment}
                </p>
              )}
            </article>
          </div>
        </div>
      </div>
      <div className="panel-foot">
        <button type="button" className="btn-primary w-full" onClick={next}>
          {nextLabel}
        </button>
        {step === 3 && note < total - 1 && (
          <button type="button" className="btn-link w-full" onClick={onStartMine}>
            Start my own session
          </button>
        )}
      </div>
    </>
  );
}

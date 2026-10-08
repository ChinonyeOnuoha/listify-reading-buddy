import { ArrowLeft, ArrowRight, Info, RotateCcw } from "lucide-react";
import { SAMPLE_PASSAGE } from "@/lib/sample-feedback";
import { PassageView } from "./PassageView";
import { SampleFeedback } from "./SampleFeedback";

export type SampleStage = "read" | "review" | "feedback";

type Props = {
  stage: SampleStage;
  setStage: (s: SampleStage) => void;
  onStartMine: () => void;
};

/**
 * A walkthrough for visitors who just want to look around: no target, no passage of their own, no microphone.
 * It keeps its own state, so it never touches the visitor's passage, target, recording or progress.
 * No demo audio ships with the prototype, so nothing pretends to play.
 */
export function SampleSession({ stage, setStage, onStartMine }: Props) {
  if (stage === "read") {
    return (
      <>
        <header className="text-left sm:text-center">
          <h1 className="display-serif text-[1.875rem] text-balance sm:text-[2.375rem]">A sample reading</h1>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Here's how the reading view looks. Nothing is recorded and no microphone is needed.
          </p>
        </header>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-[30px]">
          <section aria-label="Sample passage" className="card min-w-0">
            <p className="text-sm text-muted-foreground">Sample passage</p>
            <div className="mt-3">
              <PassageView text={SAMPLE_PASSAGE} />
            </div>
          </section>
          <aside aria-label="Sample recording controls" className="card lg:sticky lg:top-24 lg:p-8">
            <h2 className="text-xl font-medium">Recording is off here</h2>
            <p className="mt-2 text-muted-foreground">
              In your own session, this card holds the timer, your target and the Start recording button. The sample doesn't record or count
              towards your target.
            </p>
            <button className="btn-primary mt-6 w-full" onClick={() => setStage("review")}>
              Continue to sample review <ArrowRight className="size-[18px]" aria-hidden />
            </button>
          </aside>
        </div>
      </>
    );
  }

  if (stage === "review") {
    return (
      <>
        <header className="text-left sm:text-center">
          <h1 className="display-serif text-[1.875rem] text-balance sm:text-[2.375rem]">Sample review</h1>
          <p className="mt-2 text-muted-foreground">After a real reading, this is where you listen back.</p>
        </header>
        <section className="card" aria-labelledby="sample-audio-h">
          <button className="btn-quiet -mt-2 -ml-3" onClick={() => setStage("read")}>
            <ArrowLeft className="size-4" aria-hidden /> Back to the sample passage
          </button>
          <h2 id="sample-audio-h" className="mt-4 text-xl font-medium">
            Demo audio isn't available
          </h2>
          <p className="mt-2 flex items-start gap-2 text-muted-foreground">
            <Info className="mt-1 size-4 shrink-0" aria-hidden />
            This prototype doesn't include a demo recording, so there's nothing to play here. You can still see what sample feedback looks like.
          </p>
          <button className="btn-primary mt-6 w-full sm:w-auto" onClick={() => setStage("feedback")}>
            See sample feedback <ArrowRight className="size-[18px]" aria-hidden />
          </button>
        </section>
      </>
    );
  }

  return (
    <>
      <header className="text-left sm:text-center">
        <h1 className="display-serif text-[1.875rem] text-balance sm:text-[2.375rem]">Sample feedback</h1>
        <p className="mt-2 text-muted-foreground">Illustrative examples to show the kind of observations Reading Buddy could offer.</p>
      </header>
      <SampleFeedback />
      <section className="card text-center" aria-labelledby="finish-h">
        <h2 id="finish-h" className="text-xl font-medium">
          That's the tour 💛
        </h2>
        <p className="mt-1 text-muted-foreground">Ready to read something of your own?</p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button className="btn-primary w-full sm:w-auto" onClick={onStartMine}>
            Start my session <ArrowRight className="size-[18px]" aria-hidden />
          </button>
          <button className="btn-quiet" onClick={() => setStage("read")}>
            <RotateCcw className="size-4" aria-hidden /> Explore the sample again
          </button>
        </div>
      </section>
    </>
  );
}

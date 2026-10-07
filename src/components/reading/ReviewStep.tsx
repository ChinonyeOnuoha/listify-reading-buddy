import { useState } from "react";
import { ArrowLeft, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { ConfirmInline } from "./ConfirmInline";
import { SampleFeedback } from "./SampleFeedback";
import { formatTime, type AudioTake } from "./useRecorder";

type Props = {
  take: AudioTake | null;
  target: number;
  onBack: () => void;
  onDiscard: () => void;
  onNewSession: () => void;
};

export function ReviewStep({ take, target, onBack, onDiscard, onNewSession }: Props) {
  const [confirm, setConfirm] = useState<null | "discard" | "new">(null);
  const [showSample, setShowSample] = useState(false);

  return (
    <>
      <header className="text-center">
        <h1 className="text-[1.75rem] font-semibold sm:text-[2.125rem]">Reading done 🙌🏾 Have a listen back.</h1>
        <p className="mt-2 text-muted-foreground">AI feedback isn't connected yet.</p>
      </header>

      <section className="card" aria-labelledby="rec-h">
        <button className="btn-quiet -mt-2 -ml-3" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden /> Back to reading
        </button>
        {take ? (
          <>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="rec-h" className="text-xl font-medium">
                {take.source === "upload" ? "Your uploaded audio" : "Your recording"}
              </h2>
              <p className="text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{take.duration ? formatTime(take.duration) : "—"}</span> · {target} min
                target
              </p>
            </div>
            {take.source === "upload" && take.name && <p className="text-sm text-muted-foreground">{take.name}</p>}
            <audio controls src={take.url} className="mt-4 w-full" aria-label="Play back your reading" />
          </>
        ) : (
          <p id="rec-h" className="mt-4 text-muted-foreground">
            No recording yet — head back to read when you're ready 📖
          </p>
        )}

        {confirm ? (
          <ConfirmInline
            className="mt-6"
            message={
              confirm === "discard"
                ? "Discard this recording? It can't be brought back."
                : "Start a new session? This clears your passage, pages and recording. Your target stays."
            }
            confirmLabel={confirm === "discard" ? "Yes, discard it" : "Yes, start fresh"}
            onConfirm={() => {
              setConfirm(null);
              (confirm === "discard" ? onDiscard : onNewSession)();
            }}
            onCancel={() => setConfirm(null)}
          />
        ) : (
          <div className="mt-6 -ml-3 flex flex-wrap gap-x-2 gap-y-1 border-t border-border pt-4">
            {take && (
              <button className="btn-quiet" onClick={() => setConfirm("discard")}>
                <Trash2 className="size-4" aria-hidden /> Discard recording
              </button>
            )}
            <button className="btn-quiet" onClick={() => (take ? setConfirm("new") : onNewSession())}>
              <RotateCcw className="size-4" aria-hidden /> Start a new session
            </button>
          </div>
        )}
      </section>

      {showSample ? (
        <SampleFeedback onClose={() => setShowSample(false)} />
      ) : (
        <section className="card" aria-labelledby="explore-h">
          <h2 id="explore-h" className="text-xl font-medium">Curious what feedback could look like?</h2>
          <p className="mt-1 text-muted-foreground">These are made-up examples, kept separate from your reading.</p>
          <button className="btn-secondary mt-5" onClick={() => setShowSample(true)}>
            <Sparkles className="size-4" aria-hidden /> Explore sample feedback
          </button>
        </section>
      )}
    </>
  );
}

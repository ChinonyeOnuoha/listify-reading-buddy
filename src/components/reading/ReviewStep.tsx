import { useState } from "react";
import { ArrowLeft, RotateCcw, Sparkles, Trash2 } from "lucide-react";
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
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="card-soft p-5 sm:p-6">
        <button className="pill pill-ghost px-3 py-1.5 text-sm" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden /> Back to reading
        </button>
        {take ? (
          <>
            <h2 className="mt-4 text-xl font-bold">Reading done 🙌🏾 Have a listen back.</h2>
            <p className="mt-1 text-muted-foreground">AI feedback isn't connected yet.</p>
            <div className="mt-4 rounded-2xl bg-peach p-4">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-bold">{take.source === "upload" ? `Uploaded: ${take.name ?? "audio"}` : "Your recording"}</span>
                <span className="tabular-nums text-muted-foreground">
                  {take.duration ? formatTime(take.duration) : "—"} · goal {target} min
                </span>
              </div>
              <audio controls src={take.url} className="mt-3 w-full" />
              <p className="mt-2 text-xs text-muted-foreground">Stays in this browser tab only 🔒</p>
            </div>
          </>
        ) : (
          <p className="mt-4 text-muted-foreground">No recording yet — head back to read when you're ready 📖</p>
        )}

        {confirm ? (
          <div className="mt-4 rounded-2xl border-[1.5px] border-destructive/40 bg-background/70 p-4" role="alertdialog" aria-label="Confirm">
            <p className="font-bold">
              {confirm === "discard"
                ? "Discard this recording? It can't be brought back."
                : "Start a new session? This clears your passage, pages and recording."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="pill pill-primary" onClick={() => { setConfirm(null); (confirm === "discard" ? onDiscard : onNewSession)(); }}>
                Yes, clear it
              </button>
              <button className="pill pill-ghost" onClick={() => setConfirm(null)}>Keep it</button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {take && (
              <button className="pill pill-ghost" onClick={() => setConfirm("discard")}>
                <Trash2 className="size-4" aria-hidden /> Discard recording
              </button>
            )}
            <button className="pill pill-ghost" onClick={() => (take ? setConfirm("new") : onNewSession())}>
              <RotateCcw className="size-4" aria-hidden /> Start a new session
            </button>
          </div>
        )}
      </section>

      {showSample ? (
        <SampleFeedback onClose={() => setShowSample(false)} />
      ) : (
        <section className="card-soft p-5 sm:p-6">
          <h2 className="text-xl font-bold">Curious what feedback will look like?</h2>
          <p className="mt-1 text-muted-foreground">These are made-up examples, separate from your reading.</p>
          <button className="pill pill-primary mt-4" onClick={() => setShowSample(true)}>
            <Sparkles className="size-5" aria-hidden /> Explore sample feedback
          </button>
        </section>
      )}
    </div>
  );
}

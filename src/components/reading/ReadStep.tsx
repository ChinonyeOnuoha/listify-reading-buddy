import { useRef, useState } from "react";
import { ArrowLeft, Headphones, Mic, Square, Upload } from "lucide-react";
import { ConfirmInline } from "./ConfirmInline";
import { PassageView } from "./PassageView";
import type { PageImage } from "./PrepareStep";
import { formatTime } from "./useRecorder";

type Props = {
  mode: "paste" | "upload";
  text: string;
  images: PageImage[];
  target: number;
  recording: boolean;
  micError: boolean;
  elapsed: number;
  takeDuration: number | null;
  onStart: () => void;
  onStop: () => void;
  onUpload: (f: File) => void;
  onBack: () => void;
  onReview: () => void;
};

export function ReadStep(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingReplace, setPendingReplace] = useState<null | "record" | "upload">(null);
  const hasTake = p.takeDuration !== null;
  // While idle with a recording, the timer shows that recording's length so the numbers agree.
  const shown = p.recording ? p.elapsed : (p.takeDuration ?? 0);
  const pct = Math.min(100, (shown / (p.target * 60)) * 100);
  const message = p.micError
    ? "The mic isn't available right now 🎙️ You can allow microphone access in your browser, or upload a recording instead."
    : p.recording
      ? "I'm recording 🎙️ Take your time."
      : hasTake
        ? "You already have a recording. Listen back, or record again."
        : "Got a page in mind? Let's give it a voice 📖";

  // An existing recording is only replaced after a confirm.
  const begin = (kind: "record" | "upload") => {
    if (hasTake) return setPendingReplace(kind);
    run(kind);
  };
  const run = (kind: "record" | "upload") => {
    setPendingReplace(null);
    if (kind === "record") p.onStart();
    else fileRef.current?.click();
  };

  const row = "btn-quiet w-full justify-start";

  return (
    // Desktop: roomy passage card + compact controls card beside it. Phones: controls card first, passage below — nothing overlays the text.
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-[30px]">
      <section aria-label="Your passage" className="card order-2 min-w-0 lg:order-1">
        <button className="btn-quiet -mt-2 -ml-3" onClick={p.onBack} disabled={p.recording}>
          <ArrowLeft className="size-4" aria-hidden /> Edit passage
        </button>
        {p.recording && (
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-2 rounded-full bg-primary" aria-hidden /> Recording · editing is paused until you stop
          </p>
        )}
        <div className="mt-5">
          <PassageView text={p.mode === "paste" ? p.text : undefined} images={p.mode === "upload" ? p.images : undefined} />
        </div>
        {/* Phones only: finishing a long passage shouldn't mean scrolling back up to stop. */}
        {p.recording && (
          <button className="btn-primary rec-pulse mt-8 w-full lg:hidden" onClick={p.onStop}>
            <Square className="size-4" aria-hidden /> Finished? Stop recording
          </button>
        )}
      </section>

      <aside aria-label="Recording controls" className="card order-1 lg:sticky lg:top-24 lg:order-2 lg:p-8">
        <h2 className="text-xl font-medium">Your reading</h2>
        <p className="mt-1 text-sm text-muted-foreground" role="status" aria-live="polite">
          {message}
        </p>

        <div className="mt-5 flex items-baseline justify-between gap-3 lg:block">
          <div className="text-[2rem] leading-none font-semibold tabular-nums">{formatTime(shown)}</div>
          <div className="text-muted-foreground lg:mt-2">of {p.target} min target</div>
        </div>
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress towards today's target"
        >
          <div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${pct}%` }} />
        </div>
        {pct >= 100 && p.recording && <p className="mt-2 text-sm font-medium">Target reached 🎯 Keep going as long as you like.</p>}

        {pendingReplace ? (
          <ConfirmInline
            className="mt-5"
            message={
              pendingReplace === "record"
                ? "Record again? This replaces your current recording."
                : "Upload audio? This replaces your current recording."
            }
            confirmLabel={pendingReplace === "record" ? "Yes, record again" : "Yes, choose a file"}
            onConfirm={() => run(pendingReplace)}
            onCancel={() => setPendingReplace(null)}
          />
        ) : (
          <div className="mt-6">
            {p.recording ? (
              <button className="btn-primary rec-pulse w-full" onClick={p.onStop}>
                <Square className="size-4" aria-hidden /> Stop recording
              </button>
            ) : hasTake ? (
              <button className="btn-primary w-full" onClick={p.onReview}>
                <Headphones className="size-[18px]" aria-hidden /> Listen back
              </button>
            ) : p.micError ? (
              <button className="btn-primary w-full" onClick={() => begin("upload")}>
                <Upload className="size-[18px]" aria-hidden /> Upload audio instead
              </button>
            ) : (
              <button className="btn-primary w-full" onClick={() => begin("record")}>
                <Mic className="size-[18px]" aria-hidden /> Start recording
              </button>
            )}

            {/* Secondary actions: stacked single-line rows, icon 8px from its label. */}
            {!p.recording && (
              <div className="mt-3 flex flex-col border-t border-border pt-2">
                {hasTake ? (
                  <>
                    <button className={row} onClick={() => begin("record")}>
                      <Mic className="size-4 shrink-0" aria-hidden /> Record again
                    </button>
                    <button className={row} onClick={() => begin("upload")}>
                      <Upload className="size-4 shrink-0" aria-hidden /> Upload audio
                    </button>
                  </>
                ) : p.micError ? (
                  <button className={row} onClick={() => begin("record")}>
                    <Mic className="size-4 shrink-0" aria-hidden /> Try the microphone again
                  </button>
                ) : (
                  <button className={row} onClick={() => begin("upload")}>
                    <Upload className="size-4 shrink-0" aria-hidden /> Upload audio instead
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) p.onUpload(f);
            e.target.value = "";
          }}
        />
      </aside>
    </div>
  );
}

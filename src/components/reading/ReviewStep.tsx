import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, Trash2 } from "lucide-react";
import { Companion } from "./Companion";
import { ConfirmInline } from "./ConfirmInline";
import { formatTime, type AudioTake } from "./useRecorder";

type Props = {
  take: AudioTake | null;
  target: number;
  onBack: () => void;
  onDiscard: () => void;
  onNewSession: () => void;
  onExploreSamples: () => void;
  /** Playback position to restore (e.g. after visiting sample feedback). Never autoplays. */
  startAt: number;
  /** Reports the playback position as it changes (play, pause, seek), so it survives leaving this screen. */
  onPosition: (position: number) => void;
};

export function ReviewStep({ take, target, onBack, onDiscard, onNewSession, onExploreSamples, startAt, onPosition }: Props) {
  const [confirm, setConfirm] = useState<null | "discard" | "new">(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // The companion stays still, and isn't a button, while the recording plays.
  const [playing, setPlaying] = useState(false);

  // Pause when leaving. (The position is reported continuously below, not read here: a remount-time read would
  // capture 0 before the restored position is applied.)
  useEffect(() => {
    const a = audioRef.current;
    return () => a?.pause();
  }, []);

  return (
    <>
      {/* Phones: left-aligned with the content edge. Desktop: centred. The right edge is kept free for the companion. */}
      <header className="relative pr-16 text-left sm:pr-0 sm:text-center">
        <Companion
          pose="celebrate"
          interactive={!playing}
          className={`absolute top-0 right-0 w-12 sm:w-14 ${playing ? "pointer-events-none h-auto" : ""}`}
        />
        <h1 id="review-h" tabIndex={-1} className="display-serif text-[1.875rem] text-balance outline-none sm:text-[2.375rem]">
          Reading done 🙌🏾 Have a <em>listen back</em>.
        </h1>
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
            <audio
              ref={audioRef}
              controls
              preload="metadata"
              src={take.url}
              className="mt-4 w-full"
              aria-label="Play back your reading"
              onLoadedMetadata={(e) => {
                if (startAt > 0 && startAt < (e.currentTarget.duration || Infinity)) e.currentTarget.currentTime = startAt;
              }}
              onTimeUpdate={(e) => onPosition(e.currentTarget.currentTime)}
              onSeeked={(e) => onPosition(e.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={(e) => {
                setPlaying(false);
                onPosition(e.currentTarget.currentTime);
              }}
              onEnded={() => setPlaying(false)}
            />
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

      <section className="card" aria-labelledby="explore-h">
        <h2 id="explore-h" className="text-xl font-medium">
          Curious what feedback could look like?
        </h2>
        <p className="mt-1 text-muted-foreground">Illustrative examples on a sample passage, separate from your reading.</p>
        <button className="btn-secondary mt-5" onClick={onExploreSamples}>
          Explore sample feedback <ArrowRight className="size-4" aria-hidden />
        </button>
      </section>
    </>
  );
}

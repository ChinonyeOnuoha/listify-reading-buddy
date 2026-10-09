import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CircleHelp, Meh, RotateCcw, Smile } from "lucide-react";
import { Companion } from "@/components/reading/Companion";
import { ConfirmInline } from "@/components/reading/ConfirmInline";
import { formatTime } from "@/components/reading/useRecorder";
import { getStory } from "@/content/stories";
import type { ChildSession, Reflection } from "./useChildSession";

const FEELINGS: { id: Reflection; label: string; Icon: typeof Smile }[] = [
  { id: "comfortable", label: "Comfortable", Icon: Smile },
  { id: "tricky", label: "A little tricky", Icon: Meh },
  { id: "unsure", label: "Not sure", Icon: CircleHelp },
];

type Props = {
  s: ChildSession;
  /** Leave the corner for the main welcome screen; the session stays where it is. */
  onDone: () => void;
};

/**
 * "You made time to read." Playback, an optional reflection, and the next step. Nothing here scores, ranks or assesses the
 * reading: the three feelings are the child's own impression, kept only in this session's memory.
 */
export function ChildReview({ s, onDone }: Props) {
  const take = s.rec.take;
  const story = s.source?.kind === "story" ? getStory(s.source.slug) : null;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [confirm, setConfirm] = useState(false);

  // Leaving always pauses, and returning never autoplays (the browser only restores the position the child left).
  useEffect(() => {
    const a = audioRef.current;
    return () => a?.pause();
  }, []);

  const recordAgain = () => {
    audioRef.current?.pause();
    s.rec.clear();
    s.setReflection(null);
    setConfirm(false);
    s.setView("read");
  };

  return (
    <>
      <header className="relative pr-16 text-left sm:pr-0 sm:text-center">
        <Companion pose="celebrate" interactive className="absolute top-0 right-0 w-12 sm:w-14" />
        <h1
          id="child-h"
          tabIndex={-1}
          className="display-serif text-[1.875rem] text-balance text-heading outline-none sm:text-[2.5rem]"
        >
          You made <em>time</em> to read.
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">Have a listen back, if you like.</p>
      </header>

      <section className="card" aria-labelledby="child-rec-h">
        <button className="btn-quiet -mt-2 -ml-3" onClick={() => s.setView("read")}>
          <ArrowLeft className="size-4" aria-hidden /> Back to reading
        </button>
        <h2 id="child-rec-h" className="display-serif mt-3 text-[1.5rem] leading-tight">
          {story ? story.title : "Your own story"}
        </h2>
        {take ? (
          <>
            <p className="mt-1 text-muted-foreground tabular-nums">
              {take.source === "upload" ? "Your uploaded audio" : "Your recording"} ·{" "}
              <span className="font-semibold text-foreground">
                {take.duration ? formatTime(take.duration) : "—"}
              </span>
            </p>
            <audio
              ref={audioRef}
              controls
              preload="metadata"
              src={take.url}
              className="mt-4 w-full"
              aria-label="Play back your reading"
              onLoadedMetadata={(e) => {
                const at = s.reviewPos;
                if (at > 0 && at < (e.currentTarget.duration || Infinity))
                  e.currentTarget.currentTime = at;
              }}
              onTimeUpdate={(e) => s.setReviewPos(e.currentTarget.currentTime)}
              onSeeked={(e) => s.setReviewPos(e.currentTarget.currentTime)}
              onPause={(e) => s.setReviewPos(e.currentTarget.currentTime)}
            />
          </>
        ) : (
          <p className="mt-3 text-muted-foreground">
            There’s no recording yet. Head back to read when you’re ready.
          </p>
        )}

        {confirm ? (
          <ConfirmInline
            className="mt-5"
            message="Record again? This replaces your current recording."
            confirmLabel="Yes, record again"
            cancelLabel="Keep it"
            onConfirm={recordAgain}
            onCancel={() => setConfirm(false)}
          />
        ) : (
          take && (
            <button className="btn-secondary mt-5" onClick={() => setConfirm(true)}>
              <RotateCcw className="size-4" aria-hidden /> Record again
            </button>
          )
        )}
      </section>

      <section className="card" aria-labelledby="feel-h">
        <h2 id="feel-h" className="display-serif text-[1.375rem] leading-tight">
          How did that feel?
        </h2>
        <p className="mt-1 text-muted-foreground">
          There’s no right or wrong answer. You can skip this.
        </p>
        <div role="group" aria-labelledby="feel-h" className="mt-4 grid gap-3 sm:grid-cols-3">
          {FEELINGS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={s.reflection === id}
              onClick={() => s.setReflection(s.reflection === id ? null : id)}
              className="tile min-h-14 items-center gap-3 px-4 py-3 sm:flex-col sm:justify-center sm:gap-2 sm:text-center"
            >
              <Icon className="size-6 shrink-0 text-primary" aria-hidden />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-col items-center gap-1 text-center">
        <button
          className="btn-primary btn-pill w-full sm:w-auto sm:min-w-72"
          onClick={() => s.setView("choose")}
        >
          Choose another story <ArrowRight className="size-[18px]" aria-hidden />
        </button>
        <button className="text-link min-h-11" onClick={onDone}>
          I’m done for now
        </button>
      </div>
    </>
  );
}

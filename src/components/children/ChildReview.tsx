import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { Companion } from "@/components/reading/Companion";
import { ConfirmInline } from "@/components/reading/ConfirmInline";
import { formatTime } from "@/components/reading/useRecorder";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getStory } from "@/content/stories";
import type { ChildSession, Reflection } from "./useChildSession";

/** The emoji are decorative (hidden from assistive technology); the text label carries the meaning. */
const FEELINGS: { id: Reflection; emoji: string; label: string }[] = [
  { id: "easy", emoji: "😊", label: "Easy" },
  { id: "hard", emoji: "🙂", label: "A bit hard" },
  { id: "unsure", emoji: "🤔", label: "Not sure" },
];

type Action = "choose" | "shorter" | "again" | "back";
type Response = {
  emoji: string;
  heading: string;
  message: string;
  primary: { label: string; action: Action };
  secondary: { label: string; action: Action };
};

/** What each feeling opens. Wording is fixed by the design; "Find a shorter story" becomes "Browse short stories" for own content. */
const RESPONSES: Record<Reflection, Response> = {
  easy: {
    emoji: "😊",
    heading: "Ready for another?",
    message: "Pick a story you’d like to read next.",
    primary: { label: "Choose a story", action: "choose" },
    secondary: { label: "Back to my recording", action: "back" },
  },
  hard: {
    emoji: "🙂",
    heading: "That’s okay.",
    message: "Would you like a shorter story?",
    primary: { label: "Find a shorter story", action: "shorter" },
    secondary: { label: "Back to my recording", action: "back" },
  },
  unsure: {
    emoji: "🤔",
    heading: "That’s okay too.",
    message: "You can listen again or pick another story.",
    primary: { label: "Listen again", action: "again" },
    secondary: { label: "Choose a story", action: "choose" },
  },
};

type Props = {
  s: ChildSession;
  /** Leave the corner for the main welcome screen; the session stays where it is. */
  onDone: () => void;
};

/**
 * "You made time to read." Playback, an optional reflection, and the next step. Nothing here scores, ranks or assesses the
 * reading: the three feelings are the child's own impression, kept only in this session's memory. Choosing one opens a short
 * response in a modal (nothing is revealed on the page itself); closing it keeps both the choice and the recording.
 */
export function ChildReview({ s, onDone }: Props) {
  const take = s.rec.take;
  const story = s.source?.kind === "story" ? getStory(s.source.slug) : null;
  const audioRef = useRef<HTMLAudioElement>(null);
  const choiceRefs = useRef<Partial<Record<Reflection, HTMLButtonElement | null>>>({});
  const [confirm, setConfirm] = useState(false);
  const [open, setOpen] = useState<Reflection | null>(null);
  const [playError, setPlayError] = useState(false);
  // Actions that leave this screen wait until the modal has fully closed (see `run`).
  const [pending, setPending] = useState<Action | null>(null);
  // Where focus returns when the response modal closes: the choice that opened it, or the player.
  const returnTo = useRef<"choice" | "player">("choice");

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

  const choose = (id: Reflection) => {
    audioRef.current?.pause(); // opening a modal pauses playback; closing it never resumes it
    returnTo.current = "choice";
    s.setReflection(id);
    setOpen(id);
  };

  /**
   * Close the modal first; anything that leaves this screen happens only after it has closed. Navigating away in the same
   * update would unmount the dialog abruptly and leave the page locked (pointer events switched off on the body).
   */
  const run = (action: Action) => {
    setOpen(null);
    // Staying here (playing again, or back to the player) happens at once, inside the click: some browsers only allow
    // playback that starts within the tap itself. Anything that navigates away waits for the modal to close.
    if (action === "back" || action === "again") perform(action);
    else setPending(action);
  };
  useEffect(() => {
    if (open || !pending) return;
    const action = pending;
    setPending(null);
    perform(action);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- perform only reads current props and refs
  }, [open, pending]);

  const perform = (action: Action) => {
    if (action === "back") {
      returnTo.current = "player";
      return;
    }
    if (action === "again") {
      // The click that chose this: restart the existing recording from the beginning, and say so if the browser won't play it.
      returnTo.current = "player";
      const a = audioRef.current;
      if (!a || !take) return setPlayError(true);
      setPlayError(false);
      a.currentTime = 0;
      s.setReviewPos(0);
      void Promise.resolve(a.play()).catch(() => setPlayError(true));
      return;
    }
    // Both "choose" and "shorter" open the catalogue; the recording is kept either way.
    s.setTab("pick");
    s.setLengthFilter(
      action === "shorter"
        ? story
          ? { kind: "shorter", words: story.words, title: story.title }
          : { kind: "short" }
        : null,
    );
    s.setView("choose");
  };

  const response = open ? RESPONSES[open] : null;
  const primaryLabel =
    response && open === "hard" && !story ? "Browse short stories" : response?.primary.label;

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
              onPlay={() => setPlayError(false)}
            />
            {playError && (
              <p role="alert" className="mt-2 text-sm font-medium text-destructive">
                The recording couldn’t be played just now. You can try the play button above.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mt-3 text-muted-foreground">
              There’s no recording yet. Head back to read when you’re ready.
            </p>
            {playError && (
              <p role="alert" className="mt-2 text-sm font-medium text-destructive">
                There’s no recording to play yet.
              </p>
            )}
          </>
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
          How was reading?
        </h2>
        <p className="mt-1 text-muted-foreground">
          There’s no right or wrong answer. You can skip this.
        </p>
        <div role="group" aria-labelledby="feel-h" className="mt-4 grid gap-3 sm:grid-cols-3">
          {FEELINGS.map(({ id, emoji, label }) => (
            <button
              key={id}
              ref={(el) => {
                choiceRefs.current[id] = el;
              }}
              type="button"
              aria-pressed={s.reflection === id}
              aria-haspopup="dialog"
              onClick={() => choose(id)}
              className="tile min-h-14 items-center gap-3 px-4 py-3 sm:flex-col sm:justify-center sm:gap-1.5 sm:text-center"
            >
              <span aria-hidden className="text-[1.75rem] leading-none">
                {emoji}
              </span>
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-col items-center gap-1 text-center">
        <button
          className="btn-primary btn-pill w-full sm:w-auto sm:min-w-72"
          onClick={() => {
            s.setLengthFilter(null);
            s.setView("choose");
          }}
        >
          Choose another story <ArrowRight className="size-[18px]" aria-hidden />
        </button>
        <button className="text-link min-h-11" onClick={onDone}>
          I’m done for now
        </button>
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            const target =
              returnTo.current === "player" && audioRef.current
                ? audioRef.current
                : s.reflection
                  ? choiceRefs.current[s.reflection]
                  : null;
            target?.focus({ preventScroll: true });
          }}
          className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto overscroll-contain rounded-[26px] border-border bg-card p-6 pt-12 text-center text-foreground sm:p-8 sm:pt-12"
        >
          {response && (
            <>
              <span
                aria-hidden
                className="mx-auto grid size-24 place-items-center rounded-full border border-apricot bg-apricot-tint text-[3.5rem] leading-none"
              >
                {response.emoji}
              </span>
              <DialogTitle className="display-serif text-[1.75rem] leading-tight">
                {response.heading}
              </DialogTitle>
              <DialogDescription className="text-base text-foreground">
                {response.message}
              </DialogDescription>
              <div className="mt-1 flex flex-col gap-2">
                <button
                  type="button"
                  className="btn-primary btn-pill w-full"
                  onClick={() => run(response.primary.action)}
                  autoFocus
                >
                  {primaryLabel}
                </button>
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => run(response.secondary.action)}
                >
                  {response.secondary.label}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

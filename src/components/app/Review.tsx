import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal, Pause, Play } from "lucide-react";
import { CompanionPerchless } from "./Buddy";
import { Modal, ScreenTitle } from "./ui";
import { formatTime, type AudioTake } from "@/components/reading/useRecorder";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Play, pause and seek the recording. Leaving the screen pauses; returning never plays on its own. */
export function Player({
  take,
  startAt = 0,
  onPosition,
  audioRef: outer,
}: {
  take: AudioTake;
  startAt?: number;
  onPosition?: (t: number) => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}) {
  const inner = useRef<HTMLAudioElement>(null);
  const ref = outer ?? inner;
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(startAt);
  const [len, setLen] = useState(take.duration || 0);
  const [problem, setProblem] = useState(false);
  useEffect(() => {
    const a = ref.current;
    return () => a?.pause();
  }, [ref]);

  const toggle = async () => {
    const a = ref.current;
    if (!a) return;
    if (!a.paused) return a.pause();
    try {
      setProblem(false);
      await a.play();
    } catch {
      setProblem(true);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 rounded-2xl bg-raised p-4">
        <button
          type="button"
          onClick={() => void toggle()}
          aria-label={playing ? "Pause playback" : "Play your recording"}
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-100 active:scale-95"
        >
          {playing ? (
            <Pause className="size-5 fill-current" aria-hidden />
          ) : (
            <Play className="ml-0.5 size-5 fill-current" aria-hidden />
          )}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <input
            type="range"
            min={0}
            max={len || 0}
            step={0.1}
            value={Math.min(at, len || 0)}
            aria-label="Playback position"
            aria-valuetext={`${formatTime(at)} of ${formatTime(len)}`}
            onChange={(e) => {
              const v = +e.target.value;
              if (ref.current) ref.current.currentTime = v;
              setAt(v);
              onPosition?.(v);
            }}
            className="rb-range w-full"
            style={{ ["--pct" as string]: `${len ? (at / len) * 100 : 0}%` }}
          />
          <div className="flex justify-between text-sm text-muted-foreground tabular-nums">
            <span>{formatTime(at)}</span>
            <span>{len ? formatTime(len) : "—"}</span>
          </div>
        </div>
      </div>
      {problem && (
        <p role="alert" className="text-sm text-destructive">
          The recording couldn’t be played just now. Try again in a moment.
        </p>
      )}
      <audio
        ref={ref}
        src={take.url}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setLen(d);
          if (startAt > 0 && startAt < (d || Infinity)) e.currentTarget.currentTime = startAt;
        }}
        onTimeUpdate={(e) => {
          setAt(e.currentTarget.currentTime);
          onPosition?.(e.currentTarget.currentTime);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}

export type MoreItem = { label: string; onSelect: () => void; danger?: boolean };

/** The ⋯ More menu: everything that isn't the screen's main action. */
export function MoreMenu({ items, label = "More options" }: { items: MoreItem[]; label?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="btn-secondary min-h-14 w-14 px-0" aria-label={label}>
        <MoreHorizontal className="size-5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="rb-menu">
        {items.map((m) => (
          <DropdownMenuItem
            key={m.label}
            className={m.danger ? "rb-menu-danger" : ""}
            onSelect={m.onSelect}
          >
            {m.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Main practice: listen back. Record again is the main action; the rest is under ⋯. */
export function AdultReview({
  take,
  target,
  startAt,
  onPosition,
  onRecordAgain,
  onBackToNook,
  more,
  feedback,
}: {
  take: AudioTake | null;
  target: number | null;
  startAt: number;
  onPosition: (t: number) => void;
  onRecordAgain: () => void;
  onBackToNook: () => void;
  more: MoreItem[];
  /** Optional AI feedback (main practice only), when it's connected. */
  feedback?: ReactNode;
}) {
  return (
    <>
      <div className="panel-body">
        <div className="flex items-end justify-between gap-4">
          <ScreenTitle>Have a listen back</ScreenTitle>
          <CompanionPerchless pose="celebrate" className="w-12 shrink-0" />
        </div>
        <p className="lead">
          {take
            ? take.source === "upload"
              ? `Your uploaded recording${take.name ? `, ${take.name}` : ""}.`
              : `You recorded ${formatTime(take.duration)}${target ? ` of your ${target} minutes` : ""}.`
            : "No recording yet. Head back to read when you’re ready."}
        </p>
        {take && <Player key={take.url} take={take} startAt={startAt} onPosition={onPosition} />}
        {feedback ? (
          <>
            <p className="text-sm text-muted-foreground">Saved on this device.</p>
            {take && feedback}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Saved on this device. AI feedback isn’t connected yet.
          </p>
        )}
      </div>
      <div className="panel-foot">
        <div className="flex gap-2">
          <button type="button" className="btn-primary flex-1" onClick={onRecordAgain}>
            {take ? "Record again" : "Start reading"}
          </button>
          <MoreMenu items={more} />
        </div>
        <button type="button" className="btn-link w-full" onClick={onBackToNook}>
          Back to your nook
        </button>
      </div>
    </>
  );
}

export type Feeling = "easy" | "hard" | "unsure";
/** The app's own three feelings. The emoji are decorative; the words carry the meaning. */
export const FEELINGS: { id: Feeling; emoji: string; label: string }[] = [
  { id: "easy", emoji: "😊", label: "Easy" },
  { id: "hard", emoji: "🙂", label: "A bit hard" },
  { id: "unsure", emoji: "🤔", label: "Not sure" },
];

export type KidResponseAction = "choose" | "shorter" | "again" | "close";
const RESPONSES: Record<
  Feeling,
  {
    emoji: string;
    title: string;
    body: string;
    primary: [string, KidResponseAction];
    secondary: [string, KidResponseAction];
  }
> = {
  easy: {
    emoji: "😊",
    title: "Ready for another?",
    body: "Pick a story you’d like to read next.",
    primary: ["Choose a story", "choose"],
    secondary: ["Not now", "close"],
  },
  hard: {
    emoji: "🙂",
    title: "That’s okay.",
    body: "Would you like a shorter story next?",
    primary: ["Find a shorter story", "shorter"],
    secondary: ["Not now", "close"],
  },
  unsure: {
    emoji: "🤔",
    title: "That’s okay too.",
    body: "You can listen again, or pick another story.",
    primary: ["Listen again", "again"],
    secondary: ["Choose a story", "choose"],
  },
};

/**
 * Children's corner: "You made time to read." Playback, "How was reading?" and the next step. Nothing here scores or
 * assesses the reading: the feeling is the child's own and stays on this device. A response opens only after a choice.
 */
export function KidReview({
  title,
  take,
  feeling,
  ownContent,
  startAt,
  onPosition,
  onFeeling,
  onAction,
  onChooseAnother,
  onDone,
  more,
  extra,
}: {
  title: string;
  take: AudioTake | null;
  feeling: Feeling | null;
  ownContent: boolean;
  startAt: number;
  onPosition: (t: number) => void;
  onFeeling: (f: Feeling) => void;
  onAction: (a: KidResponseAction) => void;
  onChooseAnother: () => void;
  onDone: () => void;
  more: MoreItem[];
  extra?: ReactNode;
}) {
  const [open, setOpen] = useState<Feeling | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const choiceRefs = useRef<Partial<Record<Feeling, HTMLButtonElement | null>>>({});
  const returnRef = useRef<HTMLElement | null>(null);
  const r = open ? RESPONSES[open] : null;
  const primaryLabel = r && open === "hard" && ownContent ? "Browse short stories" : r?.primary[0];

  const act = (a: KidResponseAction) => {
    setOpen(null);
    if (a === "again") {
      const el = audioRef.current;
      if (el) {
        el.currentTime = 0;
        void Promise.resolve(el.play()).catch(() => {});
      }
      return;
    }
    if (a !== "close") onAction(a);
  };

  return (
    <>
      <div className="panel-body">
        <div className="flex items-end justify-between gap-4">
          <ScreenTitle kid>You made time to read</ScreenTitle>
          <CompanionPerchless pose="celebrate" className="w-12 shrink-0" />
        </div>
        <p className="lead kid">
          {title}
          {take ? ` · ${take.duration ? formatTime(take.duration) : ""}` : ""}
        </p>
        {take ? (
          <Player
            key={take.url}
            take={take}
            startAt={startAt}
            onPosition={onPosition}
            audioRef={audioRef}
          />
        ) : (
          <p className="lead">No recording yet.</p>
        )}
        <div role="group" aria-labelledby="feel-h" className="flex flex-col gap-3">
          <h2 id="feel-h" className="kid text-lg font-bold">
            How was reading?
          </h2>
          <div className="flex flex-wrap gap-2">
            {FEELINGS.map((f) => (
              <button
                key={f.id}
                ref={(el) => {
                  choiceRefs.current[f.id] = el;
                }}
                type="button"
                aria-pressed={feeling === f.id}
                onClick={() => {
                  audioRef.current?.pause();
                  returnRef.current = choiceRefs.current[f.id] ?? null;
                  onFeeling(f.id);
                  setOpen(f.id);
                }}
                className={`kid inline-flex min-h-12 items-center gap-2 rounded-full pr-4 pl-3 font-bold transition-colors duration-200 ${
                  feeling === f.id
                    ? "bg-selected shadow-[inset_0_0_0_2px_var(--amber)]"
                    : "bg-raised hover:bg-selected"
                }`}
              >
                <span aria-hidden className="text-xl leading-none">
                  {f.emoji}
                </span>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {extra}
      </div>
      <div className="panel-foot">
        <div className="flex gap-2">
          <button type="button" className="btn-primary kid flex-1" onClick={onChooseAnother}>
            Choose another story
          </button>
          <MoreMenu items={more} />
        </div>
        <button type="button" className="btn-link kid w-full" onClick={onDone}>
          I’m done for now
        </button>
      </div>

      <Modal
        open={!!r}
        onClose={() => setOpen(null)}
        title={
          r ? (
            <span className="kid">
              <span aria-hidden>{r.emoji} </span>
              {r.title}
            </span>
          ) : (
            ""
          )
        }
        returnFocus={returnRef}
      >
        {r && (
          <>
            <p className="kid text-lg">{r.body}</p>
            <div className="rb-acts">
              <button
                type="button"
                className="btn-secondary kid"
                onClick={() => act(r.secondary[1])}
              >
                {r.secondary[0]}
              </button>
              <button
                type="button"
                className="btn-primary kid min-h-12 text-base"
                onClick={() => act(r.primary[1])}
              >
                {primaryLabel}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

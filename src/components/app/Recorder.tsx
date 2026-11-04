import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Companion } from "@/components/reading/Companion";
import { formatTime } from "@/components/reading/useRecorder";
import type { ReadingSession } from "@/lib/reading-session";

type Props = {
  rec: ReadingSession["rec"];
  /** Minutes: the main practice target, or the reading time a grown-up set in the children's corner. Null for none. */
  target: number | null;
  kid: boolean;
  /** Start recording (the parent may explain the microphone first). */
  onStart: () => void;
  onListenBack: () => void;
};

/**
 * Recording controls: one main action and at most one alternative, with the timer and progress. A card beside the reading
 * on wide screens and a dock pinned under it on narrow ones (both are rendered; CSS shows one). Paused time never counts,
 * and reaching the time never stops anything.
 */
export function Recorder({ rec, target, kid, onStart, onListenBack }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLAudioElement>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewProblem, setPreviewProblem] = useState<string | null>(null);

  const s = rec.state;
  const unfinished = rec.unfinished;
  const hasTake = !!rec.take;
  const shown = unfinished ? rec.elapsed : (rec.take?.duration ?? 0);
  const pct = target ? Math.min(100, (shown / (target * 60)) * 100) : 0;
  const reached = !!target && pct >= 100;

  const stopPreview = () => {
    const a = previewRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setPreviewing(false);
  };
  useEffect(() => () => previewRef.current?.pause(), []);
  useEffect(() => {
    if (s !== "paused") stopPreview();
  }, [s]);

  const togglePreview = async () => {
    setPreviewProblem(null);
    if (previewing) return stopPreview();
    const url = await rec.previewSoFar();
    const a = previewRef.current;
    if (!url || !a) return;
    a.src = url;
    try {
      await a.play();
      setPreviewing(true);
    } catch {
      setPreviewProblem("What you’ve recorded couldn’t be played here. It’s still safe.");
    }
  };

  type Act = { label: string; short?: string; run: () => void; busy?: boolean };
  const finishLabel = kid ? "I’ve finished" : "Finish";
  const upload = () => fileRef.current?.click();
  const [pri, sec]: [Act, Act | null] =
    s === "starting"
      ? [{ label: "Starting…", run: () => {}, busy: true }, null]
      : s === "finishing"
        ? [{ label: "Finishing…", run: () => {}, busy: true }, null]
        : s === "recording"
          ? [
              { label: "Pause", run: () => void rec.pause() },
              { label: finishLabel, run: () => void finish() },
            ]
          : s === "paused"
            ? [
                { label: "Resume", run: () => void resume() },
                { label: finishLabel, run: () => void finish() },
              ]
            : hasTake
              ? [
                  { label: "Listen back", run: onListenBack },
                  { label: "Record again", short: "Again", run: onStart },
                ]
              : rec.micError
                ? [
                    { label: "Upload a recording instead", short: "Upload", run: upload },
                    { label: "Try the microphone again", short: "Try mic", run: onStart },
                  ]
                : [
                    { label: "Start recording", run: onStart },
                    { label: "Upload a recording", short: "Upload", run: upload },
                  ];

  async function resume() {
    setPreviewProblem(null);
    stopPreview();
    await rec.resume();
  }
  async function finish() {
    setPreviewProblem(null);
    stopPreview();
    await rec.finish();
  }

  const status =
    s === "starting"
      ? "Starting…"
      : s === "recording"
        ? "Recording"
        : s === "paused"
          ? previewing
            ? "Paused · playing back"
            : "Paused"
          : s === "finishing"
            ? "Finishing…"
            : rec.micError
              ? "Microphone unavailable"
              : hasTake
                ? "Recorded"
                : "Ready";

  const hint =
    previewProblem ??
    rec.problem ??
    (s === "recording"
      ? reached && !kid
        ? "Target reached. Keep going as long as you like."
        : kid
          ? "Buddy is listening. Read at your own speed."
          : "Take your time."
      : s === "paused"
        ? "Paused time doesn’t count."
        : rec.micError
          ? "Allow the microphone in your browser, or upload a recording instead."
          : hasTake
            ? "Recording again replaces this one when you finish."
            : kid
              ? "Press the button and read out loud."
              : "Only recorded time counts.");

  const dot = (
    <span
      aria-hidden
      className={`size-3 shrink-0 rounded-full ${
        s === "recording"
          ? "rec-pulse bg-recording"
          : s === "paused"
            ? "border-2 border-muted-foreground"
            : "bg-faint"
      }`}
    />
  );
  const progress = (
    <div
      className="track"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={
        kid
          ? "Reading time a grown-up set"
          : "Recorded time toward today’s target (paused time doesn’t count)"
      }
    >
      <div style={{ width: `${pct}%` }} />
    </div>
  );
  const icon = (a: Act) =>
    a.busy ? (
      <Loader2 className="size-[18px] animate-spin motion-reduce:animate-none" aria-hidden />
    ) : null;
  const listenSoFar =
    s === "paused" ? (
      <button
        type="button"
        className="btn-link"
        aria-pressed={previewing}
        onClick={() => void togglePreview()}
      >
        {previewing ? "Stop listening" : "Listen to what you’ve recorded"}
      </button>
    ) : null;

  return (
    <>
      {/* Wide screens: a card beside the reading. */}
      <aside
        aria-label="Recording controls"
        className="hidden w-[21rem] shrink-0 flex-col gap-4 self-start rounded-[20px] bg-card p-6 wide:flex"
      >
        <div className="flex items-center justify-between">
          <span
            className="flex items-center gap-2.5 font-semibold"
            role="status"
            aria-live="polite"
          >
            {dot}
            {status}
          </span>
          <Companion pose="listen" className="pointer-events-none h-auto w-9" />
        </div>
        <div className="text-[2.5rem] leading-none font-semibold tabular-nums">
          {formatTime(shown)}
          {target ? (
            <span className="ml-1.5 text-base font-normal text-muted-foreground">
              of {target} min
            </span>
          ) : null}
        </div>
        {target ? progress : null}
        <p
          className={`min-h-[2.6rem] text-sm text-muted-foreground ${kid ? "kid" : ""}`}
          role={previewProblem || rec.problem ? "alert" : undefined}
        >
          {hint}
        </p>
        <button type="button" className="btn-primary w-full" onClick={pri.run} disabled={pri.busy}>
          {icon(pri)} {pri.label}
        </button>
        {sec && (
          <button type="button" className="btn-secondary w-full" onClick={sec.run}>
            {sec.label}
          </button>
        )}
        {listenSoFar}
      </aside>

      {/* Narrow screens: a dock pinned to the bottom of the reading. */}
      <div
        role="region"
        aria-label="Recording controls"
        className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2.5 border-t border-border bg-card px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] wide:hidden"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 font-semibold">
            {dot}
            {status}
          </span>
          <span className="font-semibold tabular-nums">
            {formatTime(shown)}
            {target ? (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                of {target} min
              </span>
            ) : null}
          </span>
        </div>
        {target ? progress : null}
        {(previewProblem || rec.problem || rec.micError) && (
          <p role="alert" className="text-sm">
            {hint}
          </p>
        )}
        <div className="flex gap-2">
          {sec && (
            <button type="button" className="btn-secondary flex-1 px-3" onClick={sec.run}>
              {sec.short ?? sec.label}
            </button>
          )}
          <button
            type="button"
            className="btn-primary flex-[2] px-3"
            onClick={pri.run}
            disabled={pri.busy}
          >
            {icon(pri)} {pri.label}
          </button>
        </div>
        {listenSoFar}
      </div>

      <audio ref={previewRef} onEnded={() => setPreviewing(false)} className="hidden" />
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) rec.upload(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

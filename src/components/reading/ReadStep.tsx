import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { ArrowLeft, Check, Headphones, Loader2, Mic, Pause, Play, Square, Upload } from "lucide-react";
import { Companion } from "./Companion";
import { ConfirmInline } from "./ConfirmInline";
import { PassageView } from "./PassageView";
import type { PageImage } from "./PrepareStep";
import { formatTime, type RecState } from "./useRecorder";

type Props = {
  mode?: "paste" | "upload";
  text?: string;
  images?: PageImage[];
  /** Replaces the passage area (the children's corner shows its own illustrated stories here). */
  passage?: ReactNode;
  /** Label of the passage region and of the back button; defaults suit the adult flow. */
  passageLabel?: string;
  backLabel?: string;
  /** Minutes, or null for no target at all: then there is no progress bar, no "of N min" and no "target reached". */
  target: number | null;
  recState: RecState;
  micError: boolean;
  problem: string | null;
  elapsed: number;
  takeDuration: number | null;
  onStart: () => void;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onPreview: () => Promise<string | null>;
  onFinish: () => Promise<unknown>;
  onUpload: (f: File) => void;
  onBack: () => void;
  onReview: () => void;
  /** Space the page must reserve at its very bottom for the phone dock (0 on desktop, where the dock is hidden). */
  onReserve: (px: number) => void;
};

type Action = { key: string; label: string; Icon: ComponentType<{ className?: string }>; onClick: () => void; primary?: boolean; disabled?: boolean; pressed?: boolean };

export function ReadStep(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLAudioElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [dockH, setDockH] = useState(0);
  const [pendingReplace, setPendingReplace] = useState<null | "record" | "upload">(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewProblem, setPreviewProblem] = useState<string | null>(null);

  const s = p.recState;
  const unfinished = s === "recording" || s === "paused" || s === "starting" || s === "finishing";
  const hasTake = p.takeDuration !== null;
  // The timer shows recorded time only; when idle with a recording, that recording's length.
  const shown = unfinished ? p.elapsed : (p.takeDuration ?? 0);
  const pct = p.target ? Math.min(100, (shown / (p.target * 60)) * 100) : 0;

  // Measure the phone dock so the passage always has room to scroll clear of it (rotation, chrome changes, messages).
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDockH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // The page reserves the dock's height at its very bottom; keyboard focus moving down also stays clear of it.
  const reserveRef = useRef(p.onReserve);
  reserveRef.current = p.onReserve;
  useEffect(() => {
    reserveRef.current(dockH);
    document.documentElement.style.scrollPaddingBottom = `${dockH + 16}px`;
    return () => {
      reserveRef.current(0);
      document.documentElement.style.scrollPaddingBottom = "";
    };
  }, [dockH]);

  const stopPreview = () => {
    const a = previewRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setPreviewing(false);
  };
  useEffect(() => () => previewRef.current?.pause(), []);
  // Leaving the paused state for any reason stops the preview first.
  useEffect(() => {
    if (s !== "paused") stopPreview();
  }, [s]);

  const togglePreview = async () => {
    setPreviewProblem(null);
    if (previewing) return stopPreview();
    const url = await p.onPreview();
    const a = previewRef.current;
    if (!url || !a) return;
    a.src = url;
    try {
      await a.play();
      setPreviewing(true);
    } catch {
      setPreviewProblem("The recording so far couldn't be played here. It's still safe — you can resume or finish.");
    }
  };
  const resume = async () => {
    setPreviewProblem(null);
    stopPreview(); // never let preview playback overlap new capture
    await p.onResume();
  };
  const finish = async () => {
    setPreviewProblem(null); // so a finishing problem isn't hidden behind an older preview message
    stopPreview();
    await p.onFinish();
  };

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

  // Only the actions that make sense right now.
  const actions: Action[] =
    s === "starting"
      ? [{ key: "starting", label: "Starting…", Icon: Loader2, onClick: () => {}, primary: true, disabled: true }]
      : s === "finishing"
        ? [{ key: "finishing", label: "Finishing…", Icon: Loader2, onClick: () => {}, primary: true, disabled: true }]
        : s === "recording"
          ? [
              { key: "pause", label: "Pause", Icon: Pause, onClick: () => void p.onPause() },
              { key: "finish", label: "Finish recording", Icon: Check, onClick: () => void finish(), primary: true },
            ]
          : s === "paused"
            ? [
                { key: "resume", label: "Resume recording", Icon: Mic, onClick: () => void resume(), primary: true },
                { key: "listen", label: previewing ? "Stop listening" : "Listen so far", Icon: previewing ? Square : Play, onClick: () => void togglePreview(), pressed: previewing },
                { key: "finish", label: "Finish recording", Icon: Check, onClick: () => void finish() },
              ]
            : hasTake
              ? [
                  { key: "review", label: "Listen back", Icon: Headphones, onClick: p.onReview, primary: true },
                  { key: "again", label: "Record again", Icon: Mic, onClick: () => begin("record") },
                  { key: "upload", label: "Upload audio", Icon: Upload, onClick: () => begin("upload") },
                ]
              : p.micError
                ? [
                    { key: "upload", label: "Upload audio instead", Icon: Upload, onClick: () => begin("upload"), primary: true },
                    { key: "retry", label: "Retry microphone", Icon: Mic, onClick: () => begin("record") },
                  ]
                : [
                    { key: "start", label: "Start recording", Icon: Mic, onClick: () => begin("record"), primary: true },
                    { key: "upload", label: "Upload audio", Icon: Upload, onClick: () => begin("upload") },
                  ];

  const status =
    s === "starting"
      ? "Starting…"
      : s === "recording"
        ? p.target && pct >= 100
          ? "Target reached — keep going"
          : "Recording"
        : s === "paused"
          ? previewing
            ? "Paused · playing what you've recorded"
            : "Paused"
          : s === "finishing"
            ? "Finishing…"
            : p.micError
              ? "Microphone unavailable"
              : hasTake
                ? "Recorded"
                : "Ready to record";

  const alert = previewProblem ?? p.problem ?? (p.micError && !hasTake && s === "idle" ? "You can allow microphone access in your browser, or upload a recording instead." : null);

  const friendly =
    s === "recording"
      ? p.target && pct >= 100
        ? "Target reached 🎯 Keep going as long as you like."
        : "I'm recording 🎙️ Take your time."
      : s === "paused"
        ? "Paused. Listen back, pick up where you left off, or finish."
        : p.micError
          ? "The mic isn't available right now 🎙️"
          : hasTake
            ? "You already have a recording. Listen back, or record again."
            : "Got a page in mind? Let's give it a voice 📖";

  const dot = (
    <span
      aria-hidden
      className={`size-2.5 shrink-0 rounded-full ${s === "recording" ? "rec-pulse bg-primary" : s === "paused" ? "border-2 border-primary" : "bg-line"}`}
    />
  );
  const progress = (cls: string) => (
    <div
      className={`overflow-hidden rounded-full bg-muted ${cls}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Recorded time towards today's target (paused time doesn't count)"
    >
      <div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${pct}%` }} />
    </div>
  );
  const confirm = pendingReplace && (
    <ConfirmInline
      className="p-3"
      message={pendingReplace === "record" ? "Record again? This replaces your current recording." : "Upload audio? This replaces your current recording."}
      confirmLabel={pendingReplace === "record" ? "Yes, record again" : "Yes, choose a file"}
      onConfirm={() => run(pendingReplace)}
      onCancel={() => setPendingReplace(null)}
    />
  );

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-[30px]">
      {/* Passage first on every screen. */}
      <section aria-label={p.passageLabel ?? "Your passage"} className="card min-w-0">
        <button className="btn-quiet -mt-2 -ml-3" onClick={p.onBack} disabled={unfinished}>
          <ArrowLeft className="size-4" aria-hidden /> {p.backLabel ?? "Edit passage"}
        </button>
        <div className="mt-4">
          {p.passage ?? <PassageView text={p.mode === "paste" ? p.text : undefined} images={p.mode === "upload" ? p.images : undefined} />}
        </div>
      </section>

      {/* ---- Phones and tablets: compact opaque dock anchored to the bottom of the visible viewport.
             On landscape phones / short screens (max-height 480px) it collapses to one row. ---- */}
      <div
        ref={dockRef}
        role="region"
        aria-label="Recording controls"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card lg:hidden"
      >
        <div
          className={`mx-auto flex max-w-3xl flex-col gap-2 px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] [@media(max-height:480px)]:flex-row [@media(max-height:480px)]:items-center [@media(max-height:480px)]:gap-4 [@media(max-height:480px)]:pt-2`}
        >
          <div className={`min-w-0 [@media(max-height:480px)]:w-2/5`}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 font-medium" role="status" aria-live="polite">
                {/* Small and quiet; the negative margins keep it from making the dock any taller. */}
                <Companion pose="listen" className="pointer-events-none -my-1 hidden h-7 w-auto shrink-0 min-[360px]:block" />
                {dot}
                <span className="truncate">{status}</span>
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{formatTime(shown)}</span>{p.target ? ` / ${p.target} min` : ""}
              </span>
            </div>
            {p.target ? progress("mt-1.5 h-1.5") : null}
            {alert && (
              <p role="alert" className="mt-1.5 text-xs text-foreground">
                {alert}
              </p>
            )}
          </div>
          {confirm ?? (
            <div
              className={`grid grid-cols-2 gap-2 [@media(max-height:480px)]:flex [@media(max-height:480px)]:flex-1 [@media(max-height:480px)]:justify-end`}
            >
              {actions.map((a, i) => (
                <button
                  key={a.key}
                  onClick={a.onClick}
                  disabled={a.disabled}
                  aria-pressed={a.pressed}
                  className={`${a.primary ? "btn-primary" : "btn-secondary"} min-h-11 px-2 text-sm max-[359px]:text-[13px] max-[359px]:[&_svg]:hidden ${
                    actions.length === 3 && i === 0 ? `col-span-2 [@media(max-height:480px)]:col-auto` : actions.length === 1 ? "col-span-2" : ""
                  } ${p.micError && s === "idle" && !hasTake ? "col-span-2" : ""}`}
                >
                  <a.Icon className={`size-4 shrink-0 ${a.key === "starting" || a.key === "finishing" ? "animate-spin motion-reduce:animate-none" : ""}`} />
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- Desktop: compact controls card beside the passage ---- */}
      <aside aria-label="Recording controls" className="card hidden lg:sticky lg:top-24 lg:block lg:p-8">
        {/* Sits quietly in the corner; the heading and message reserve room beside it. */}
        <Companion pose="listen" className="pointer-events-none absolute top-8 right-8 h-auto w-9" />
        <h2 className="pr-12 text-xl font-semibold">Your reading</h2>
        <p className="mt-1 pr-12 text-sm text-muted-foreground">{friendly}</p>
        <p className="mt-4 flex items-center gap-2 text-sm font-medium">
          {dot}
          {status}
        </p>
        <div className="mt-2 text-[2rem] leading-none font-semibold tabular-nums">{formatTime(shown)}</div>
        {p.target ? <div className="mt-2 text-muted-foreground">of {p.target} min target</div> : null}
        {p.target ? progress("mt-4 h-2") : null}
        {alert && (
          <p role="alert" className="mt-3 text-sm">
            {alert}
          </p>
        )}
        <div className="mt-6">
          {confirm ?? (
            <>
              {actions
                .filter((a) => a.primary)
                .map((a) => (
                  <button key={a.key} className="btn-primary w-full" onClick={a.onClick} disabled={a.disabled}>
                    <a.Icon className={`size-[18px] ${a.disabled ? "animate-spin motion-reduce:animate-none" : ""}`} /> {a.label}
                  </button>
                ))}
              {actions.some((a) => !a.primary) && (
                <div className="mt-3 flex flex-col border-t border-border pt-2">
                  {actions
                    .filter((a) => !a.primary)
                    .map((a) => (
                      <button key={a.key} className="btn-quiet w-full justify-start" onClick={a.onClick} aria-pressed={a.pressed}>
                        <a.Icon className="size-4 shrink-0" /> {a.label}
                      </button>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

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
          if (f) p.onUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

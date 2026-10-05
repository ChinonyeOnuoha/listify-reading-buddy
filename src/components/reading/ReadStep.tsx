import { ArrowLeft, Mic, Square, Upload } from "lucide-react";
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
  hasTake: boolean;
  onStart: () => void;
  onStop: () => void;
  onUpload: (f: File) => void;
  onBack: () => void;
};

export function ReadStep(p: Props) {
  const pct = Math.min(100, (p.elapsed / (p.target * 60)) * 100);
  const message = p.micError
    ? "The mic isn't available right now 🎙️ You can allow microphone access or upload a recording."
    : p.recording
      ? "I'm recording 🎙️ Take your time."
      : "Got a page in mind? Let's give it a voice 📖";

  return (
    <div className="grid gap-5 pb-56 lg:grid-cols-[minmax(0,1fr)_20rem] lg:pb-0">
      <section className="card-soft p-5 sm:p-6" aria-label="Your passage">
        <div className="mb-3 flex items-center justify-between gap-3">
          <button className="pill pill-ghost px-3 py-1.5 text-sm" onClick={p.onBack} disabled={p.recording}>
            <ArrowLeft className="size-4" aria-hidden /> Edit passage
          </button>
          {p.recording && <span className="text-sm font-bold text-ember">● Recording · read-only</span>}
        </div>
        {p.mode === "paste" ? (
          <div className="reading-text mx-auto">{p.text}</div>
        ) : (
          <ol className="space-y-4">
            {p.images.map((img, i) => (
              <li key={img.id}>
                <div className="mb-1 text-sm font-bold text-muted-foreground">Page {i + 1}</div>
                <img src={img.url} alt={`Page ${i + 1}`} className="w-full rounded-xl" />
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Mobile: fixed bottom dock. Desktop: sticky side panel. Passage gets bottom padding so it's never covered. */}
      <aside className="fixed inset-x-0 bottom-0 z-10 border-t-[1.5px] border-border bg-card/95 p-4 shadow-soft backdrop-blur lg:sticky lg:top-6 lg:self-start lg:rounded-3xl lg:border-[1.5px] lg:p-5">
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">{message}</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="font-display text-3xl font-bold tabular-nums">{formatTime(p.elapsed)}</div>
          <div className="text-sm text-muted-foreground">of {p.target} min goal</div>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress towards daily target">
          <div className="h-full rounded-full bg-ember transition-all" style={{ width: `${pct}%` }} />
        </div>
        {pct >= 100 && p.recording && (
          <p className="mt-1 text-sm font-bold">Target reached 🎯 Keep going as long as you like.</p>
        )}
        <div className="mt-3 flex flex-col gap-2">
          {p.recording ? (
            <button className="pill pill-primary rec-pulse w-full" onClick={p.onStop}>
              <Square className="size-5" aria-hidden /> Stop recording
            </button>
          ) : (
            <button className="pill pill-primary w-full" onClick={p.onStart}>
              <Mic className="size-5" aria-hidden /> {p.hasTake ? "Record a new take" : "Start recording"}
            </button>
          )}
          <label className={`pill pill-ghost w-full cursor-pointer py-2 text-sm ${p.recording ? "pointer-events-none opacity-45" : ""}`}>
            <Upload className="size-4" aria-hidden /> Upload audio instead
            <input type="file" accept="audio/*" className="sr-only" disabled={p.recording} onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onUpload(f); e.target.value = ""; }} />
          </label>
        </div>
      </aside>
    </div>
  );
}

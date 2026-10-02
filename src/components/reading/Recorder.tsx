import { useEffect, useRef, useState } from "react";

export type RecState = "ready" | "recording" | "done" | "mic-unavailable";

export function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

type Props = {
  targetMinutes: number;
  onStateChange?: (s: RecState) => void;
  onElapsed?: (s: number) => void;
};

export function Recorder({ targetMinutes, onStateChange, onElapsed }: Props) {
  const [state, setState] = useState<RecState>("ready");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [source, setSource] = useState<"recording" | "upload" | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const startedAt = useRef(0);

  useEffect(() => onStateChange?.(state), [state, onStateChange]);
  useEffect(() => onElapsed?.(seconds), [seconds, onElapsed]);
  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
    recRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("mic-unavailable");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        setSource("recording");
        stream.getTracks().forEach((t) => t.stop());
        setState("done");
      };
      recRef.current = rec;
      rec.start();
      setAudioUrl(null);
      setSeconds(0);
      startedAt.current = Date.now();
      timer.current = window.setInterval(
        () => setSeconds((Date.now() - startedAt.current) / 1000),
        250,
      );
      setState("recording");
    } catch {
      setState("mic-unavailable");
    }
  }

  function stop() {
    if (timer.current) window.clearInterval(timer.current);
    recRef.current?.stop();
  }

  function discard() {
    setAudioUrl(null);
    setSource(null);
    setSeconds(0);
    setState("ready");
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const probe = new Audio(url);
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration)) setSeconds(probe.duration);
    };
    setAudioUrl(url);
    setSource("upload");
    setState("done");
    e.target.value = "";
  }

  const target = targetMinutes * 60;
  const pct = Math.min(100, target ? (seconds / target) * 100 : 0);

  const message = {
    ready: "Got a page in mind? Let's give it a voice 📖",
    recording: "I'm recording 🎙️ Take your time.",
    done: "Reading done 🙌🏾 Want to listen back?",
    "mic-unavailable":
      "The mic isn't available right now 🎙️ You can allow microphone access or upload a recording.",
  }[state];

  return (
    <section className="card-soft p-5 sm:p-6" aria-labelledby="rec-h">
      <h2 id="rec-h" className="text-xl font-bold">Read aloud</h2>
      <p className="mt-1 text-muted-foreground" role="status" aria-live="polite">{message}</p>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Time read</div>
          <div className="font-display text-4xl font-bold tabular-nums">{formatTime(seconds)}</div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          {formatTime(seconds)} of {targetMinutes} min goal
        </div>
      </div>
      <div
        className="mt-2 h-3 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress towards daily target"
      >
        <div className="h-full rounded-full bg-ember transition-all" style={{ width: `${pct}%` }} />
      </div>
      {pct >= 100 && <p className="mt-2 text-sm font-bold">Daily target reached 🎯</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        {state !== "recording" ? (
          <button className="pill pill-primary" onClick={start}>
            🎙️ {state === "done" ? "Record again" : "Start recording"}
          </button>
        ) : (
          <button className="pill pill-primary rec-pulse" onClick={stop}>⏹️ Stop</button>
        )}
        <label className="pill pill-ghost cursor-pointer">
          ⬆️ Upload audio
          <input type="file" accept="audio/*" className="sr-only" onChange={onUpload} disabled={state === "recording"} />
        </label>
      </div>

      {audioUrl && state === "done" && (
        <div className="mt-5 space-y-3 rounded-2xl bg-peach p-4">
          <div className="text-sm font-bold">
            {source === "upload" ? "Your uploaded audio" : "Your recording"} (stays in this browser only)
          </div>
          <audio controls src={audioUrl} className="w-full" />
          <button className="pill pill-ghost text-sm" onClick={discard}>🗑️ Discard</button>
          <p className="text-sm text-muted-foreground">
            Heads up: live analysis isn't connected yet, so I can't give feedback on this reading.
            You can explore sample feedback below to see what it will look like.
          </p>
        </div>
      )}
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";

export type AudioTake = { url: string; duration: number; source: "recording" | "upload"; name?: string };
export type RecState = "idle" | "starting" | "recording" | "paused" | "finishing";

export function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/*
 * Why raw samples instead of MediaRecorder:
 * a partial MediaRecorder file (needed for "Listen so far") isn't guaranteed to be playable — Safari writes MP4 that
 * may only be finalised on stop — and gluing separately encoded files together doesn't make a valid file. So we capture
 * PCM samples with Web Audio, keep them in memory, and build a standard WAV whenever we need something playable.
 * Pausing simply stops adding samples, so paused time adds no silence and nothing is duplicated. All local.
 */

const TARGET_RATE = 16000; // speech-friendly; ~2 MB per minute as 16-bit mono

// Capture processor: forwards input samples only while active; flushes on pause/finish and acknowledges in order.
const WORKLET = `
class RBCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.active = true; this.buf = []; this.n = 0;
    this.port.onmessage = (e) => {
      const cmd = e.data;
      if (cmd === "pause") { this.flush(); this.active = false; }
      else if (cmd === "resume") { this.active = true; }
      else if (cmd === "flush") { this.flush(); }
      this.port.postMessage({ type: "ack", cmd });
    };
  }
  flush() {
    if (!this.n) return;
    const out = new Float32Array(this.n); let o = 0;
    for (const b of this.buf) { out.set(b, o); o += b.length; }
    this.buf = []; this.n = 0;
    this.port.postMessage({ type: "data", data: out }, [out.buffer]);
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (this.active && ch) { this.buf.push(new Float32Array(ch)); this.n += ch.length; if (this.n >= 4096) this.flush(); }
    return true;
  }
}
registerProcessor("rb-capture", RBCapture);
`;

type Engine = {
  rate: number;
  /** Stop adding samples; resolves once everything captured before the call has been delivered. */
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  /** Deliver everything captured so far. */
  flush: () => Promise<void>;
  close: () => void;
};

/** Little-endian 16-bit mono WAV. */
function encodeWav(chunks: Int16Array[], rate: number): Blob {
  const samples = chunks.reduce((n, c) => n + c.length, 0);
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples * 2, true);
  const out = new Int16Array(buf, 44);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return new Blob([buf], { type: "audio/wav" });
}

/**
 * Browser-only recorder with real pause/resume. Audio stays in this tab; nothing is uploaded.
 * `onComplete` runs after `finish()` or an upload — not after `finishQuietly()` or `discard()`.
 */
export function useRecorder(onComplete: () => void) {
  const [state, setState] = useState<RecState>("idle");
  const [micError, setMicError] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0); // recorded seconds only — paused time never counts
  const [take, setTake] = useState<AudioTake | null>(null);

  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  const stateRef = useRef<RecState>("idle");
  const setRecState = (s: RecState) => {
    stateRef.current = s;
    setState(s);
  };

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const chunks = useRef<Int16Array[]>([]);
  const frames = useRef(0);
  const rateRef = useRef(TARGET_RATE);
  const carry = useRef<number[]>([]); // leftover input samples between downsampling blocks
  const factorRef = useRef(1);
  const previewUrl = useRef<string | null>(null);
  // Bumped by `discard`: callbacks from an older generation are ignored.
  const generation = useRef(0);

  const revokePreview = () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
  };
  const releaseMic = () => {
    engineRef.current?.close();
    engineRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  };
  useEffect(
    () => () => {
      releaseMic();
      revokePreview();
    },
    [],
  );

  const replaceTake = (next: AudioTake | null) =>
    setTake((prev) => {
      if (prev && prev.url !== next?.url) URL.revokeObjectURL(prev.url);
      return next;
    });

  /** Downsample by averaging (a gentle low-pass) and store as 16-bit. */
  const accept = (input: Float32Array, gen: number) => {
    if (gen !== generation.current) return;
    const f = factorRef.current;
    const src = carry.current.length ? Float32Array.from([...carry.current, ...input]) : input;
    const whole = Math.floor(src.length / f);
    const out = new Int16Array(whole);
    for (let i = 0; i < whole; i++) {
      let sum = 0;
      for (let k = 0; k < f; k++) sum += src[i * f + k]!;
      const s = Math.max(-1, Math.min(1, sum / f));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    carry.current = Array.from(src.subarray(whole * f));
    if (whole) {
      chunks.current.push(out);
      frames.current += whole;
      setElapsed(frames.current / rateRef.current);
    }
  };

  const makeEngine = async (ctx: AudioContext, stream: MediaStream, gen: number): Promise<Engine> => {
    const source = ctx.createMediaStreamSource(stream);
    if (ctx.audioWorklet && typeof AudioWorkletNode !== "undefined") {
      const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const node = new AudioWorkletNode(ctx, "rb-capture", { channelCount: 1, channelCountMode: "explicit" });
      const waiting = new Map<string, () => void>();
      node.port.onmessage = (e) => {
        if (e.data.type === "data") accept(e.data.data as Float32Array, gen);
        else waiting.get(e.data.cmd)?.();
      };
      const send = (cmd: string) =>
        new Promise<void>((resolve) => {
          const t = window.setTimeout(resolve, 1500); // never hang the UI
          waiting.set(cmd, () => {
            window.clearTimeout(t);
            resolve();
          });
          node.port.postMessage(cmd);
        });
      source.connect(node);
      node.connect(ctx.destination); // outputs silence; keeps the node processing
      return {
        rate: ctx.sampleRate,
        pause: () => send("pause"),
        resume: () => send("resume"),
        flush: () => send("flush"),
        close: () => {
          node.port.onmessage = null;
          source.disconnect();
          node.disconnect();
        },
      };
    }
    // Fallback for browsers without AudioWorklet.
    const proc = ctx.createScriptProcessor(4096, 1, 1);
    let active = true;
    proc.onaudioprocess = (e) => {
      if (active) accept(new Float32Array(e.inputBuffer.getChannelData(0)), gen);
    };
    source.connect(proc);
    proc.connect(ctx.destination);
    return {
      rate: ctx.sampleRate,
      pause: async () => {
        active = false;
      },
      resume: async () => {
        active = true;
      },
      flush: async () => {},
      close: () => {
        proc.onaudioprocess = null;
        source.disconnect();
        proc.disconnect();
      },
    };
  };

  const start = useCallback(async () => {
    setMicError(false);
    setProblem(null);
    const AC: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!navigator.mediaDevices?.getUserMedia || !AC) {
      setMicError(true);
      return;
    }
    const gen = generation.current;
    setRecState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (gen !== generation.current) {
        // Discarded while the permission prompt was open.
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const ctx = new AC();
      await ctx.resume();
      streamRef.current = stream;
      ctxRef.current = ctx;
      chunks.current = [];
      frames.current = 0;
      carry.current = [];
      factorRef.current = Math.max(1, Math.round(ctx.sampleRate / TARGET_RATE));
      rateRef.current = Math.round(ctx.sampleRate / factorRef.current);
      setElapsed(0);
      engineRef.current = await makeEngine(ctx, stream, gen);
      if (gen !== generation.current) return releaseMic();
      setRecState("recording");
    } catch {
      releaseMic();
      if (gen === generation.current) {
        setRecState("idle");
        setMicError(true);
      }
    }
  }, []);

  const pause = useCallback(async () => {
    if (stateRef.current !== "recording" || !engineRef.current) return;
    await engineRef.current.pause();
    setRecState("paused");
  }, []);

  const resume = useCallback(async () => {
    if (stateRef.current !== "paused" || !engineRef.current) return;
    revokePreview();
    setProblem(null);
    try {
      await ctxRef.current?.resume();
      await engineRef.current.resume();
      setRecState("recording");
    } catch {
      setProblem("Recording couldn't resume. Everything recorded so far is safe — you can finish and listen back.");
    }
  }, []);

  /** WAV of everything recorded so far (while paused). Null if there's nothing yet or it couldn't be built. */
  const previewSoFar = useCallback(async (): Promise<string | null> => {
    if (stateRef.current !== "paused") return null;
    setProblem(null);
    try {
      await engineRef.current?.flush();
      if (!frames.current) return null;
      revokePreview();
      previewUrl.current = URL.createObjectURL(encodeWav(chunks.current, rateRef.current));
      return previewUrl.current;
    } catch {
      setProblem("The recording so far couldn't be played. It's still safe — you can resume or finish.");
      return null;
    }
  }, []);

  /** Finish (from recording or paused). Keeps the audio, releases the mic. Null if nothing could be kept. */
  const finishInternal = async (notify: boolean): Promise<AudioTake | null> => {
    const s = stateRef.current;
    if ((s !== "recording" && s !== "paused") || !engineRef.current) return null;
    const gen = generation.current;
    setRecState("finishing");
    setProblem(null);
    try {
      await engineRef.current.flush();
      if (gen !== generation.current) return null;
      if (!frames.current) {
        releaseMic();
        setRecState("idle");
        setProblem("No audio was captured, so there's nothing to keep.");
        return null;
      }
      const url = URL.createObjectURL(encodeWav(chunks.current, rateRef.current));
      const next: AudioTake = { url, duration: frames.current / rateRef.current, source: "recording" };
      releaseMic();
      revokePreview();
      replaceTake(next);
      chunks.current = [];
      setRecState("idle");
      if (notify) completeRef.current();
      return next;
    } catch {
      // Keep the captured samples and the paused state so the reader can try again.
      if (gen === generation.current) {
        await engineRef.current?.pause().catch(() => {});
        setRecState("paused");
        setProblem("The recording couldn't be finished just now. Your audio so far is safe — try Finish recording again.");
      }
      return null;
    }
  };
  const finish = useCallback(() => finishInternal(true), []);
  const finishQuietly = useCallback(() => finishInternal(false), []);

  const upload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    replaceTake({ url, duration: 0, source: "upload", name: file.name });
    const probe = new Audio(url);
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration)) setTake((t) => (t && t.url === url ? { ...t, duration: probe.duration } : t));
    };
    setMicError(false);
    setProblem(null);
    completeRef.current();
  }, []);

  const clear = useCallback(() => {
    replaceTake(null);
    setElapsed(0);
  }, []);

  /** Discard everything: drop any unfinished recording, release the mic, ignore late callbacks. */
  const discard = useCallback(() => {
    generation.current += 1;
    releaseMic();
    revokePreview();
    chunks.current = [];
    frames.current = 0;
    carry.current = [];
    setRecState("idle");
    setMicError(false);
    setProblem(null);
    replaceTake(null);
    setElapsed(0);
  }, []);

  /** Recording or paused but not finished. */
  const unfinished = state === "recording" || state === "paused" || state === "finishing" || state === "starting";

  return {
    state,
    recording: state === "recording",
    unfinished,
    micError,
    problem,
    elapsed,
    take,
    start,
    pause,
    resume,
    previewSoFar,
    finish,
    finishQuietly,
    upload,
    clear,
    discard,
  };
}

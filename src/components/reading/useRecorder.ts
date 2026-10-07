import { useCallback, useEffect, useRef, useState } from "react";

export type AudioTake = { url: string; duration: number; source: "recording" | "upload"; name?: string };

export function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/**
 * Browser-only recorder. Audio lives as an object URL; nothing is uploaded.
 * `onComplete` runs after a recording stops normally or audio is uploaded — not after `stopQuietly` or `discard`.
 */
export function useRecorder(onComplete: () => void) {
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [take, setTake] = useState<AudioTake | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const startedAt = useRef(0);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  // Bumped by `discard`: anything started before it (a pending mic request, an in-flight stop) is ignored.
  const generation = useRef(0);
  // How the current recording should end: normally (→ onComplete), quietly (keep audio, no navigation) or dropped.
  const stopMode = useRef<"normal" | "quiet" | "drop">("normal");
  const stopResolve = useRef<((t: AudioTake | null) => void) | null>(null);

  const releaseMic = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  const clearTimer = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(
    () => () => {
      clearTimer();
      releaseMic();
    },
    [],
  );

  const replaceTake = (next: AudioTake | null) =>
    setTake((prev) => {
      if (prev && prev.url !== next?.url) URL.revokeObjectURL(prev.url);
      return next;
    });

  const start = useCallback(async () => {
    setMicError(false);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMicError(true);
      return;
    }
    const gen = generation.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // The session was discarded while the permission prompt was open: release the mic and do nothing.
      if (gen !== generation.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      stopMode.current = "normal";
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        releaseMic();
        setRecording(false);
        const mode = stopMode.current;
        const resolve = stopResolve.current;
        stopResolve.current = null;
        if (mode === "drop" || gen !== generation.current) {
          chunks.current = [];
          resolve?.(null);
          return;
        }
        const duration = (Date.now() - startedAt.current) / 1000;
        const size = chunks.current.reduce((n, b) => n + b.size, 0);
        if (!size) {
          // Nothing was captured — report it rather than pretending there's a recording.
          resolve?.(null);
          return;
        }
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const next: AudioTake = { url: URL.createObjectURL(blob), duration, source: "recording" };
        replaceTake(next);
        resolve?.(next);
        if (mode === "normal") completeRef.current();
      };
      recRef.current = rec;
      startedAt.current = Date.now();
      setElapsed(0);
      rec.start();
      // Note: the timer keeps going past the target — reaching it never stops recording.
      timer.current = window.setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 250);
      setRecording(true);
    } catch {
      if (gen === generation.current) setMicError(true);
    }
  }, []);

  /** Normal stop: keeps the audio and runs onComplete (→ review). */
  const stop = useCallback(() => {
    clearTimer();
    stopMode.current = "normal";
    if (recRef.current?.state === "recording") recRef.current.stop();
  }, []);

  /** Stop without navigating; resolves with the kept recording, or null if nothing could be kept. */
  const stopQuietly = useCallback(
    () =>
      new Promise<AudioTake | null>((resolve) => {
        clearTimer();
        const rec = recRef.current;
        if (!rec || rec.state !== "recording") return resolve(null);
        stopMode.current = "quiet";
        stopResolve.current = resolve;
        try {
          rec.stop();
        } catch {
          stopResolve.current = null;
          releaseMic();
          setRecording(false);
          resolve(null);
        }
      }),
    [],
  );

  const upload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    replaceTake({ url, duration: 0, source: "upload", name: file.name });
    const probe = new Audio(url);
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration)) setTake((t) => (t && t.url === url ? { ...t, duration: probe.duration } : t));
    };
    setMicError(false);
    completeRef.current();
  }, []);

  const clear = useCallback(() => {
    replaceTake(null);
    setElapsed(0);
  }, []);

  /** Discard everything: stop any recording without keeping it, release the mic, ignore late callbacks. */
  const discard = useCallback(() => {
    generation.current += 1;
    clearTimer();
    stopMode.current = "drop";
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    recRef.current = null;
    releaseMic();
    setRecording(false);
    setMicError(false);
    replaceTake(null);
    setElapsed(0);
  }, []);

  return { recording, micError, elapsed, take, start, stop, stopQuietly, upload, clear, discard };
}

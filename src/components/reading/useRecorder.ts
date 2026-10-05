import { useCallback, useEffect, useRef, useState } from "react";

export type AudioTake = { url: string; duration: number; source: "recording" | "upload"; name?: string };

export function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** Browser-only recorder. Audio lives as an object URL; nothing is uploaded. */
export function useRecorder(onComplete: () => void) {
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [take, setTake] = useState<AudioTake | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);
  const startedAt = useRef(0);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
    recRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  const replaceTake = (next: AudioTake | null) =>
    setTake((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return next;
    });

  const start = useCallback(async () => {
    setMicError(false);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMicError(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        const duration = (Date.now() - startedAt.current) / 1000;
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        replaceTake({ url: URL.createObjectURL(blob), duration, source: "recording" });
        setRecording(false);
        completeRef.current();
      };
      recRef.current = rec;
      startedAt.current = Date.now();
      setElapsed(0);
      rec.start();
      // Note: the timer keeps going past the target — reaching it never stops recording.
      timer.current = window.setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 250);
      setRecording(true);
    } catch {
      setMicError(true);
    }
  }, []);

  const stop = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current);
    recRef.current?.stop();
  }, []);

  const upload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    replaceTake({ url, duration: 0, source: "upload", name: file.name });
    const probe = new Audio(url);
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration))
        setTake((t) => (t && t.url === url ? { ...t, duration: probe.duration } : t));
    };
    setMicError(false);
    completeRef.current();
  }, []);

  const clear = useCallback(() => {
    replaceTake(null);
    setElapsed(0);
  }, []);

  return { recording, micError, elapsed, take, start, stop, upload, clear };
}

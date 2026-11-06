import { useCallback, useEffect, useRef, useState } from "react";
import { prepareFeedback } from "@/lib/ai-feedback/analyse";
import { loadChoice, saveChoice, type Choice } from "@/lib/ai-feedback/choice";
import { FeedbackError, fetchStatus, transcribe, type Status } from "@/lib/ai-feedback/client";
import { aiFeedbackConfigured } from "@/lib/ai-feedback/config";
import { decodeTo16k } from "@/lib/reading-feedback/analysis";
import type { Notes } from "@/lib/reading-feedback/feedback";
import type { AudioTake } from "@/components/reading/useRecorder";

export type Run =
  | { stage: "idle" }
  | { stage: "sending" | "listening" | "preparing" }
  | { stage: "error"; reason: FeedbackError["reason"] };

export type AiFeedback = ReturnType<typeof useAiFeedback>;

/**
 * Adults' optional AI feedback for the main session's recording (never the children's corner). Nothing is sent until
 * the adult has turned AI feedback on and then asks for it on a recording. The notes are handed to `keep`, which saves
 * them with that recording, so they stay (even after AI feedback is turned off) until the recording is deleted.
 */
export function useAiFeedback(
  take: AudioTake | null,
  passage: string | null,
  keep: (url: string, notes: Notes) => void,
) {
  const configured = aiFeedbackConfigured();
  const [status, setStatus] = useState<Status | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [run, setRun] = useState<Run>({ stage: "idle" });
  const abort = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    setRun({ stage: "idle" });
  }, []);

  // A new recording or a changed passage starts over (and stops anything in progress for the old one).
  useEffect(() => cancel, [take?.url, passage, cancel]);

  /** Ask the Worker whether AI feedback is available (only once the review screen needs it). */
  const check = useCallback(async () => {
    if (!configured) return;
    const s = await fetchStatus();
    setStatus(s);
    setChoice(loadChoice(s.training));
  }, [configured]);

  const choose = useCallback(
    (c: Choice) => {
      if (!status) return;
      saveChoice(c, status.training);
      setChoice(c);
    },
    [status],
  );
  const turnOff = useCallback(() => {
    cancel();
    choose("device");
  }, [cancel, choose]);

  const start = useCallback(async () => {
    if (!take || !passage || choice !== "ai" || !status?.available) return;
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setRun({ stage: "sending" });
    try {
      const blob = await (await fetch(take.url)).blob();
      let decoded: Awaited<ReturnType<typeof decodeTo16k>>;
      try {
        decoded = await decodeTo16k(blob);
      } catch {
        throw new FeedbackError("bad-audio");
      }
      if (decoded.seconds > status.maxMinutes * 60) throw new FeedbackError("too-long");
      const words = await transcribe(blob, decoded.seconds, ctl.signal, () => {
        if (!ctl.signal.aborted) setRun({ stage: "listening" });
      });
      if (ctl.signal.aborted) return;
      setRun({ stage: "preparing" });
      const notes = prepareFeedback(passage, words, decoded.audio, 16000);
      if (ctl.signal.aborted) return;
      keep(take.url, notes);
      setRun({ stage: "idle" });
    } catch (e) {
      if (ctl.signal.aborted) return;
      const reason = e instanceof FeedbackError ? e.reason : "unavailable";
      setRun({ stage: "error", reason });
      // A pause (credit, daily limit, switched off) applies to everyone until it lifts: show it in place of the button.
      if (reason === "credit" || reason === "daily-limit" || reason === "off")
        setStatus((s) => s && { ...s, available: false, paused: reason });
    } finally {
      if (abort.current === ctl) abort.current = null;
    }
  }, [take, passage, choice, status, keep]);

  return { configured, status, choice, run, check, choose, turnOff, start, cancel };
}

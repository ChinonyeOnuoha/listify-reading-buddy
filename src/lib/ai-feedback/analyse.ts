// Turns the service's timed words into prepared feedback, in the browser. Pauses are measured here from the audio
// itself (as in the adult lab); the passage is compared here too, so it never leaves the device.
import {
  align,
  findPauses,
  mergePauses,
  placePauses,
  timestampQuality,
} from "@/lib/reading-feedback/analysis";
import { buildFeedback, type Feedback } from "@/lib/reading-feedback/feedback";
import type { TimedWord } from "./client";

export function prepareFeedback(
  passage: string,
  words: TimedWord[],
  audio: Float32Array,
  rate: number,
): Feedback {
  const pauses = mergePauses(findPauses(audio, rate, 0.3).pauses);
  return buildFeedback({
    passage,
    ops: align(passage, words),
    words,
    pauses: placePauses(pauses, words),
    quality: timestampQuality(words),
  });
}

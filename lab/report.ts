import type { Result } from "./store";

export const TJS_VERSION = "4.3.1";

export type SummaryInput = {
  result: Result;
  caseTitle: string;
  counts: { sub: number; del: number; ins: number; rep: number };
  verdicts: Record<string, number>;
  quality: unknown;
  minPause: number;
  pauses: { duration: number; after?: string | undefined }[];
  pace: {
    medianWpm: number;
    windows: { from: number; to: number; wpm: number; differs: boolean }[];
  } | null;
  passageWords: number;
};

/** Text for the testing log. Everything about the model and recording comes from the result itself, never the live dropdowns. */
export function buildSummary({
  result,
  caseTitle,
  counts,
  verdicts,
  quality,
  minPause,
  pauses,
  pace,
  passageWords,
}: SummaryInput): string {
  const p = result.provenance;
  return [
    `Case: ${caseTitle}${p.synthetic ? " (SYNTHETIC voice — pipeline check only)" : ""}`,
    `File: ${p.fileName} (${p.seconds.toFixed(1)} s)`,
    `Model: ${p.model} · Transformers.js ${TJS_VERSION} · device ${p.device} · dtype ${JSON.stringify(p.dtype)} · threads ${String(p.threads ?? "default")} · cross-origin isolated ${p.crossOriginIsolated}`,
    `Load: ${(p.loadMs / 1000).toFixed(1)} s (${p.loadCached ? "cache" : "download"}) · Transcribe: ${(result.ms / 1000).toFixed(1)} s, RTF ${(result.ms / 1000 / p.seconds).toFixed(2)} · timestamps ${p.tsMode} · UI max stall ${result.stallMs} ms`,
    `Transcript (uncorrected): ${result.text.trim()}`,
    `Compared with the passage as entered (${passageWords} words): ${counts.sub} substituted, ${counts.del} omitted, ${counts.ins} added, ${counts.rep} possible repetition words`,
    `Your verdicts: ${JSON.stringify(verdicts)}`,
    `Timestamps: ${p.tsMode === "word" ? JSON.stringify(quality) : "segment mode"}`,
    `Pauses ≥ ${minPause}s: ${pauses.map((x) => `${x.duration.toFixed(2)}s after “${x.after ?? "?"}”`).join("; ") || "none"}`,
    pace
      ? `Pace (median ${pace.medianWpm} wpm): ${pace.windows.map((w) => `${w.from}-${Math.round(w.to)}s ${w.wpm}${w.differs ? "*" : ""}`).join(", ")}`
      : "Pace: not shown (no reliable word timestamps)",
  ].join("\n");
}

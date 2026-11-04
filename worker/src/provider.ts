// The transcription service behind AI feedback, behind one small interface so it can be changed later by adding a
// provider here and setting PROVIDER in wrangler.jsonc. Only AssemblyAI is implemented; nothing switches provider
// automatically.

/** A word the service heard, with times in seconds (what the app's analysis expects). */
export type TimedWord = { text: string; start: number; end: number; confidence: number };

export type Poll =
  | { status: "processing" }
  | { status: "completed"; words: TimedWord[]; seconds: number }
  | { status: "error"; reason: ProviderErrorKind };

export type ProviderErrorKind = "credit" | "unavailable" | "bad-audio";

/** A failure the app can explain: out of credit, the service is unavailable, or the audio couldn't be used. */
export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    message: string,
  ) {
    super(message);
  }
}

export interface Provider {
  /** Upload the audio and start a transcript; returns the provider's transcript id. */
  submit(audio: ArrayBuffer): Promise<string>;
  poll(id: string): Promise<Poll>;
  /** Delete the transcript and the uploaded audio from the provider. */
  remove(id: string): Promise<void>;
  /** Delete finished transcripts older than `minutes` that nobody collected (a closed tab, "Stop waiting"). */
  sweep(minutes: number): Promise<number>;
}

/** Messages that mean the account has no credit left (AssemblyAI answers 400 "balance is negative"). */
export const isCreditError = (status: number, body: string) =>
  status === 402 || /balance|top ?up|insufficient (funds|credit)|out of credit/i.test(body);

// Talks to the AI feedback Worker. A recording is sent only by `transcribe`, which the app calls only after an adult
// has chosen AI feedback and asked for it on that recording. The passage text is never sent.
import type { Training } from "./choice";
import { AI_FEEDBACK_URL } from "./config";

export type Paused = "off" | "credit" | "daily-limit" | "unreachable";
export type Status = {
  available: boolean;
  paused: Paused | null;
  training: Training;
  maxMinutes: number;
};
export type TimedWord = { text: string; start: number; end: number; confidence: number };

/** Why a recording couldn't be transcribed, in terms the app can explain. */
export class FeedbackError extends Error {
  constructor(
    readonly reason: "credit" | "daily-limit" | "off" | "too-long" | "bad-audio" | "unavailable",
  ) {
    super(reason);
  }
}

const POLL_MS = 2000;
const TIMEOUT_MS = 5 * 60_000;

export async function fetchStatus(signal?: AbortSignal): Promise<Status> {
  try {
    const res = await fetch(`${AI_FEEDBACK_URL}/status`, { signal: signal ?? null });
    if (!res.ok) throw new Error(String(res.status));
    const s = (await res.json()) as Partial<Status>;
    return {
      available: s.available === true,
      paused: s.paused ?? null,
      // Anything other than an explicit "excluded" is treated as training use.
      training: s.training === "excluded" ? "excluded" : "may-be-used",
      maxMinutes: typeof s.maxMinutes === "number" ? s.maxMinutes : 20,
    };
  } catch (e) {
    if (signal?.aborted) throw e;
    return { available: false, paused: "unreachable", training: "may-be-used", maxMinutes: 0 };
  }
}

const reasonOf = (body: {
  error?: string;
  paused?: string;
  reason?: string;
}): FeedbackError["reason"] => {
  const r = body.error === "paused" ? body.paused : (body.reason ?? body.error);
  return r === "credit" ||
    r === "daily-limit" ||
    r === "off" ||
    r === "too-long" ||
    r === "bad-audio"
    ? r
    : "unavailable";
};

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(t), reject(signal.reason)), {
      once: true,
    });
  });

/** Send one recording and wait for its timed words. The Worker deletes it from the service once they're ready. */
export async function transcribe(
  audio: Blob,
  seconds: number,
  signal: AbortSignal,
  onSent?: () => void,
): Promise<TimedWord[]> {
  let res: Response;
  try {
    res = await fetch(`${AI_FEEDBACK_URL}/transcripts`, {
      method: "POST",
      body: audio,
      headers: {
        "Content-Type": audio.type || "application/octet-stream",
        "X-Recording-Seconds": String(Math.ceil(seconds)),
      },
      signal,
    });
  } catch (e) {
    if (signal.aborted) throw e;
    throw new FeedbackError("unavailable");
  }
  const sent = (await res.json().catch(() => ({}))) as {
    id?: string;
    error?: string;
    paused?: string;
  };
  if (!res.ok || !sent.id) throw new FeedbackError(reasonOf(sent));
  onSent?.();

  const started = Date.now();
  for (;;) {
    await wait(POLL_MS, signal);
    let body: { status?: string; words?: TimedWord[]; reason?: string };
    try {
      const r = await fetch(`${AI_FEEDBACK_URL}/transcripts/${encodeURIComponent(sent.id)}`, {
        signal,
      });
      body = (await r.json()) as typeof body;
    } catch (e) {
      if (signal.aborted) throw e;
      throw new FeedbackError("unavailable");
    }
    if (body.status === "completed") return body.words ?? [];
    if (body.status === "error") throw new FeedbackError(reasonOf(body));
    if (Date.now() - started > TIMEOUT_MS) throw new FeedbackError("unavailable");
  }
}

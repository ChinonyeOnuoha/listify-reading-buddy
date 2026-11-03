// Cloud transcription for the adult lab experiment. Runs only in a local Node process (never in a browser), with keys
// read from the git-ignored .env.local. Keys are never logged or written to disk; error messages are stripped of them.
// The passage is never sent: each service only hears the audio, so it can't pull the transcript towards the text.
import type { Word } from "../analysis.ts";

export type TimedWord = Word & { start: number; end: number; confidence: number };
export type CloudResult = {
  provider: string;
  model: string;
  words: TimedWord[];
  /** Seconds of audio the provider reports processing (what it bills on). */
  billedSeconds: number;
  requestId: string;
  ms: number;
  raw: unknown;
};

const scrub = (text: string, secrets: string[]) =>
  secrets.reduce((t, s) => (s ? t.split(s).join("[key]") : t), text);

async function call(url: string, init: RequestInit, key: string): Promise<unknown> {
  const res = await fetch(url, init);
  const body = await res.text();
  if (!res.ok)
    throw new Error(
      `${new URL(url).host} replied ${res.status}: ${scrub(body.slice(0, 300), [key])}`,
    );
  return JSON.parse(body);
}

/** Deepgram Nova-3, pre-recorded. Filler words kept; no smart formatting; opted out of the Model Improvement Program. */
export async function deepgram(wav: Uint8Array<ArrayBuffer>, key: string): Promise<CloudResult> {
  const params = new URLSearchParams({
    model: "nova-3",
    language: "en",
    filler_words: "true",
    smart_format: "false",
    punctuate: "false",
    numerals: "false",
    mip_opt_out: "true",
  });
  const t0 = Date.now();
  const raw = (await call(
    `https://api.deepgram.com/v1/listen?${params}`,
    {
      method: "POST",
      headers: { Authorization: `Token ${key}`, "Content-Type": "audio/wav" },
      body: wav,
    },
    key,
  )) as {
    metadata: { request_id: string; duration: number };
    results: {
      channels: {
        alternatives: {
          words: { word: string; start: number; end: number; confidence: number }[];
        }[];
      }[];
    };
  };
  const words = (raw.results.channels[0]?.alternatives[0]?.words ?? []).map((w) => ({
    text: w.word,
    start: w.start,
    end: w.end,
    confidence: w.confidence,
  }));
  return {
    provider: "Deepgram",
    model: "nova-3",
    words,
    billedSeconds: raw.metadata.duration,
    requestId: raw.metadata.request_id,
    ms: Date.now() - t0,
    raw,
  };
}

/** Upload once to AssemblyAI; the file URL can be transcribed by several models. AssemblyAI deletes uploads within 48 h. */
export async function assemblyUpload(wav: Uint8Array<ArrayBuffer>, key: string): Promise<string> {
  const raw = (await call(
    "https://api.assemblyai.com/v2/upload",
    {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/octet-stream" },
      body: wav,
    },
    key,
  )) as { upload_url: string };
  return raw.upload_url;
}

/** Delete a transcript from AssemblyAI. This also deletes the uploaded audio it was made from, so call it only after
 *  every model has finished with that upload. */
export async function assemblyDelete(id: string, key: string): Promise<void> {
  await call(
    `https://api.assemblyai.com/v2/transcript/${id}`,
    { method: "DELETE", headers: { Authorization: key } },
    key,
  );
}

/** AssemblyAI pre-recorded transcript. Disfluencies kept; no text formatting. The caller deletes it with
 *  assemblyDelete once all models have run (a failed transcript is deleted here). */
export async function assembly(
  uploadUrl: string,
  model: "universal-3-5-pro" | "universal-2",
  key: string,
): Promise<CloudResult> {
  const headers = { Authorization: key, "Content-Type": "application/json" };
  const t0 = Date.now();
  const job = (await call(
    "https://api.assemblyai.com/v2/transcript",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        audio_url: uploadUrl,
        speech_models: [model],
        language_code: "en",
        disfluencies: true,
        punctuate: false,
        format_text: false,
      }),
    },
    key,
  )) as { id: string };
  type Transcript = {
    id: string;
    status: string;
    error?: string;
    audio_duration: number;
    speech_model_used?: string;
    words: { text: string; start: number; end: number; confidence: number }[];
  };
  let raw: Transcript;
  try {
    for (;;) {
      await new Promise((r) => setTimeout(r, 2000));
      raw = (await call(
        `https://api.assemblyai.com/v2/transcript/${job.id}`,
        { headers },
        key,
      )) as Transcript;
      if (raw.status === "completed") break;
      if (raw.status === "error")
        throw new Error(`AssemblyAI transcript failed: ${raw.error ?? "unknown error"}`);
      if (Date.now() - t0 > 5 * 60_000)
        throw new Error("AssemblyAI transcript took longer than 5 minutes");
    }
  } catch (e) {
    await assemblyDelete(job.id, key);
    throw e;
  }
  const ms = Date.now() - t0;
  const words = raw.words.map((w) => ({
    text: w.text,
    start: w.start / 1000,
    end: w.end / 1000,
    confidence: w.confidence,
  }));
  return {
    provider: "AssemblyAI",
    model: raw.speech_model_used ?? model,
    words,
    billedSeconds: raw.audio_duration,
    requestId: raw.id,
    ms,
    raw,
  };
}

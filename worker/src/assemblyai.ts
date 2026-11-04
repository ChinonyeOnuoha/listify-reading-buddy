// AssemblyAI Universal-3.5 Pro, pre-recorded audio. Same settings as the adult lab experiment (lab/cloud/providers.ts):
// disfluencies kept, no text formatting. The passage text is never sent, so it can't pull the transcript towards it.
import { isCreditError, ProviderError, type Poll, type Provider } from "./provider";

const BASE = { eu: "https://api.eu.assemblyai.com", us: "https://api.assemblyai.com" } as const;
export type Region = keyof typeof BASE;

type Transcript = {
  id: string;
  status: "queued" | "processing" | "completed" | "error";
  error?: string;
  audio_duration?: number;
  words?: { text: string; start: number; end: number; confidence: number }[];
};

export function assemblyai(key: string, region: Region): Provider {
  const base = BASE[region];
  async function call(path: string, init: RequestInit = {}): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(base + path, {
        ...init,
        headers: { Authorization: key, ...(init.headers as Record<string, string> | undefined) },
      });
    } catch {
      throw new ProviderError("unavailable", "AssemblyAI could not be reached");
    }
    const body = await res.text();
    if (!res.ok) {
      // The key is never part of a reply, but scrub it anyway before anything could be logged.
      const detail = body.slice(0, 200).split(key).join("[key]");
      if (isCreditError(res.status, body)) throw new ProviderError("credit", detail);
      if (res.status === 400 || res.status === 413 || res.status === 415)
        throw new ProviderError("bad-audio", detail);
      throw new ProviderError("unavailable", `AssemblyAI replied ${res.status}`);
    }
    return body ? JSON.parse(body) : null;
  }

  return {
    async submit(audio) {
      const { upload_url } = (await call("/v2/upload", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: audio,
      })) as { upload_url: string };
      const job = (await call("/v2/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio_url: upload_url,
          speech_models: ["universal-3-5-pro"],
          language_code: "en",
          disfluencies: true,
          punctuate: false,
          format_text: false,
        }),
      })) as { id: string };
      return job.id;
    },

    async poll(id): Promise<Poll> {
      const t = (await call(`/v2/transcript/${encodeURIComponent(id)}`)) as Transcript;
      if (t.status === "completed")
        return {
          status: "completed",
          seconds: t.audio_duration ?? 0,
          words: (t.words ?? []).map((w) => ({
            text: w.text,
            start: w.start / 1000,
            end: w.end / 1000,
            confidence: w.confidence,
          })),
        };
      if (t.status === "error")
        return {
          status: "error",
          reason: isCreditError(0, t.error ?? "") ? "credit" : "bad-audio",
        };
      return { status: "processing" };
    },

    async remove(id) {
      // Deleting the transcript also deletes the uploaded audio it was made from.
      await call(`/v2/transcript/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    async sweep(minutes) {
      const { transcripts } = (await call("/v2/transcript?limit=100")) as {
        transcripts: { id: string; status: string; created: string; audio_url: string }[];
      };
      const cutoff = Date.now() - minutes * 60_000;
      // Deleted transcripts stay listed with audio_url "deleted_by_user"; at most 20 deletions per run.
      const left = transcripts
        .filter(
          (t) =>
            (t.status === "completed" || t.status === "error") &&
            t.audio_url !== "deleted_by_user" &&
            Date.parse(t.created) < cutoff,
        )
        .slice(0, 20);
      for (const t of left) await this.remove(t.id);
      return left.length;
    },
  };
}

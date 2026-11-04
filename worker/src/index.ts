// Reading Buddy AI feedback: a small Cloudflare Worker between the app and the transcription service.
// It holds the API key (a Worker secret), passes one recording's audio on when an adult asks for AI feedback, returns
// the timed words, and deletes the transcript and audio from the service straight away. It stores no audio, words or
// passage text — only a daily total of audio seconds (to keep within the free credit), each pending transcript's counted
// seconds for a day, and a "credit ran out" flag.
//
//   GET  /status            whether AI feedback is available now, and how recordings are treated
//   POST /transcripts       body: the recording; header X-Recording-Seconds: its length → { id }
//   GET  /transcripts/:id   → { status: "processing" } | { status: "completed", words } | { status: "error", reason }
//   every 10 minutes        deletes any finished transcript the app never collected (a closed tab, "Stop waiting")
import { assemblyai, type Region } from "./assemblyai";
import { ProviderError, type Provider, type ProviderErrorKind } from "./provider";

/** The parts of Workers KV used here. */
export interface Store {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  /** Secret, set with `wrangler secret put ASSEMBLYAI_API_KEY`. */
  ASSEMBLYAI_API_KEY?: string;
  USAGE: Store;
  /** "assemblyai" (the only provider implemented). Anything else turns AI feedback off. */
  PROVIDER: string;
  ASSEMBLYAI_REGION: string;
  /** "may-be-used" unless the provider has confirmed in writing that this account's recordings are not used for
   *  training. The app words its consent from this, so it must never be changed on assumption. */
  TRAINING: string;
  /** Comma-separated origins allowed to call the Worker (the published app, and a local dev server if wanted). */
  ALLOWED_ORIGINS: string;
  DAILY_AUDIO_MINUTES: string;
  MAX_RECORDING_MINUTES: string;
  /** "false" pauses AI feedback for everyone without a redeploy of the app. */
  ENABLED: string;
}

export type Paused = "off" | "credit" | "daily-limit";
const CREDIT_FLAG = "paused:credit";
const CREDIT_RECHECK_S = 6 * 3600; // after a "no credit" reply, don't try again for 6 hours
const MAX_BYTES = 50 * 1024 * 1024;
const SWEEP_AFTER_MIN = 10; // longer than the app ever waits (5 minutes)
const MIN_BYTES_PER_S = 32_000; // 16 kHz 16-bit mono WAV (what the app records): a size-based floor on its length

const today = () => `audio-seconds:${new Date().toISOString().slice(0, 10)}`;
const num = (s: string | undefined, fallback: number) => {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

function providerFor(env: Env): Provider | null {
  if (env.PROVIDER !== "assemblyai" || !env.ASSEMBLYAI_API_KEY) return null;
  const region: Region = env.ASSEMBLYAI_REGION === "us" ? "us" : "eu";
  return assemblyai(env.ASSEMBLYAI_API_KEY, region);
}

async function usedToday(env: Env) {
  return Number((await env.USAGE.get(today())) ?? 0);
}
async function addUsage(env: Env, seconds: number) {
  if (!seconds) return;
  const used = await usedToday(env);
  await env.USAGE.put(today(), String(Math.max(0, used + seconds)), { expirationTtl: 3 * 86400 });
}

async function paused(env: Env): Promise<Paused | null> {
  if (env.ENABLED === "false" || !providerFor(env)) return "off";
  if (await env.USAGE.get(CREDIT_FLAG)) return "credit";
  if ((await usedToday(env)) >= num(env.DAILY_AUDIO_MINUTES, 60) * 60) return "daily-limit";
  return null;
}

async function failed(env: Env, kind: ProviderErrorKind) {
  if (kind === "credit") await env.USAGE.put(CREDIT_FLAG, "1", { expirationTtl: CREDIT_RECHECK_S });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const allowed = env.ALLOWED_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    const cors: Record<string, string> = allowed.includes(origin)
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Recording-Seconds",
          "Access-Control-Max-Age": "86400",
          Vary: "Origin",
        }
      : {};
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });

    // Only the app's own pages may call this (a browser check, not a password: the daily limit is the real cap).
    if (!cors["Access-Control-Allow-Origin"]) return json({ error: "origin" }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const stop = await paused(env);

    if (request.method === "GET" && url.pathname === "/status")
      return json({
        available: !stop,
        paused: stop,
        training: env.TRAINING === "excluded" ? "excluded" : "may-be-used",
        provider: "AssemblyAI Universal-3.5 Pro",
        region: env.ASSEMBLYAI_REGION === "us" ? "us" : "eu",
        maxMinutes: num(env.MAX_RECORDING_MINUTES, 20),
      });

    const provider = providerFor(env);

    if (request.method === "POST" && url.pathname === "/transcripts") {
      if (stop || !provider) return json({ error: "paused", paused: stop ?? "off" }, 503);
      const audio = await request.arrayBuffer();
      if (!audio.byteLength) return json({ error: "bad-audio" }, 400);
      if (audio.byteLength > MAX_BYTES) return json({ error: "too-long" }, 413);
      const claimed = num(request.headers.get("X-Recording-Seconds") ?? undefined, 0);
      const seconds = Math.ceil(Math.max(claimed, audio.byteLength / MIN_BYTES_PER_S));
      if (seconds > num(env.MAX_RECORDING_MINUTES, 20) * 60)
        return json({ error: "too-long" }, 413);
      try {
        const id = await provider.submit(audio);
        // Counted when sent, so several at once can't slip past the daily limit; corrected when the transcript is done.
        await addUsage(env, seconds);
        await env.USAGE.put(`reserved:${id}`, String(seconds), { expirationTtl: 86400 });
        return json({ id }, 202);
      } catch (e) {
        const kind = e instanceof ProviderError ? e.kind : "unavailable";
        await failed(env, kind);
        return json({ error: kind }, kind === "bad-audio" ? 400 : 503);
      }
    }

    const m = /^\/transcripts\/([A-Za-z0-9-]{8,64})$/.exec(url.pathname);
    if (request.method === "GET" && m && provider) {
      const id = m[1]!;
      const reserved = Number((await env.USAGE.get(`reserved:${id}`)) ?? 0);
      try {
        const result = await provider.poll(id);
        if (result.status === "processing") return json(result);
        // Done either way: delete the transcript and audio from the provider before answering.
        await provider.remove(id).catch(() => {});
        await env.USAGE.put(`reserved:${id}`, "0", { expirationTtl: 60 });
        if (result.status === "error") {
          await failed(env, result.reason);
          await addUsage(env, -reserved);
          return json(result);
        }
        await addUsage(env, Math.ceil(result.seconds) - reserved);
        return json({ status: "completed", words: result.words });
      } catch (e) {
        const kind = e instanceof ProviderError ? e.kind : "unavailable";
        await failed(env, kind);
        return json({ status: "error", reason: kind }, 503);
      }
    }

    return json({ error: "not-found" }, 404);
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    await providerFor(env)?.sweep(SWEEP_AFTER_MIN);
  },
};

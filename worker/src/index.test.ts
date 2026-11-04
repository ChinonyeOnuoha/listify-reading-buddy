import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Env, type Store } from "./index";

const KEY = "test-key-not-real";
const ORIGIN = "https://reading-buddy.example";

function memory(): Store & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: async (k) => data.get(k) ?? null,
    put: async (k, v) => void data.set(k, v),
  };
}
const env = (over: Partial<Env> = {}): Env => ({
  ASSEMBLYAI_API_KEY: KEY,
  USAGE: memory(),
  PROVIDER: "assemblyai",
  ASSEMBLYAI_REGION: "eu",
  TRAINING: "may-be-used",
  ALLOWED_ORIGINS: `${ORIGIN}, http://localhost:8080`,
  DAILY_AUDIO_MINUTES: "60",
  MAX_RECORDING_MINUTES: "20",
  ENABLED: "true",
  ...over,
});
const req = (path: string, init: RequestInit = {}, origin = ORIGIN) =>
  new Request(`https://worker.example${path}`, {
    ...init,
    headers: { Origin: origin, ...(init.headers as Record<string, string> | undefined) },
  });
const call = async (e: Env, path: string, init?: RequestInit, origin?: string) => {
  const res = await worker.fetch(req(path, init, origin), e);
  const text = await res.text();
  expect(text).not.toContain(KEY);
  return { status: res.status, body: JSON.parse(text || "null"), headers: res.headers };
};

/** A fake AssemblyAI: records each call and answers from `replies` in order. */
function provider(replies: [number, unknown][]) {
  const calls: { url: string; method: string; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({
        url,
        method: init.method ?? "GET",
        body: typeof init.body === "string" ? JSON.parse(init.body) : init.body,
      });
      const [status, body] = replies.shift() ?? [500, {}];
      return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
    }),
  );
  return calls;
}
afterEach(() => vi.unstubAllGlobals());

const audio = (seconds: number) => ({
  method: "POST",
  body: new Uint8Array(32_000),
  headers: { "X-Recording-Seconds": String(seconds) },
});

describe("AI feedback worker", () => {
  it("answers only the app's own origins", async () => {
    const res = await call(env(), "/status", {}, "https://elsewhere.example");
    expect(res.status).toBe(403);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    const ok = await call(env(), "/status");
    expect(ok.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
  });

  it("reports availability and that recordings may be used for training", async () => {
    const { body } = await call(env(), "/status");
    expect(body).toMatchObject({
      available: true,
      paused: null,
      training: "may-be-used",
      region: "eu",
    });
  });

  it("is off without a key, when disabled, or with an unimplemented provider", async () => {
    for (const e of [
      env({ ASSEMBLYAI_API_KEY: "" }),
      env({ ENABLED: "false" }),
      env({ PROVIDER: "deepgram" }),
    ]) {
      expect((await call(e, "/status")).body).toMatchObject({ available: false, paused: "off" });
      expect((await call(e, "/transcripts", audio(30))).status).toBe(503);
    }
  });

  it("sends the audio to Universal-3.5 Pro on the EU servers, then returns words and deletes the transcript", async () => {
    const e = env();
    const calls = provider([
      [200, { upload_url: "https://cdn.example/upload/1" }],
      [200, { id: "tr-123456789" }],
      [200, { id: "tr-123456789", status: "processing" }],
      [
        200,
        {
          id: "tr-123456789",
          status: "completed",
          audio_duration: 42,
          words: [{ text: "Every", start: 1200, end: 1500, confidence: 0.98 }],
        },
      ],
      [200, {}],
    ]);
    const sub = await call(e, "/transcripts", audio(40));
    expect(sub).toMatchObject({ status: 202, body: { id: "tr-123456789" } });
    expect(calls[0]!.url).toBe("https://api.eu.assemblyai.com/v2/upload");
    expect(calls[1]!.body).toMatchObject({
      speech_models: ["universal-3-5-pro"],
      format_text: false,
    });
    expect(JSON.stringify(calls[1]!.body)).not.toMatch(/passage|prompt|keyterms/);

    expect((await call(e, "/transcripts/tr-123456789")).body).toEqual({ status: "processing" });
    const done = await call(e, "/transcripts/tr-123456789");
    expect(done.body).toEqual({
      status: "completed",
      words: [{ text: "Every", start: 1.2, end: 1.5, confidence: 0.98 }],
    });
    expect(calls[4]).toMatchObject({
      method: "DELETE",
      url: "https://api.eu.assemblyai.com/v2/transcript/tr-123456789",
    });
    // Counted 40 s when sent, corrected to the 42 s the service processed.
    const used = [...(e.USAGE as ReturnType<typeof memory>).data].find(([k]) =>
      k.startsWith("audio-seconds:"),
    );
    expect(used?.[1]).toBe("42");
  });

  it("pauses AI feedback when the credit runs out, without charging or retrying", async () => {
    const e = env();
    provider([
      [200, { upload_url: "https://cdn.example/upload/1" }],
      [
        400,
        {
          error:
            "Your current account balance is negative. Please top up to continue using the API.",
        },
      ],
    ]);
    expect(await call(e, "/transcripts", audio(30))).toMatchObject({
      status: 503,
      body: { error: "credit" },
    });
    expect((await call(e, "/status")).body).toMatchObject({ available: false, paused: "credit" });
    const calls = provider([]);
    expect((await call(e, "/transcripts", audio(30))).body).toMatchObject({
      error: "paused",
      paused: "credit",
    });
    expect(calls).toHaveLength(0);
  });

  it("pauses for the rest of the day once the daily audio limit is used", async () => {
    const e = env({ DAILY_AUDIO_MINUTES: "1" });
    provider([
      [200, { upload_url: "u" }],
      [200, { id: "tr-aaaaaaaa" }],
    ]);
    await call(e, "/transcripts", audio(60));
    expect((await call(e, "/status")).body).toMatchObject({
      available: false,
      paused: "daily-limit",
    });
  });

  it("refuses recordings over the length limit before sending anything", async () => {
    const calls = provider([]);
    expect(
      (await call(env({ MAX_RECORDING_MINUTES: "1" }), "/transcripts", audio(90))).status,
    ).toBe(413);
    expect(calls).toHaveLength(0);
  });
});

describe("AI feedback worker clean-up", () => {
  it("deletes finished transcripts nobody collected, and leaves recent or already deleted ones", async () => {
    const old = new Date(Date.now() - 30 * 60_000).toISOString();
    const recent = new Date().toISOString();
    const calls = provider([
      [
        200,
        {
          transcripts: [
            {
              id: "abandoned-1",
              status: "completed",
              created: old,
              audio_url: "https://cdn.example/u",
            },
            { id: "gone-2", status: "completed", created: old, audio_url: "deleted_by_user" },
            {
              id: "fresh-3",
              status: "completed",
              created: recent,
              audio_url: "https://cdn.example/u",
            },
            {
              id: "running-4",
              status: "processing",
              created: old,
              audio_url: "https://cdn.example/u",
            },
          ],
        },
      ],
      [200, {}],
    ]);
    await worker.scheduled({}, env());
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "GET https://api.eu.assemblyai.com/v2/transcript?limit=100",
      "DELETE https://api.eu.assemblyai.com/v2/transcript/abandoned-1",
    ]);
  });
});

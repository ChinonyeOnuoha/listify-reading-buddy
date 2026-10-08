import { describe, expect, it, vi } from "vitest";
import { buildSummary } from "./report";
import {
  LabStore,
  canTranscribe,
  selectionIsLoaded,
  statusText,
  transcribeBlockedReason,
  type Deps,
  type WorkerLike,
} from "./store";

const TINY = { model: "tiny", device: "wasm" as const };
const BASE = { model: "base", device: "wasm" as const };

class FakeWorker implements WorkerLike {
  onmessage: WorkerLike["onmessage"] = null;
  onerror: WorkerLike["onerror"] = null;
  sent: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  terminated = false;
  postMessage(m: unknown) {
    this.sent.push(m);
  }
  terminate() {
    this.terminated = true;
  }
  /** Deliver a reply the way the real worker would (to whatever handler is attached right now). */
  reply(m: Record<string, unknown>) {
    this.onmessage?.({ data: m });
  }
}

function setup(selection = TINY) {
  const workers: FakeWorker[] = [];
  const decodeResolvers: ((v: { audio: Float32Array; seconds: number }) => void)[] = [];
  const deps: Deps = {
    createWorker: () => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    },
    decode: () => new Promise((res) => decodeResolvers.push(res)),
    makeUrl: () => `blob:fake-${Math.random()}`,
    revokeUrl: vi.fn(),
    clearModelCache: async () => true,
  };
  const store = new LabStore(deps, selection);
  const last = () => workers[workers.length - 1]!;
  const jobOf = (w: FakeWorker) => (w.sent[w.sent.length - 1] as { job: number }).job;
  const finishLoad = (extra: Record<string, unknown> = {}) => {
    const w = last();
    w.reply({
      job: jobOf(w),
      type: "loaded",
      ms: 4200,
      cached: true,
      dtype: { encoder_model: "q8" },
      threads: 4,
      crossOriginIsolated: true,
      ...extra,
    });
  };
  const addAudio = async (name = "me.wav", seconds = 30) => {
    const p = store.loadAudio(new Blob(["x"]), name, false);
    decodeResolvers.shift()!({ audio: new Float32Array(16000 * seconds), seconds });
    return p;
  };
  const finishTranscribe = (text = "hello world") => {
    const w = last();
    w.reply({
      job: jobOf(w),
      type: "result",
      ms: 3000,
      text,
      chunks: [{ text: "hello", timestamp: [0, 0.4] }],
    });
  };
  return {
    store,
    workers,
    last,
    jobOf,
    finishLoad,
    addAudio,
    finishTranscribe,
    decodeResolvers,
    deps,
  };
}

describe("issue 1: selected model vs loaded model", () => {
  it("keeps the previous model 'loaded' separate from the new selection, and blocks Transcribe until the selection is loaded", async () => {
    const t = setup();
    t.store.load();
    t.finishLoad();
    await t.addAudio();
    expect(canTranscribe(t.store.getState())).toBe(true);

    t.store.select({ model: "base" }); // dropdown changes; tiny is still what's in memory
    const s = t.store.getState();
    expect(s.loaded?.selection.model).toBe("tiny");
    expect(selectionIsLoaded(s)).toBe(false);
    expect(canTranscribe(s)).toBe(false);
    expect(transcribeBlockedReason(s)).toMatch(/isn't loaded \(loaded: tiny on wasm\)/);

    expect(t.store.transcribe({ tsMode: "word", caseId: "normal" })).toBe(false);
    expect(t.last().sent.some((m: { type: string }) => m.type === "transcribe")).toBe(false);
    expect(t.store.getState().error).toMatch(/isn't loaded/);
  });

  it("also blocks when only the device changes", async () => {
    const t = setup();
    t.store.load();
    t.finishLoad();
    await t.addAudio();
    t.store.select({ device: "webgpu" });
    expect(canTranscribe(t.store.getState())).toBe(false);
  });

  it("allows Transcribe only after the newly selected model has finished loading", async () => {
    const t = setup();
    t.store.load();
    t.finishLoad();
    await t.addAudio();
    t.store.select({ model: "base" });
    t.store.load();
    // mid-load: nothing counts as loaded and Transcribe is off
    expect(t.store.getState().loaded).toBeNull();
    expect(canTranscribe(t.store.getState())).toBe(false);
    t.finishLoad();
    expect(t.store.getState().loaded?.selection).toEqual(BASE);
    expect(canTranscribe(t.store.getState())).toBe(true);
  });

  it("a failed switch leaves nothing marked as loaded (the worker discarded the old model)", async () => {
    const t = setup();
    t.store.load();
    t.finishLoad();
    t.store.select({ model: "base" });
    t.store.load();
    t.last().reply({
      job: t.jobOf(t.last()),
      type: "error",
      stage: "load",
      message: "network error",
    });
    const s = t.store.getState();
    expect(s.loaded).toBeNull();
    expect(s.busy).toBeNull();
    expect(s.error).toMatch(
      /Couldn't load the model: network error — check the internet connection/,
    );
    expect(statusText(s)).toBe("Stopped after an error.");
  });

  it("changing the dropdowns while busy is ignored", () => {
    const t = setup();
    t.store.load();
    t.store.select({ model: "base" });
    expect(t.store.getState().selection.model).toBe("tiny");
  });

  it("attaches the model that actually ran to the result, even if the dropdown changes afterwards", async () => {
    const t = setup();
    t.store.load();
    t.finishLoad({ dtype: { encoder_model: "q8", decoder_model_merged: "q8" } });
    await t.addAudio("reading.m4a", 31.5);
    t.store.transcribe({ tsMode: "segment", caseId: "repeats" });
    t.finishTranscribe();
    t.store.select({ model: "base", device: "webgpu" });

    const p = t.store.getState().result!.provenance;
    expect(p).toMatchObject({
      model: "tiny",
      device: "wasm",
      tsMode: "segment",
      caseId: "repeats",
      fileName: "reading.m4a",
      seconds: 31.5,
      loadMs: 4200,
      loadCached: true,
    });
    expect(p.dtype).toEqual({ encoder_model: "q8", decoder_model_merged: "q8" });
  });

  it("exported summary names the model that produced the result, not the current selection", async () => {
    const t = setup();
    t.store.load();
    t.finishLoad();
    await t.addAudio("reading.m4a", 30);
    t.store.transcribe({ tsMode: "word", caseId: "normal" });
    t.finishTranscribe("every evening");
    t.store.select({ model: "base", device: "webgpu" });
    const text = buildSummary({
      result: t.store.getState().result!,
      caseTitle: "1. Normal reading",
      counts: { sub: 0, del: 0, ins: 0, rep: 0 },
      verdicts: {},
      quality: { reliable: true },
      minPause: 0.3,
      pauses: [],
      pace: null,
      passageWords: 118,
    });
    expect(text).toContain("Model: tiny ·");
    expect(text).toContain("device wasm");
    expect(text).toContain("File: reading.m4a (30.0 s)");
    expect(text).not.toContain("base");
    expect(text).not.toContain("webgpu");
  });
});

describe("issue 2: clearing and cancelling", () => {
  it("Clear during transcription stops the work and a late result cannot bring data back", async () => {
    const t = setup();
    t.store.load();
    t.finishLoad();
    await t.addAudio();
    t.store.transcribe({ tsMode: "word", caseId: "normal" });
    const worker = t.last();
    const lateHandler = worker.onmessage!; // a reply already in flight
    const job = t.jobOf(worker);

    t.store.clearData();
    const s = t.store.getState();
    expect(worker.terminated).toBe(true);
    expect(s.busy).toBeNull();
    expect(s.audio).toBeNull();
    expect(s.result).toBeNull();
    expect(s.loaded).toBeNull(); // terminating the worker unloads the model — and the screen says so
    expect(statusText(s)).toMatch(/transcription stopped.*model was unloaded.*Load model/);
    expect(canTranscribe(s)).toBe(false);

    lateHandler({ data: { job, type: "result", ms: 1, text: "late words", chunks: [] } });
    worker.onmessage?.({ data: { job, type: "result", ms: 1, text: "late words", chunks: [] } });
    expect(t.store.getState().result).toBeNull();
    expect(t.store.getState().busy).toBeNull();
    expect(statusText(t.store.getState())).toMatch(/transcription stopped/); // status not overwritten by the late reply
  });

  it("Clear during a model load keeps the load going and does not overwrite its status", () => {
    const t = setup();
    t.store.load();
    t.last().reply({
      job: t.jobOf(t.last()),
      type: "status",
      text: "Fetching: encoder_model_quantized.onnx",
    });
    t.store.clearData();
    const s = t.store.getState();
    expect(s.busy?.kind).toBe("loading");
    expect(t.last().terminated).toBe(false);
    expect(statusText(s)).toBe("Fetching: encoder_model_quantized.onnx");
    expect(s.notice).toMatch(/still loading/);
    t.finishLoad();
    expect(selectionIsLoaded(t.store.getState())).toBe(true);
    expect(statusText(t.store.getState())).toMatch(/^Model ready/);
  });

  it("Clear when idle says the model stays loaded only if it does", async () => {
    const t = setup();
    t.store.clearData();
    expect(statusText(t.store.getState())).toBe("Test data cleared.");
    t.store.load();
    t.finishLoad();
    await t.addAudio();
    t.store.clearData();
    expect(statusText(t.store.getState())).toBe("Test data cleared. The model stays loaded.");
    expect(canTranscribe(t.store.getState())).toBe(false);
    expect(transcribeBlockedReason(t.store.getState())).toBe("Add a recording first.");
  });

  it("Clear while a recording is still being read discards it when it finishes", async () => {
    const t = setup();
    const pending = t.store.loadAudio(new Blob(["x"]), "slow.wav", false);
    t.store.clearData();
    t.decodeResolvers.shift()!({ audio: new Float32Array(16000), seconds: 1 });
    expect(await pending).toBe(false);
    expect(t.store.getState().audio).toBeNull();
    expect(t.store.getSamples()).toBeNull();
    expect(t.store.getState().audioLoading).toBe(false);
  });

  it("the older of two recordings that finish out of order never wins", async () => {
    const t = setup();
    const first = t.store.loadAudio(new Blob(["a"]), "first.wav", false);
    const second = t.store.loadAudio(new Blob(["b"]), "second.wav", false);
    t.decodeResolvers[1]!({ audio: new Float32Array(16000), seconds: 1 }); // second finishes first
    t.decodeResolvers[0]!({ audio: new Float32Array(32000), seconds: 2 });
    expect(await second).toBe(true);
    expect(await first).toBe(false);
    expect(t.store.getState().audio?.name).toBe("second.wav");
  });

  it("a recording can't be swapped while a transcription runs", async () => {
    const t = setup();
    t.store.load();
    t.finishLoad();
    await t.addAudio("one.wav");
    t.store.transcribe({ tsMode: "word", caseId: "normal" });
    expect(await t.store.loadAudio(new Blob(["y"]), "two.wav", false)).toBe(false);
    expect(t.store.getState().audio?.name).toBe("one.wav");
    expect(t.store.getState().error).toMatch(/Wait for the transcription/);
    t.finishTranscribe();
    expect(t.store.getState().result?.provenance.fileName).toBe("one.wav");
  });

  it("Transcribe is refused while a recording is still being read", async () => {
    const t = setup();
    t.store.load();
    t.finishLoad();
    await t.addAudio("one.wav");
    const reading = t.store.loadAudio(new Blob(["z"]), "two.wav", false);
    expect(canTranscribe(t.store.getState())).toBe(false);
    expect(t.store.transcribe({ tsMode: "word", caseId: "normal" })).toBe(false);
    t.decodeResolvers.shift()!({ audio: new Float32Array(16000), seconds: 1 });
    await reading;
    expect(canTranscribe(t.store.getState())).toBe(true);
  });

  it("a new recording clears the previous result, so replay never mismatches", async () => {
    const t = setup();
    t.store.load();
    t.finishLoad();
    await t.addAudio("one.wav");
    t.store.transcribe({ tsMode: "word", caseId: "normal" });
    t.finishTranscribe();
    expect(t.store.getState().result).not.toBeNull();
    await t.addAudio("two.wav");
    expect(t.store.getState().result).toBeNull();
  });

  it("Cancel during transcription unloads the model and ignores the late reply; replies from other jobs are ignored too", async () => {
    const t = setup();
    t.store.load();
    t.finishLoad();
    await t.addAudio();
    t.store.transcribe({ tsMode: "word", caseId: "normal" });
    const w = t.last();
    const job = t.jobOf(w);
    w.reply({ job: job + 99, type: "result", ms: 1, text: "wrong job", chunks: [] }); // someone else's reply
    expect(t.store.getState().result).toBeNull();
    expect(t.store.getState().busy?.kind).toBe("transcribing");
    t.store.cancel();
    w.onmessage?.({ data: { job, type: "result", ms: 1, text: "late", chunks: [] } });
    expect(t.store.getState().result).toBeNull();
    expect(t.store.getState().loaded).toBeNull();
    expect(statusText(t.store.getState())).toMatch(/Transcription cancelled/);
  });

  it("after a cancel, loading starts a fresh worker and the old one stays dead", () => {
    const t = setup();
    t.store.load();
    const old = t.last();
    t.store.cancel();
    t.store.load();
    expect(t.workers).toHaveLength(2);
    expect(old.terminated).toBe(true);
    old.reply({ job: 1, type: "loaded", ms: 1, cached: false });
    expect(t.store.getState().loaded).toBeNull();
    expect(t.store.getState().busy?.kind).toBe("loading");
  });

  it("a crashed worker unloads the model and shows the failure", async () => {
    const t = setup();
    t.store.load();
    t.finishLoad();
    t.last().onerror?.({ message: "boom" });
    const s = t.store.getState();
    expect(s.loaded).toBeNull();
    expect(s.error).toMatch(/speech worker failed: boom/);
    expect(t.last().terminated).toBe(true);
  });

  it("controls and status agree while loading", () => {
    const t = setup();
    t.store.load();
    const s = t.store.getState();
    expect(s.busy?.kind).toBe("loading");
    expect(canTranscribe(s)).toBe(false);
    expect(statusText(s)).toBe("Starting…");
    expect(t.store.getState().loaded).toBeNull();
  });
});

/// <reference lib="webworker" />
// Speech recognition runs here, off the page's main thread. Audio arrives as samples from the page; nothing is uploaded.
// Downloads: the Transformers.js library + ONNX Runtime WASM (cdn.jsdelivr.net) and model files (huggingface.co),
// all cached by the browser (Cache API) for repeat loads.

export const TJS_VERSION = "4.3.1";
const TJS_URL = `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TJS_VERSION}/dist/transformers.min.js`; // self-contained build (the .web build needs a bundler for onnxruntime-web)

// Every request carries a `job` id and every reply echoes it, so the page can ignore replies from work it has cancelled.
type LoadMsg = { type: "load"; job: number; model: string; device: "wasm" | "webgpu" };
type RunMsg = { type: "transcribe"; job: number; audio: Float32Array; timestamps: "word" | "segment" };
type In = LoadMsg | RunMsg;

/* eslint-disable @typescript-eslint/no-explicit-any */
let tjs: any = null;
let asr: any = null;
let loadedKey = "";
const post = (job: number, m: Record<string, unknown>) => (self as unknown as DedicatedWorkerGlobalScope).postMessage({ job, ...m });

async function load({ job, model, device }: LoadMsg) {
  const key = `${model}|${device}`;
  if (asr && loadedKey === key) return post(job, { type: "loaded", cached: true, ms: 0, alreadyLoaded: true });
  if (device === "webgpu" && !(navigator as any).gpu) throw new Error("WebGPU isn't available in this browser. Choose CPU (WASM).");
  const t0 = performance.now();
  post(job, { type: "status", text: "Loading Transformers.js…" });
  tjs ??= await import(/* @vite-ignore */ TJS_URL);
  tjs.env.allowLocalModels = false;
  tjs.env.useBrowserCache = true;
  const cache = await caches.open("transformers-cache").catch(() => null);
  const cachedBefore = cache ? (await cache.keys()).filter((r) => r.url.includes(model)).length : 0;
  const files: Record<string, { loaded: number; total: number }> = {};
  // CPU path uses 8-bit quantised weights (smallest download); GPU path follows the Transformers.js WebGPU guidance.
  const dtype = device === "webgpu" ? { encoder_model: "fp32", decoder_model_merged: "q4" } : { encoder_model: "q8", decoder_model_merged: "q8" };
  // Forget the old model *before* loading the new one. If the new load fails, nothing is left pointing at a disposed model.
  const previous = asr;
  asr = null;
  loadedKey = "";
  await previous?.dispose?.();
  asr = await tjs.pipeline("automatic-speech-recognition", model, {
    device,
    dtype,
    progress_callback: (p: any) => {
      if (p.status === "progress" && p.file) {
        files[p.file] = { loaded: p.loaded ?? 0, total: p.total ?? 0 };
        const loaded = Object.values(files).reduce((n, f) => n + f.loaded, 0);
        const total = Object.values(files).reduce((n, f) => n + f.total, 0);
        post(job, { type: "progress", file: p.file, loaded, total });
      } else if (p.status === "initiate" || p.status === "done") {
        post(job, { type: "status", text: `${p.status === "done" ? "Ready" : "Fetching"}: ${p.file ?? ""}` });
      }
    },
  });
  loadedKey = key;
  const cachedAfter = cache ? (await cache.keys()).filter((r) => r.url.includes(model)).length : 0;
  post(job, {
    type: "loaded",
    ms: Math.round(performance.now() - t0),
    cached: cachedBefore > 0 && cachedBefore === cachedAfter,
    files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.total])),
    dtype,
    threads: tjs.env.backends?.onnx?.wasm?.numThreads ?? null,
    crossOriginIsolated: (self as any).crossOriginIsolated === true,
  });
}

async function transcribe({ job, audio, timestamps }: RunMsg) {
  if (!asr) throw new Error("Load a model first.");
  const t0 = performance.now();
  // No prompt and no passage are given to the model: the transcript is generated independently.
  const out = await asr(audio, {
    return_timestamps: timestamps === "word" ? "word" : true,
    chunk_length_s: 30,
    stride_length_s: 5,
  });
  post(job, { type: "result", ms: Math.round(performance.now() - t0), text: out.text, chunks: out.chunks ?? [] });
}

self.onmessage = async (e: MessageEvent<In>) => {
  const msg = e.data;
  try {
    if (msg.type === "load") await load(msg);
    else if (msg.type === "transcribe") await transcribe(msg);
  } catch (err) {
    post(msg.job, { type: "error", stage: msg.type, message: err instanceof Error ? err.message : String(err) });
  }
};

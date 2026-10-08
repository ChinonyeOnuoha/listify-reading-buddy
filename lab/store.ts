// State for the AI lab, kept separate from React so the awkward cases (switching models, clearing mid-run,
// late replies from cancelled work) can be tested without a browser.
//
// Rules this enforces:
//  • "Selected" (the dropdowns) and "loaded" (what is really in the worker's memory) are different things.
//    Transcribing needs the *selected* model to be the *loaded* one.
//  • Every result carries the model/device/file/settings that actually produced it. Nothing reads the live dropdowns later.
//  • Every worker request has a job id. Replies for any other job, or from a worker that was terminated, are ignored,
//    so cancelled or cleared work can never bring data back.

export type Device = "wasm" | "webgpu";
export type TsMode = "word" | "segment";
export type Selection = { model: string; device: Device };

export type LoadInfo = {
  ms: number;
  cached: boolean;
  files?: Record<string, number>;
  dtype?: unknown;
  threads?: number | null;
  crossOriginIsolated?: boolean;
  alreadyLoaded?: boolean;
};
export type Chunk = { text: string; timestamp: [number | null, number | null] };
export type AudioInfo = { name: string; url: string; seconds: number; synthetic: boolean };

/** Everything that produced a result, captured when transcription was requested. */
export type Provenance = {
  model: string;
  device: Device;
  dtype: unknown;
  threads: number | null | undefined;
  crossOriginIsolated: boolean | undefined;
  loadMs: number;
  loadCached: boolean;
  tsMode: TsMode;
  caseId: string;
  fileName: string;
  seconds: number;
  synthetic: boolean;
};
export type Result = {
  ms: number;
  text: string;
  chunks: Chunk[];
  stallMs: number;
  provenance: Provenance;
};

export type LabState = {
  selection: Selection;
  loaded: { selection: Selection; info: LoadInfo; stallMs: number } | null;
  busy: null | { kind: "loading" | "transcribing"; job: number };
  deleting: boolean;
  audioLoading: boolean;
  progress: { loaded: number; total: number } | null;
  workerText: string;
  notice: string;
  error: string | null;
  audio: AudioInfo | null;
  result: Result | null;
};

export type WorkerLike = {
  postMessage: (msg: unknown, transfer?: Transferable[]) => void;
  terminate: () => void;
  onmessage: ((e: { data: any }) => void) | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  onerror: ((e: { message?: string }) => void) | null;
};

export type Deps = {
  createWorker: () => WorkerLike;
  decode: (blob: Blob) => Promise<{ audio: Float32Array; seconds: number }>;
  stall?: { start: () => void; stop: () => number };
  clearModelCache?: () => Promise<boolean>;
  makeUrl?: (b: Blob) => string;
  revokeUrl?: (u: string) => void;
};

const same = (a: Selection, b: Selection) => a.model === b.model && a.device === b.device;

export const selectionIsLoaded = (s: LabState) =>
  !!s.loaded && same(s.loaded.selection, s.selection);
export const canTranscribe = (s: LabState) =>
  !s.busy && !s.deleting && !s.audioLoading && !!s.audio && selectionIsLoaded(s);

/** One status line derived from state, so it can't contradict the controls. */
export function statusText(s: LabState): string {
  if (s.deleting) return "Deleting downloaded model files…";
  if (s.busy?.kind === "loading") return s.workerText || "Loading…";
  if (s.busy?.kind === "transcribing") return "Transcribing on this device…";
  return (
    s.notice || (s.loaded ? "" : "Model not loaded. Nothing is downloaded until you press Load.")
  );
}

/** Why Transcribe is unavailable, in words. Empty when it is available. */
export function transcribeBlockedReason(s: LabState): string {
  if (s.busy) return "";
  if (!s.audio) return s.audioLoading ? "Reading the recording…" : "Add a recording first.";
  if (s.audioLoading) return "Reading the recording…";
  if (!s.loaded) return "Load the selected model first.";
  if (!selectionIsLoaded(s)) {
    const l = s.loaded.selection;
    return `The selected model isn't loaded (loaded: ${l.model} on ${l.device}). Press Load model.`;
  }
  return "";
}

type Current =
  | { job: number; kind: "loading"; target: Selection }
  | { job: number; kind: "transcribing"; provenance: Provenance };

const initial = (selection: Selection): LabState => ({
  selection,
  loaded: null,
  busy: null,
  deleting: false,
  audioLoading: false,
  progress: null,
  workerText: "",
  notice: "",
  error: null,
  audio: null,
  result: null,
});

const hint = (message: string) =>
  /unauthori[sz]ed|404|not found/i.test(message)
    ? " — the model files couldn't be downloaded (the model may not exist or may need access)."
    : /fetch|network/i.test(message)
      ? " — check the internet connection; files already downloaded stay cached."
      : "";

export class LabStore {
  private state: LabState;
  private listeners = new Set<() => void>();
  private worker: WorkerLike | null = null;
  private current: Current | null = null;
  private jobSeq = 0;
  private audioEpoch = 0;
  private samples: Float32Array | null = null;

  constructor(
    private deps: Deps,
    selection: Selection,
  ) {
    this.state = initial(selection);
  }

  getState = () => this.state;
  getSamples = () => this.samples;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  };
  private set(patch: Partial<LabState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  /** Change the dropdowns. The loaded model is unaffected; Transcribe stays off until the selection is loaded. */
  select(patch: Partial<Selection>) {
    if (this.state.busy || this.state.deleting) return;
    this.set({ selection: { ...this.state.selection, ...patch }, error: null, notice: "" });
  }

  // ---- worker plumbing --------------------------------------------------------------------------------------
  private ensureWorker(): WorkerLike {
    if (this.worker) return this.worker;
    const w = this.deps.createWorker();
    w.onmessage = (e) => this.onMessage(w, e.data);
    w.onerror = (e) => this.onWorkerError(w, e);
    this.worker = w;
    return w;
  }
  /** Terminating is the only dependable way to stop a download or an inference. It also unloads the model. */
  private stopWorker() {
    const w = this.worker;
    this.worker = null;
    this.current = null;
    if (w) {
      w.onmessage = null;
      w.onerror = null;
      w.terminate();
    }
    this.deps.stall?.stop();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onMessage(from: WorkerLike, m: any) {
    if (from !== this.worker) return; // from a worker that has been terminated
    const cur = this.current;
    if (!cur || m.job !== cur.job) return; // from work that was cancelled or replaced

    if (m.type === "status") return this.set({ workerText: m.text });
    if (m.type === "progress") return this.set({ progress: { loaded: m.loaded, total: m.total } });

    if (m.type === "loaded" && cur.kind === "loading") {
      const stallMs = this.deps.stall?.stop() ?? 0;
      this.current = null;
      const info: LoadInfo = {
        ms: m.ms,
        cached: m.cached,
        files: m.files,
        dtype: m.dtype,
        threads: m.threads,
        crossOriginIsolated: m.crossOriginIsolated,
      };
      this.set({
        loaded: { selection: cur.target, info, stallMs },
        busy: null,
        progress: null,
        workerText: "",
        notice: m.alreadyLoaded
          ? "Model already loaded."
          : `Model ready (${m.cached ? "from browser cache" : "downloaded"}) in ${(m.ms / 1000).toFixed(1)} s.`,
      });
    } else if (m.type === "result" && cur.kind === "transcribing") {
      const stallMs = this.deps.stall?.stop() ?? 0;
      this.current = null;
      this.set({
        result: { ms: m.ms, text: m.text, chunks: m.chunks, stallMs, provenance: cur.provenance },
        busy: null,
        notice: `Transcribed in ${(m.ms / 1000).toFixed(1)} s.`,
      });
    } else if (m.type === "error") {
      this.deps.stall?.stop();
      this.current = null;
      this.set({
        busy: null,
        progress: null,
        workerText: "",
        notice: "Stopped after an error.",
        error: `${cur.kind === "loading" ? "Couldn't load the model" : "Couldn't transcribe"}: ${m.message}${hint(m.message)}`,
      });
    }
  }

  private onWorkerError(from: WorkerLike, e: { message?: string }) {
    if (from !== this.worker) return;
    this.stopWorker();
    this.set({
      busy: null,
      loaded: null,
      progress: null,
      workerText: "",
      notice: "Stopped after an error.",
      error: `The speech worker failed: ${e.message || "unknown error"} (this browser may not support module workers or WASM). The model was unloaded.`,
    });
  }

  // ---- model ------------------------------------------------------------------------------------------------
  load() {
    const s = this.state;
    if (s.busy || s.deleting) return;
    if (selectionIsLoaded(s)) return this.set({ notice: "That model is already loaded." });
    const job = ++this.jobSeq;
    const target = { ...s.selection };
    this.current = { job, kind: "loading", target };
    this.deps.stall?.start();
    // The worker discards whatever was loaded before starting, so nothing counts as loaded from here until this finishes.
    this.set({
      busy: { kind: "loading", job },
      loaded: null,
      error: null,
      progress: null,
      workerText: "Starting…",
      notice: "",
    });
    this.ensureWorker().postMessage({
      type: "load",
      job,
      model: target.model,
      device: target.device,
    });
  }

  /** Stop whatever is running. Unloads the model (the worker is terminated). */
  cancel() {
    const busy = this.state.busy;
    if (!busy) return;
    this.stopWorker();
    this.set({
      busy: null,
      loaded: null,
      progress: null,
      workerText: "",
      notice:
        busy.kind === "transcribing"
          ? "Transcription cancelled. The model was unloaded to stop it — press Load model (cached files load in seconds) to use it again."
          : "Cancelled. The model is unloaded (files fully downloaded before cancelling stay in the browser cache).",
    });
  }

  async deleteModels() {
    if (this.state.deleting) return;
    this.stopWorker();
    this.set({ busy: null, loaded: null, progress: null, workerText: "", deleting: true });
    const ok = (await this.deps.clearModelCache?.().catch(() => false)) ?? false;
    this.set({
      deleting: false,
      notice: ok
        ? "Deleted downloaded model files from this browser."
        : "No downloaded model files were stored.",
    });
  }

  // ---- audio and results ------------------------------------------------------------------------------------
  /** Read a recording. Refused while transcribing, so a result can never sit beside a different file. */
  async loadAudio(blob: Blob, name: string, synthetic: boolean): Promise<boolean> {
    if (this.state.busy?.kind === "transcribing") {
      this.set({
        error: "Wait for the transcription to finish, or cancel it, before changing the recording.",
      });
      return false;
    }
    const epoch = ++this.audioEpoch;
    this.set({ error: null, audioLoading: true });
    try {
      const { audio, seconds } = await this.deps.decode(blob);
      // Cleared, or another file chosen, while this one was being read: drop it.
      if (epoch !== this.audioEpoch) return false;
      this.releaseAudio();
      this.samples = audio;
      const url = (this.deps.makeUrl ?? URL.createObjectURL)(blob);
      this.set({ audio: { name, url, seconds, synthetic }, result: null, audioLoading: false });
      return true;
    } catch {
      if (epoch === this.audioEpoch)
        this.set({
          audioLoading: false,
          error: `Couldn't read “${name}” as audio in this browser. Try WAV, MP3 or M4A.`,
        });
      return false;
    }
  }

  private releaseAudio() {
    const url = this.state.audio?.url;
    if (url) (this.deps.revokeUrl ?? URL.revokeObjectURL)(url);
    this.samples = null;
  }

  transcribe(opts: { tsMode: TsMode; caseId: string }): boolean {
    const s = this.state;
    if (s.busy || s.deleting) return false;
    if (!canTranscribe(s) || !this.samples || !s.audio || !s.loaded) {
      this.set({ error: transcribeBlockedReason(s) || "Can't transcribe right now." });
      return false;
    }
    const job = ++this.jobSeq;
    const provenance: Provenance = {
      model: s.loaded.selection.model,
      device: s.loaded.selection.device,
      dtype: s.loaded.info.dtype,
      threads: s.loaded.info.threads,
      crossOriginIsolated: s.loaded.info.crossOriginIsolated,
      loadMs: s.loaded.info.ms,
      loadCached: s.loaded.info.cached,
      tsMode: opts.tsMode,
      caseId: opts.caseId,
      fileName: s.audio.name,
      seconds: s.audio.seconds,
      synthetic: s.audio.synthetic,
    };
    this.current = { job, kind: "transcribing", provenance };
    const copy = this.samples.slice();
    this.deps.stall?.start();
    this.set({ busy: { kind: "transcribing", job }, result: null, error: null, notice: "" });
    this.ensureWorker().postMessage(
      { type: "transcribe", job, audio: copy, timestamps: opts.tsMode },
      [copy.buffer],
    );
    return true;
  }

  /**
   * Forget the recording and results. If a transcription is running it is stopped (which unloads the model) and its late
   * result is ignored. A model load is not test data, so it carries on and its progress stays on screen.
   */
  clearData() {
    this.audioEpoch++; // also invalidates any recording still being read
    this.releaseAudio();
    const transcribing = this.state.busy?.kind === "transcribing";
    const loading = this.state.busy?.kind === "loading";
    if (transcribing) this.stopWorker();
    this.set({
      audio: null,
      result: null,
      error: null,
      audioLoading: false,
      ...(transcribing ? { busy: null, loaded: null, progress: null, workerText: "" } : {}),
      notice: transcribing
        ? "Test data cleared and transcription stopped. The model was unloaded to stop it — press Load model (cached files load in seconds) to continue."
        : loading
          ? "Test data cleared. The model is still loading."
          : `Test data cleared.${this.state.loaded ? " The model stays loaded." : ""}`,
    });
  }

  /** Release the worker and any audio URL (when the page goes away). */
  dispose() {
    this.stopWorker();
    this.releaseAudio();
    this.listeners.clear();
  }
}

// Reading Buddy — AI feasibility lab (development only; not part of the production app).
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { align, decodeTo16k, findPauses, paceWindows, placePauses, timestampQuality, type Op, type Word } from "./analysis";
import { CASES, PASSAGE } from "./test-material";

const TJS_VERSION = "4.3.1";
const TESS_VERSION = "7.0.0";
const MODELS = [
  { id: "onnx-community/whisper-tiny.en_timestamped", label: "Whisper tiny.en (word timestamps)", expectMB: "≈41 MB (q8)" },
  { id: "onnx-community/whisper-base.en_timestamped", label: "Whisper base.en (word timestamps)", expectMB: "≈77 MB (q8)" },
];
type Verdict = "" | "genuine" | "asr-error" | "unsure";
type LoadInfo = { ms: number; cached: boolean; files?: Record<string, number>; dtype?: unknown; threads?: number | null; crossOriginIsolated?: boolean };
type Result = { ms: number; text: string; chunks: { text: string; timestamp: [number | null, number | null] }[]; stallMs: number };

const mb = (b: number) => `${(b / 1e6).toFixed(1)} MB`;
const t = (s: number | null | undefined) => (s == null ? "—" : `${s.toFixed(2)}s`);

/** Tracks the longest gap between timer ticks — a rough measure of whether the page stayed responsive. */
function useStallMeter() {
  const ref = useRef<{ id: number; last: number; max: number } | null>(null);
  return {
    start() {
      const s = { id: 0, last: performance.now(), max: 0 };
      s.id = window.setInterval(() => {
        const now = performance.now();
        s.max = Math.max(s.max, now - s.last - 50);
        s.last = now;
      }, 50);
      ref.current = s;
    },
    stop() {
      const s = ref.current;
      if (!s) return 0;
      clearInterval(s.id);
      ref.current = null;
      return Math.round(s.max);
    },
  };
}

function Lab() {
  const [passage, setPassage] = useState(PASSAGE);
  const [model, setModel] = useState(MODELS[0]!.id);
  const [device, setDevice] = useState<"wasm" | "webgpu">("wasm");
  const [status, setStatus] = useState("Model not loaded. Nothing is downloaded until you press Load.");
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [busy, setBusy] = useState<"" | "loading" | "transcribing">("");
  const [loadInfo, setLoadInfo] = useState<LoadInfo | null>(null);
  const [loadStall, setLoadStall] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState(CASES[0]!.id);
  const [file, setFile] = useState<{ name: string; url: string; seconds: number; synthetic: boolean } | null>(null);
  const audio16 = useRef<Float32Array | null>(null);
  const [tsMode, setTsMode] = useState<"word" | "segment">("word");
  const [result, setResult] = useState<Result | null>(null);
  const [verdicts, setVerdicts] = useState<Record<number, Verdict>>({});
  const [minPause, setMinPause] = useState(0.3);
  const [synthAvailable, setSynthAvailable] = useState<string[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const player = useRef<HTMLAudioElement>(null);
  const stall = useStallMeter();
  const hasGpu = typeof navigator !== "undefined" && "gpu" in navigator;

  // Synthetic pipeline-check files exist only if generated locally (lab/synthetic-audio, git-ignored).
  useEffect(() => {
    void Promise.all(CASES.map((c) => fetch(`/synthetic-audio/${c.id}.wav`, { method: "HEAD" }).then((r) => (r.ok && r.headers.get("content-type")?.includes("audio") ? c.id : null), () => null))).then((ids) =>
      setSynthAvailable(ids.filter((x): x is string => !!x)),
    );
  }, []);

  const worker = () => {
    if (workerRef.current) return workerRef.current;
    const w = new Worker(new URL("./asr.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === "status") setStatus(m.text);
      else if (m.type === "progress") setProgress({ loaded: m.loaded, total: m.total });
      else if (m.type === "loaded") {
        setLoadStall(stall.stop());
        setLoadInfo(m);
        setBusy("");
        setStatus(m.alreadyLoaded ? "Model already loaded." : `Model ready (${m.cached ? "from browser cache" : "downloaded"}) in ${(m.ms / 1000).toFixed(1)} s.`);
      } else if (m.type === "result") {
        const stallMs = stall.stop();
        setResult({ ms: m.ms, text: m.text, chunks: m.chunks, stallMs });
        setVerdicts({});
        setBusy("");
        setStatus(`Transcribed in ${(m.ms / 1000).toFixed(1)} s.`);
      } else if (m.type === "error") {
        stall.stop();
        setBusy("");
        const hint = /unauthori[sz]ed|404|not found/i.test(m.message)
          ? " — the model files couldn't be downloaded (the model may not exist or may need access)."
          : /fetch|network/i.test(m.message)
            ? " — check the internet connection; files already downloaded stay cached."
            : "";
        setError(`${m.stage === "load" ? "Couldn't load the model" : "Couldn't transcribe"}: ${m.message}${hint}`);
        setStatus("Stopped after an error.");
      }
    };
    w.onerror = (e) => {
      setBusy("");
      setError(`The speech worker failed: ${e.message || "unknown error"} (this browser may not support module workers or WASM).`);
    };
    workerRef.current = w;
    return w;
  };

  const load = () => {
    setError(null);
    setProgress(null);
    setBusy("loading");
    setStatus("Starting…");
    stall.start();
    worker().postMessage({ type: "load", model, device });
  };
  // Cancelling terminates the worker: the only dependable way to stop a download or inference mid-way.
  const cancel = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    stall.stop();
    setBusy("");
    setLoadInfo(null);
    setProgress(null);
    setStatus("Cancelled. The model is unloaded (files fully downloaded before cancelling stay in the browser cache).");
  };
  const deleteModels = async () => {
    cancel();
    const ok = await caches.delete("transformers-cache");
    setStatus(ok ? "Deleted downloaded model files from this browser." : "No downloaded model files were stored.");
  };

  const loadAudio = async (blob: Blob, name: string, synthetic: boolean) => {
    setError(null);
    setResult(null);
    try {
      const { audio, seconds } = await decodeTo16k(blob);
      audio16.current = audio;
      if (file) URL.revokeObjectURL(file.url);
      setFile({ name, url: URL.createObjectURL(blob), seconds, synthetic });
    } catch {
      setError(`Couldn't read “${name}” as audio in this browser. Try WAV, MP3 or M4A.`);
    }
  };
  const transcribe = () => {
    if (!audio16.current) return;
    setError(null);
    setBusy("transcribing");
    setStatus("Transcribing on this device…");
    stall.start();
    const copy = audio16.current.slice();
    worker().postMessage({ type: "transcribe", audio: copy, timestamps: tsMode }, [copy.buffer]);
  };
  const clearAll = () => {
    if (file) URL.revokeObjectURL(file.url);
    setFile(null);
    audio16.current = null;
    setResult(null);
    setVerdicts({});
    setError(null);
    setStatus(loadInfo ? "Test data cleared. The model stays loaded." : "Test data cleared.");
  };

  const playAt = (start: number | null | undefined, end?: number | null) => {
    const a = player.current;
    if (!a || start == null) return;
    a.currentTime = Math.max(0, start - 0.6);
    void a.play();
    const stopAt = (end ?? start) + 0.8;
    const onTime = () => {
      if (a.currentTime >= stopAt) {
        a.pause();
        a.removeEventListener("timeupdate", onTime);
      }
    };
    a.addEventListener("timeupdate", onTime);
  };

  const words: Word[] = useMemo(
    () => (result?.chunks ?? []).map((c) => ({ text: c.text, start: c.timestamp?.[0] ?? null, end: c.timestamp?.[1] ?? null })),
    [result],
  );
  const ops: Op[] = useMemo(() => (result ? align(passage, tsMode === "word" ? words : [{ text: result.text, start: null, end: null }]) : []), [result, passage, words, tsMode]);
  const diffs = ops.map((o, i) => ({ o, i })).filter(({ o }) => o.type !== "match");
  const quality = useMemo(() => (tsMode === "word" && result ? timestampQuality(words) : null), [words, result, tsMode]);
  const pauseInfo = useMemo(() => (result && audio16.current ? findPauses(audio16.current, 16000, minPause) : null), [result, minPause]);
  const pauses = useMemo(() => (pauseInfo ? placePauses(pauseInfo.pauses, words) : []), [pauseInfo, words]);
  const pace = useMemo(() => (quality?.reliable ? paceWindows(words) : null), [quality, words]);
  const kase = CASES.find((c) => c.id === caseId)!;
  const counts = {
    sub: diffs.filter(({ o }) => o.type === "sub").length,
    del: diffs.filter(({ o }) => o.type === "del").length,
    ins: diffs.filter(({ o }) => o.type === "ins" && !o.repeatOf).length,
    rep: diffs.filter(({ o }) => o.type === "ins" && o.repeatOf).length,
  };
  const verdictCounts = Object.values(verdicts).reduce<Record<string, number>>((a, v) => (v ? { ...a, [v]: (a[v] ?? 0) + 1 } : a), {});

  const summary = () =>
    [
      `Case: ${kase.title}${file?.synthetic ? " (SYNTHETIC voice — pipeline check only)" : ""}`,
      `File: ${file?.name} (${file?.seconds.toFixed(1)} s)`,
      `Model: ${model} · Transformers.js ${TJS_VERSION} · device ${device} · dtype ${JSON.stringify(loadInfo?.dtype)} · cross-origin isolated ${loadInfo?.crossOriginIsolated}`,
      `Load: ${loadInfo ? `${(loadInfo.ms / 1000).toFixed(1)} s (${loadInfo.cached ? "cache" : "download"})` : "—"} · Transcribe: ${result ? `${(result.ms / 1000).toFixed(1)} s, RTF ${(result.ms / 1000 / (file?.seconds ?? 1)).toFixed(2)}` : "—"} · UI max stall ${result?.stallMs ?? "—"} ms`,
      `Transcript (uncorrected): ${result?.text.trim()}`,
      `Differences: ${counts.sub} substituted, ${counts.del} omitted, ${counts.ins} added, ${counts.rep} possible repetition words`,
      `Your verdicts: ${JSON.stringify(verdictCounts)}`,
      `Timestamps: ${quality ? JSON.stringify(quality) : "segment mode"}`,
      `Pauses ≥ ${minPause}s: ${pauses.map((p) => `${p.duration.toFixed(2)}s after “${p.after ?? "?"}”`).join("; ") || "none"}`,
      pace ? `Pace (median ${pace.medianWpm} wpm): ${pace.windows.map((w) => `${w.from}-${Math.round(w.to)}s ${w.wpm}${w.differs ? "*" : ""}`).join(", ")}` : "Pace: not shown (no reliable word timestamps)",
    ].join("\n");

  return (
    <main>
      <p className="banner">
        <strong>Development-only experiment.</strong> Not part of the Reading Buddy app or its production build. Audio and passages stay in this tab;
        speech recognition runs on this device. Model files download from Hugging Face; the AI libraries from jsDelivr.
      </p>
      <h1>On-device speech recognition — feasibility lab</h1>
      <p className="muted">
        A transcript difference is something to check by listening — not proof of a reading mistake. Recognition models can drop repetitions, invent
        words (especially in silence or noise) and mistime words. This screen shows those problems rather than hiding them.
      </p>

      <section>
        <h2>1. Expected passage and recording script</h2>
        <p className="muted">The passage is only used to compare after transcription. It is never given to the model.</p>
        <textarea aria-label="Expected passage" value={passage} onChange={(e) => setPassage(e.target.value)} />
        <div className="row" style={{ marginTop: ".5rem" }}>
          <button onClick={() => setPassage(PASSAGE)}>Reset to the test passage</button>
        </div>
        <details style={{ marginTop: ".75rem" }}>
          <summary>Recording script (also in lab/RECORDING_SCRIPT.md)</summary>
          {CASES.map((c) => (
            <div key={c.id}>
              <h3>{c.title}</h3>
              {c.instructions.map((s) => (
                <div key={s}>{s}</div>
              ))}
            </div>
          ))}
        </details>
      </section>

      <section>
        <h2>2. Model</h2>
        <div className="row">
          <label>
            Model{" "}
            <select value={model} onChange={(e) => setModel(e.target.value)} disabled={!!busy}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.expectMB}
                </option>
              ))}
            </select>
          </label>
          <label>
            Run on{" "}
            <select value={device} onChange={(e) => setDevice(e.target.value as "wasm" | "webgpu")} disabled={!!busy}>
              <option value="wasm">CPU (WASM) — works everywhere WASM does</option>
              <option value="webgpu" disabled={!hasGpu}>
                GPU (WebGPU){hasGpu ? "" : " — not available in this browser"}
              </option>
            </select>
          </label>
        </div>
        <div className="row" style={{ marginTop: ".6rem" }}>
          <button className="primary" onClick={load} disabled={!!busy}>
            Load model
          </button>
          <button onClick={cancel} disabled={!busy}>
            Cancel
          </button>
          <button onClick={() => void deleteModels()} disabled={!!busy}>
            Delete downloaded models
          </button>
        </div>
        <p role="status" style={{ marginBottom: ".3rem" }}>
          {status}
        </p>
        {progress && busy === "loading" && (
          <>
            <progress value={progress.loaded} max={progress.total || undefined} />
            <div className="muted">
              {mb(progress.loaded)} of {progress.total ? mb(progress.total) : "?"}
            </div>
          </>
        )}
        {loadInfo && (
          <div className="kv" style={{ marginTop: ".5rem" }}>
            <span>Library</span>
            <span>Transformers.js {TJS_VERSION} (Apache-2.0)</span>
            <span>Model</span>
            <span>
              {model} — weights from openai/{model.includes("tiny") ? "whisper-tiny.en" : "whisper-base.en"} (Apache-2.0 on Hugging Face)
            </span>
            <span>Precision</span>
            <span>{JSON.stringify(loadInfo.dtype)}</span>
            <span>Load time</span>
            <span>
              {(loadInfo.ms / 1000).toFixed(1)} s ({loadInfo.cached ? "from browser cache" : "downloaded"}), UI max stall {loadStall} ms
            </span>
            <span>Model files</span>
            <span>{loadInfo.files ? Object.entries(loadInfo.files).map(([f, b]) => `${f.split("/").pop()} ${mb(b)}`).join(", ") : "—"}</span>
            <span>Threads</span>
            <span>
              {String(loadInfo.threads ?? "default")} · cross-origin isolated: {String(loadInfo.crossOriginIsolated)}
            </span>
          </div>
        )}
        {error && (
          <p role="alert" className="warn">
            {error}
          </p>
        )}
      </section>

      <section>
        <h2>3. Recording</h2>
        <div className="row">
          <label>
            Test case{" "}
            <select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              {CASES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Upload a recording{" "}
            <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && void loadAudio(e.target.files[0], e.target.files[0].name, false)} />
          </label>
        </div>
        {synthAvailable.length > 0 && (
          <div className="row" style={{ marginTop: ".5rem" }}>
            <span className="muted">Synthetic voice (pipeline check only):</span>
            {synthAvailable.map((id) => (
              <button
                key={id}
                onClick={async () => {
                  setCaseId(id);
                  const blob = await (await fetch(`/synthetic-audio/${id}.wav`)).blob();
                  await loadAudio(blob, `synthetic-${id}.wav`, true);
                }}
              >
                {id}
              </button>
            ))}
          </div>
        )}
        {file && (
          <>
            {file.synthetic && <p className="banner">Synthetic speech: checks the pipeline only. It says nothing about how the model handles your voice, accent or real reading.</p>}
            <audio ref={player} src={file.url} controls style={{ width: "100%", marginTop: ".5rem" }} />
            <div className="muted">
              {file.name} · {file.seconds.toFixed(1)} s
            </div>
          </>
        )}
        <div className="row" style={{ marginTop: ".6rem" }}>
          <label>
            Timestamps{" "}
            <select value={tsMode} onChange={(e) => setTsMode(e.target.value as "word" | "segment")} disabled={!!busy}>
              <option value="word">Word-level</option>
              <option value="segment">Segment-level</option>
            </select>
          </label>
          <button className="primary" onClick={transcribe} disabled={!!busy || !file || !loadInfo}>
            Transcribe
          </button>
          <button onClick={cancel} disabled={busy !== "transcribing"}>
            Cancel
          </button>
          <button onClick={clearAll}>Clear test data</button>
        </div>
        {!loadInfo && <p className="muted">Load a model first.</p>}
      </section>

      {result && file && (
        <section>
          <h2>4. Results — {kase.title}</h2>
          <div className="kv">
            <span>Audio</span>
            <span>{file.seconds.toFixed(1)} s</span>
            <span>Processing</span>
            <span>
              {(result.ms / 1000).toFixed(1)} s (real-time factor {(result.ms / 1000 / file.seconds).toFixed(2)}) · UI max stall {result.stallMs} ms
            </span>
          </div>

          <h3>Uncorrected transcript</h3>
          <p>{result.text.trim() || <em>(empty)</em>}</p>

          {tsMode === "word" && (
            <>
              <h3>Word timestamps {quality && !quality.reliable && <span className="warn">— look unreliable</span>}</h3>
              {quality && (
                <p className="muted">
                  {quality.words} words · missing {quality.missing} · near-zero length {quality.zeroLength} · out of order {quality.backwards} · over 2.5 s{" "}
                  {quality.overlong}
                </p>
              )}
              <div className="words">
                {words.map((w, i) => (
                  <button key={i} className="w" title={`${t(w.start)}–${t(w.end)}`} onClick={() => playAt(w.start, w.end)}>
                    {w.text.trim()}
                    <sub className="muted">{w.start != null ? w.start.toFixed(1) : ""}</sub>
                  </button>
                ))}
              </div>
            </>
          )}

          <h3>Compared with the passage (after transcription)</h3>
          <p className="muted">
            <span className="w sub">substituted</span> <span className="w del">omitted</span> <span className="w ins">added</span>{" "}
            <span className="w rep">possible repetition</span> — click to replay. {counts.sub} substituted · {counts.del} omitted · {counts.ins} added ·{" "}
            {counts.rep} possible repetition words.
          </p>
          <div className="words">
            {ops.map((o, i) =>
              o.type === "match" ? (
                <span key={i}> {o.ref} </span>
              ) : o.type === "sub" ? (
                <button key={i} className="w sub" onClick={() => playAt(o.hyp.start, o.hyp.end)} title={`passage: ${o.ref}`}>
                  {o.hyp.text} <small>({o.ref})</small>
                </button>
              ) : o.type === "del" ? (
                <button key={i} className="w del" onClick={() => playAt(o.near)}>
                  {o.ref}
                </button>
              ) : (
                <button key={i} className={`w ${o.repeatOf ? "rep" : "ins"}`} onClick={() => playAt(o.hyp.start, o.hyp.end)}>
                  {o.hyp.text}
                </button>
              ),
            )}
          </div>

          {diffs.length > 0 && (
            <>
              <h3>Check each difference by listening</h3>
              <p className="muted">Mark whether the reader really said something different, or the recognition got it wrong. Kept in this tab only.</p>
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Passage</th>
                    <th>Transcript</th>
                    <th>Time</th>
                    <th>Your check</th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.map(({ o, i }) => {
                    const time = o.type === "del" ? o.near : o.hyp.start;
                    return (
                      <tr key={i}>
                        <td>{o.type === "sub" ? "Substituted" : o.type === "del" ? "Omitted" : o.type === "ins" && o.repeatOf ? `Possible repetition (“${o.repeatOf}”)` : "Added"}</td>
                        <td>{o.type === "ins" ? "—" : o.ref}</td>
                        <td>{o.type === "del" ? "—" : o.hyp.text}</td>
                        <td>
                          <button className="w" onClick={() => playAt(time, o.type === "del" ? null : o.hyp.end)}>
                            ▶ {t(time)}
                          </button>
                        </td>
                        <td>
                          <select value={verdicts[i] ?? ""} onChange={(e) => setVerdicts({ ...verdicts, [i]: e.target.value as Verdict })} aria-label="Your check">
                            <option value="">—</option>
                            <option value="genuine">Really read differently</option>
                            <option value="asr-error">Recognition error</option>
                            <option value="unsure">Unsure</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          <h3>Pauses measured from the audio</h3>
          <p className="muted">
            Silence detection finds gaps in sound. It can't tell whether a pause is misplaced — natural pauses between sentences are normal.{" "}
            {pauseInfo && !pauseInfo.speech && <span className="warn">Little speech-like variation detected: this may be silence or steady noise.</span>}
          </p>
          <label className="muted">
            Minimum pause{" "}
            <select value={minPause} onChange={(e) => setMinPause(Number(e.target.value))}>
              {[0.3, 0.5, 0.8, 1.2].map((v) => (
                <option key={v} value={v}>
                  {v} s
                </option>
              ))}
            </select>
          </label>
          <table>
            <tbody>
              {pauses.map((p, k) => (
                <tr key={k}>
                  <td>
                    <button className="w" onClick={() => playAt(p.start, p.end)}>
                      ▶ {t(p.start)}
                    </button>
                  </td>
                  <td>{p.duration.toFixed(2)} s</td>
                  <td className="muted">{p.after || p.before ? `between “${p.after ?? "?"}” and “${p.before ?? "?"}”` : "no word timestamps nearby"}</td>
                </tr>
              ))}
              {!pauses.length && (
                <tr>
                  <td className="muted">No pauses at or above {minPause} s.</td>
                </tr>
              )}
            </tbody>
          </table>

          <h3>Pace</h3>
          {pace ? (
            <>
              <p className="muted">Words per minute in 5-second windows from word timestamps (median {pace.medianWpm}). Starred windows differ by over 30% — a moment to listen to, not a mistake.</p>
              <div className="muted">{pace.windows.map((w) => `${Math.round(w.from)}–${Math.round(w.to)}s: ${w.wpm}${w.differs ? "*" : ""}`).join(" · ")}</div>
            </>
          ) : (
            <p className="muted">Not shown: pace needs reliable word-level timestamps. It is never inferred from an untimed transcript.</p>
          )}

          <h3>What this case should show</h3>
          <ul>
            {kase.expect.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <div className="row">
            <button onClick={() => void navigator.clipboard.writeText(summary())}>Copy result summary</button>
            <span className="muted">For the testing log. Copies text only — no audio.</span>
          </div>
        </section>
      )}

      <OcrSection onUse={(text) => setPassage(text)} />
    </main>
  );
}

/* ---------------------------------------------------------------- OCR (experimental) --------------------------- */
function OcrSection({ onUse }: { onUse: (text: string) => void }) {
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [out, setOut] = useState<{ text: string; confidence: number; ms: number; low: { text: string; confidence: number }[] } | null>(null);
  const [edited, setEdited] = useState("");
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<{ terminate: () => Promise<unknown> } | null>(null);

  const run = async () => {
    if (!img) return;
    setBusy(true);
    setError(null);
    setOut(null);
    const t0 = performance.now();
    try {
      const mod = await import(/* @vite-ignore */ `https://cdn.jsdelivr.net/npm/tesseract.js@${TESS_VERSION}/dist/tesseract.esm.min.js`);
      const T = mod.createWorker ? mod : mod.default; // the ESM build exposes its API on the default export
      const w = await T.createWorker("eng", 1, { logger: (m: { progress?: number }) => m.progress != null && setProgress(m.progress) });
      workerRef.current = w;
      const { data } = await w.recognize(img, {}, { blocks: true, text: true });
      const words: { text: string; confidence: number }[] = [];
      for (const b of data.blocks ?? []) for (const p of b.paragraphs ?? []) for (const l of p.lines ?? []) for (const wd of l.words ?? []) words.push({ text: wd.text, confidence: wd.confidence });
      setOut({ text: data.text, confidence: data.confidence, ms: Math.round(performance.now() - t0), low: words.filter((x) => x.confidence < 70) });
      setEdited(data.text);
      await w.terminate();
    } catch (e) {
      setError(`Text extraction failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      workerRef.current = null;
      setBusy(false);
    }
  };

  return (
    <section>
      <h2>5. Page photo → text (Tesseract.js {TESS_VERSION}, experimental)</h2>
      <p className="muted">
        Runs on this device; downloads the OCR engine and English language data from jsDelivr. Extracted text always needs reviewing before it becomes the
        expected passage. Photos only — PDFs would need a separate step (render each page with a PDF library such as PDF.js first, or read embedded text).
      </p>
      <div className="row">
        <input type="file" accept="image/*" aria-label="Page image" onChange={(e) => e.target.files?.[0] && setImg(URL.createObjectURL(e.target.files[0]))} />
        <button className="primary" disabled={!img || busy} onClick={() => void run()}>
          Extract text
        </button>
        <button
          disabled={!busy}
          onClick={() => {
            void workerRef.current?.terminate();
            setBusy(false);
          }}
        >
          Cancel
        </button>
      </div>
      {busy && <progress value={progress} max={1} />}
      {img && <img src={img} alt="Page to extract text from" style={{ maxWidth: "100%", maxHeight: "16rem", marginTop: ".5rem", borderRadius: 8 }} />}
      {error && (
        <p role="alert" className="warn">
          {error}
        </p>
      )}
      {out && (
        <>
          <p className="muted">
            Mean confidence {out.confidence.toFixed(0)}% · {(out.ms / 1000).toFixed(1)} s · {out.low.length} low-confidence words:{" "}
            {out.low.map((x) => `“${x.text}” ${x.confidence.toFixed(0)}%`).join(", ") || "none"}
          </p>
          <label>
            Review and correct the extracted text
            <textarea value={edited} onChange={(e) => setEdited(e.target.value)} />
          </label>
          <button onClick={() => onUse(edited)}>Use as expected passage</button>
        </>
      )}
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<Lab />);

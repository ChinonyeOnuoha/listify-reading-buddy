// Reading Buddy — AI feasibility lab (development only; not part of the production app).
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { align, decodeTo16k, findPauses, paceWindows, placePauses, timestampQuality, type Op, type Word } from "./analysis";
import { buildSummary, TJS_VERSION } from "./report";
import { LabStore, canTranscribe, selectionIsLoaded, statusText, transcribeBlockedReason, type Device, type TsMode, type WorkerLike } from "./store";
import { CASES, PASSAGE } from "./test-material";

const TESS_VERSION = "7.0.0";
const MODELS = [
  { id: "onnx-community/whisper-tiny.en_timestamped", label: "Whisper tiny.en (word timestamps)", expectMB: "≈41 MB (q8)" },
  { id: "onnx-community/whisper-base.en_timestamped", label: "Whisper base.en (word timestamps)", expectMB: "≈80 MB (q8)" },
  { id: "onnx-community/whisper-small.en_timestamped", label: "Whisper small.en (word timestamps)", expectMB: "≈252 MB (q8) — large download" },
];

/** "onnx-community/whisper-small.en_timestamped" → "openai/whisper-small.en" */
const baseWeights = (id: string) => `openai/whisper-${id.match(/whisper-([a-z]+\.en)/)?.[1] ?? "?"}`;
type Verdict = "" | "genuine" | "asr-error" | "unsure";

const mb = (b: number) => `${(b / 1e6).toFixed(1)} MB`;
const t = (s: number | null | undefined) => (s == null ? "—" : `${s.toFixed(2)}s`);

/** Tracks the longest gap between timer ticks — a rough measure of whether the page stayed responsive. */
function createStallMeter() {
  let s: { id: number; last: number; max: number } | null = null;
  return {
    start() {
      if (s) clearInterval(s.id);
      const m = { id: 0, last: performance.now(), max: 0 };
      m.id = window.setInterval(() => {
        const now = performance.now();
        m.max = Math.max(m.max, now - m.last - 50);
        m.last = now;
      }, 50);
      s = m;
    },
    stop() {
      if (!s) return 0;
      clearInterval(s.id);
      const max = Math.round(s.max);
      s = null;
      return max;
    },
  };
}

function Lab() {
  const [store] = useState(
    () =>
      new LabStore(
        {
          createWorker: () => new Worker(new URL("./asr.worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike,
          decode: decodeTo16k,
          stall: createStallMeter(),
          clearModelCache: () => caches.delete("transformers-cache"),
        },
        { model: MODELS[0]!.id, device: "wasm" },
      ),
  );
  const st = useSyncExternalStore(store.subscribe, store.getState);
  useEffect(() => () => store.dispose(), [store]);

  const [passage, setPassage] = useState(PASSAGE);
  const [caseId, setCaseId] = useState(CASES[0]!.id);
  const [tsMode, setTsMode] = useState<TsMode>("word");
  const [verdicts, setVerdicts] = useState<Record<number, Verdict>>({});
  const [minPause, setMinPause] = useState(0.3);
  const [synthAvailable, setSynthAvailable] = useState<string[]>([]);
  const player = useRef<HTMLAudioElement>(null);
  const hasGpu = typeof navigator !== "undefined" && "gpu" in navigator;

  const { selection, loaded, busy, audio: file, result, error, progress } = st;
  const model = selection.model;
  const device = selection.device;
  const transcribing = busy?.kind === "transcribing";
  const reason = transcribeBlockedReason(st);

  // A new, replaced or cleared result starts with no verdicts.
  useEffect(() => setVerdicts({}), [result]);

  // Synthetic pipeline-check files exist only if generated locally (lab/synthetic-audio, git-ignored).
  useEffect(() => {
    void Promise.all(CASES.map((c) => fetch(`/synthetic-audio/${c.id}.wav`, { method: "HEAD" }).then((r) => (r.ok && r.headers.get("content-type")?.includes("audio") ? c.id : null), () => null))).then((ids) =>
      setSynthAvailable(ids.filter((x): x is string => !!x)),
    );
  }, []);

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

  // Everything below describes the *result*, using the settings it was produced with — never the live dropdowns.
  const rMode: TsMode = result?.provenance.tsMode ?? "word";
  const words: Word[] = useMemo(
    () => (result?.chunks ?? []).map((c) => ({ text: c.text, start: c.timestamp?.[0] ?? null, end: c.timestamp?.[1] ?? null })),
    [result],
  );
  const ops: Op[] = useMemo(() => (result ? align(passage, rMode === "word" ? words : [{ text: result.text, start: null, end: null }]) : []), [result, passage, words, rMode]);
  const diffs = ops.map((o, i) => ({ o, i })).filter(({ o }) => o.type !== "match");
  const quality = useMemo(() => (rMode === "word" && result ? timestampQuality(words) : null), [words, result, rMode]);
  const pauseInfo = useMemo(() => {
    const samples = store.getSamples();
    return result && samples ? findPauses(samples, 16000, minPause) : null;
  }, [result, minPause, store]);
  const pauses = useMemo(() => (pauseInfo ? placePauses(pauseInfo.pauses, words) : []), [pauseInfo, words]);
  const pace = useMemo(() => (quality?.reliable ? paceWindows(words) : null), [quality, words]);
  const kase = CASES.find((c) => c.id === result?.provenance.caseId) ?? CASES[0]!;
  const counts = {
    sub: diffs.filter(({ o }) => o.type === "sub").length,
    del: diffs.filter(({ o }) => o.type === "del").length,
    ins: diffs.filter(({ o }) => o.type === "ins" && !o.repeatOf).length,
    rep: diffs.filter(({ o }) => o.type === "ins" && o.repeatOf).length,
  };
  const verdictCounts = Object.values(verdicts).reduce<Record<string, number>>((a, v) => (v ? { ...a, [v]: (a[v] ?? 0) + 1 } : a), {});

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
            <select value={model} onChange={(e) => store.select({ model: e.target.value })} disabled={!!busy || st.deleting}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.expectMB}
                </option>
              ))}
            </select>
          </label>
          <label>
            Run on{" "}
            <select value={device} onChange={(e) => store.select({ device: e.target.value as Device })} disabled={!!busy || st.deleting}>
              <option value="wasm">CPU (WASM) — works everywhere WASM does</option>
              <option value="webgpu" disabled={!hasGpu}>
                GPU (WebGPU){hasGpu ? "" : " — not available in this browser"}
              </option>
            </select>
          </label>
        </div>
        <div className="row" style={{ marginTop: ".6rem" }}>
          <button className="primary" onClick={() => store.load()} disabled={!!busy || st.deleting || selectionIsLoaded(st)}>
            Load model
          </button>
          <button onClick={() => store.cancel()} disabled={!busy}>
            Cancel
          </button>
          <button onClick={() => void store.deleteModels()} disabled={!!busy || st.deleting}>
            Delete downloaded models
          </button>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          Loaded now: <strong>{loaded ? `${loaded.selection.model} on ${loaded.selection.device}` : "nothing"}</strong>
          {loaded && !selectionIsLoaded(st) && <span className="warn"> — differs from the selection above. Press Load model before transcribing.</span>}
        </p>
        <p role="status" style={{ marginBottom: ".3rem" }}>
          {statusText(st)}
        </p>
        {busy && st.notice && <p className="muted">{st.notice}</p>}
        {progress && busy?.kind === "loading" && (
          <>
            <progress value={progress.loaded} max={progress.total || undefined} />
            <div className="muted">
              {mb(progress.loaded)} of {progress.total ? mb(progress.total) : "?"}
            </div>
          </>
        )}
        {loaded && (
          <div className="kv" style={{ marginTop: ".5rem" }}>
            <span>Library</span>
            <span>Transformers.js {TJS_VERSION} (Apache-2.0)</span>
            <span>Model</span>
            <span>
              {loaded.selection.model} — weights from {baseWeights(loaded.selection.model)} (Apache-2.0 on Hugging Face)
            </span>
            <span>Precision</span>
            <span>
              {JSON.stringify(loaded.info.dtype)} on {loaded.selection.device}
            </span>
            <span>Load time</span>
            <span>
              {(loaded.info.ms / 1000).toFixed(1)} s ({loaded.info.cached ? "from browser cache" : "downloaded"}), UI max stall {loaded.stallMs} ms
            </span>
            <span>Model files</span>
            <span>{loaded.info.files ? Object.entries(loaded.info.files).map(([f, b]) => `${f.split("/").pop()} ${mb(b)}`).join(", ") : "—"}</span>
            <span>Threads</span>
            <span>
              {String(loaded.info.threads ?? "default")} · cross-origin isolated: {String(loaded.info.crossOriginIsolated)}
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
            <input
              type="file"
              accept="audio/*"
              disabled={transcribing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void store.loadAudio(f, f.name, false);
                e.target.value = ""; // lets the same file be chosen again after Clear
              }}
            />
          </label>
        </div>
        {synthAvailable.length > 0 && (
          <div className="row" style={{ marginTop: ".5rem" }}>
            <span className="muted">Synthetic voice (pipeline check only):</span>
            {synthAvailable.map((id) => (
              <button
                key={id}
                disabled={transcribing}
                onClick={async () => {
                  setCaseId(id);
                  const blob = await (await fetch(`/synthetic-audio/${id}.wav`)).blob();
                  await store.loadAudio(blob, `synthetic-${id}.wav`, true);
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
          <button className="primary" onClick={() => store.transcribe({ tsMode, caseId })} disabled={!canTranscribe(st)}>
            Transcribe
          </button>
          <button onClick={() => store.cancel()} disabled={!transcribing}>
            Cancel
          </button>
          <button onClick={() => store.clearData()}>Clear test data</button>
        </div>
        {reason && <p className="muted">{reason}</p>}
      </section>

      {result && (
        <section>
          <h2>4. Results — {kase.title}</h2>
          <div className="kv">
            <span>Produced by</span>
            <span>
              {result.provenance.model} on {result.provenance.device} · timestamps: {result.provenance.tsMode}
            </span>
            <span>Recording</span>
            <span>
              {result.provenance.fileName} · {result.provenance.seconds.toFixed(1)} s{result.provenance.synthetic ? " · synthetic voice" : ""}
            </span>
            <span>Processing</span>
            <span>
              {(result.ms / 1000).toFixed(1)} s (real-time factor {(result.ms / 1000 / result.provenance.seconds).toFixed(2)}) · UI max stall {result.stallMs} ms
            </span>
          </div>

          <h3>Uncorrected transcript</h3>
          <p>{result.text.trim() || <em>(empty)</em>}</p>

          {rMode === "word" && (
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

          <h3>Pauses estimated from the audio</h3>
          <p className="muted">
            Silence detection finds gaps in sound. It can't tell whether a pause is misplaced — natural pauses between sentences are normal. These estimates haven't been checked against what a listener hears.{" "}
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
            <button
              onClick={() =>
                void navigator.clipboard.writeText(
                  buildSummary({ result, caseTitle: kase.title, counts, verdicts: verdictCounts, quality, minPause, pauses, pace, passageWords: passage.trim().split(/\s+/).filter(Boolean).length }),
                )
              }
            >
              Copy result summary
            </button>
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

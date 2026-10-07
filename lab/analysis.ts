// Pure analysis helpers for the AI feasibility lab. Nothing here infers causes or judges the reader:
// it lines up an independently generated transcript with the expected passage and measures the audio.

export type Word = { text: string; start: number | null; end: number | null };
export type Op =
  | { type: "match"; ref: string; hyp: Word; hi: number }
  | { type: "sub"; ref: string; hyp: Word; hi: number }
  | { type: "del"; ref: string; near: number | null } // in the passage, not in the transcript
  | { type: "ins"; hyp: Word; hi: number; repeatOf?: string | undefined }; // in the transcript, not in the passage

export const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter(Boolean);

/** Comparison key: British/American spelling variants compare equal (neighbours/neighbors, realise/realize). */
const key = (w: string) => w.replace(/our$/, "or").replace(/ours$/, "ors").replace(/is(e|ed|es|ing)$/, "iz$1");

/** Word-level alignment (Levenshtein with backtrace). */
export function align(refText: string, hyp: Word[]): Op[] {
  const ref = normalise(refText).map(key);
  const h = hyp.flatMap((w) => normalise(w.text).map((t) => ({ ...w, text: key(t) })));
  const n = ref.length,
    m = h.length;
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const same = ref[i - 1] === h[j - 1]!.text;
      d[i]![j] = Math.min(d[i - 1]![j - 1]! + (same ? 0 : 1), d[i - 1]![j]! + 1, d[i]![j - 1]! + 1);
    }
  const ops: Op[] = [];
  let i = n,
    j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i]![j] === d[i - 1]![j - 1]! + (ref[i - 1] === h[j - 1]!.text ? 0 : 1)) {
      ops.push({ type: ref[i - 1] === h[j - 1]!.text ? "match" : "sub", ref: ref[i - 1]!, hyp: h[j - 1]!, hi: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || d[i]![j] === d[i]![j - 1]! + 1)) {
      ops.push({ type: "ins", hyp: h[j - 1]!, hi: j - 1 });
      j--;
    } else {
      ops.push({ type: "del", ref: ref[i - 1]!, near: null });
      i--;
    }
  }
  ops.reverse();
  // Joined/split compounds aren't reading differences: "post box" ↔ "postbox".
  for (let k = 0; k < ops.length - 1; k++) {
    const a = ops[k]!,
      b = ops[k + 1]!;
    if (a.type === "sub" && b.type === "del" && a.hyp.text === a.ref + b.ref) {
      ops.splice(k, 2, { type: "match", ref: a.ref + " " + b.ref, hyp: a.hyp, hi: a.hi });
    } else if (a.type === "del" && b.type === "sub" && b.hyp.text === a.ref + b.ref) {
      ops.splice(k, 2, { type: "match", ref: a.ref + " " + b.ref, hyp: b.hyp, hi: b.hi });
    } else if (a.type === "sub" && b.type === "ins" && a.ref === a.hyp.text + b.hyp.text) {
      ops.splice(k, 2, { type: "match", ref: a.ref, hyp: { ...a.hyp, text: a.hyp.text + " " + b.hyp.text, end: b.hyp.end }, hi: a.hi });
    } else if (a.type === "ins" && b.type === "sub" && b.ref === a.hyp.text + b.hyp.text) {
      ops.splice(k, 2, { type: "match", ref: b.ref, hyp: { ...a.hyp, text: a.hyp.text + " " + b.hyp.text, end: b.hyp.end }, hi: a.hi });
    }
  }
  // Label insertions that repeat what was just heard (word or short phrase restart) — a *possible* repetition only.
  const words = h.map((w) => w.text);
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k]!;
    if (op.type !== "ins" || op.repeatOf) continue;
    // The alignment may mark either copy as the extra one, so look both behind and ahead; longest phrase first.
    for (let len = 4; len >= 1; len--) {
      const here = words.slice(op.hi, op.hi + len).join(" ");
      const behind = op.hi - len >= 0 ? words.slice(op.hi - len, op.hi).join(" ") : null;
      const ahead = words.slice(op.hi + len, op.hi + 2 * len).join(" ");
      if (here.split(" ").length === len && (here === behind || here === ahead)) {
        // Label the whole repeated phrase (consecutive extra words).
        for (let q = k, left = len; q < ops.length && left > 0; q++) {
          const o = ops[q]!;
          if (o.type !== "ins") break;
          o.repeatOf = here;
          left--;
        }
        break;
      }
    }
  }
  // Give omissions a nearby time so they can be replayed.
  let lastTime: number | null = null;
  for (const op of ops) {
    if (op.type === "del") op.near = lastTime;
    else if (op.hyp.end != null) lastTime = op.hyp.end;
  }
  return ops;
}

export type Pause = { start: number; end: number; duration: number; after?: string | undefined; before?: string | undefined };

/** Silences inside speech, measured from audio energy (20 ms frames). Leading/trailing silence is excluded. */
export function findPauses(audio: Float32Array, rate: number, minPause = 0.3): { pauses: Pause[]; floorDb: number; thresholdDb: number; speech: boolean } {
  const frame = Math.round(rate * 0.02);
  const db: number[] = [];
  for (let i = 0; i + frame <= audio.length; i += frame) {
    let s = 0;
    for (let k = 0; k < frame; k++) s += audio[i + k]! * audio[i + k]!;
    db.push(10 * Math.log10(s / frame + 1e-12));
  }
  const sorted = [...db].sort((a, b) => a - b);
  const floorDb = sorted[Math.floor(sorted.length * 0.1)] ?? -100;
  const peakDb = sorted[Math.floor(sorted.length * 0.95)] ?? -100;
  const thresholdDb = Math.max(floorDb + 10, -55);
  const speech = peakDb - floorDb > 15; // little dynamic range = probably silence or steady noise
  const voiced = db.map((v) => v > thresholdDb);
  const first = voiced.indexOf(true),
    last = voiced.lastIndexOf(true);
  const pauses: Pause[] = [];
  if (first < 0) return { pauses, floorDb, thresholdDb, speech };
  let runStart = -1;
  for (let f = first; f <= last; f++) {
    if (!voiced[f] && runStart < 0) runStart = f;
    if (voiced[f] && runStart >= 0) {
      const dur = ((f - runStart) * frame) / rate;
      if (dur >= minPause) pauses.push({ start: (runStart * frame) / rate, end: (f * frame) / rate, duration: dur });
      runStart = -1;
    }
  }
  return { pauses, floorDb, thresholdDb, speech };
}

/** Attach the neighbouring transcript words to each pause, when word timestamps exist. */
export function placePauses(pauses: Pause[], words: Word[]): Pause[] {
  const timed = words.filter((w) => w.start != null && w.end != null);
  return pauses.map((p) => {
    const after = [...timed].reverse().find((w) => w.end! <= p.start + 0.15);
    const before = timed.find((w) => w.start! >= p.end - 0.15);
    return { ...p, after: after?.text.trim(), before: before?.text.trim() };
  });
}

export type TimestampQuality = { words: number; missing: number; zeroLength: number; backwards: number; overlong: number; reliable: boolean };

export function timestampQuality(words: Word[]): TimestampQuality {
  let missing = 0,
    zeroLength = 0,
    backwards = 0,
    overlong = 0;
  let prevStart = -Infinity;
  for (const w of words) {
    if (w.start == null || w.end == null) {
      missing++;
      continue;
    }
    if (w.end - w.start <= 0.01) zeroLength++;
    if (w.start < prevStart - 0.01) backwards++;
    if (w.end - w.start > 2.5) overlong++;
    prevStart = w.start;
  }
  const n = words.length || 1;
  const reliable = missing === 0 && (zeroLength + backwards + overlong) / n < 0.1;
  return { words: words.length, missing, zeroLength, backwards, overlong, reliable };
}

export type PaceWindow = { from: number; to: number; words: number; wpm: number; differs: boolean };

/** Words per minute in fixed windows — only from word timestamps, never from an untimed transcript. */
export function paceWindows(words: Word[], windowS = 5): { windows: PaceWindow[]; medianWpm: number } {
  const timed = words.filter((w) => w.start != null);
  if (!timed.length) return { windows: [], medianWpm: 0 };
  const endT = Math.max(...timed.map((w) => w.end ?? w.start!));
  const windows: PaceWindow[] = [];
  for (let t = 0; t < endT; t += windowS) {
    const n = timed.filter((w) => w.start! >= t && w.start! < t + windowS).length;
    const span = Math.min(windowS, endT - t);
    if (span >= 2) windows.push({ from: t, to: t + span, words: n, wpm: Math.round((n / span) * 60), differs: false });
  }
  const speaking = windows.filter((w) => w.words > 0).map((w) => w.wpm).sort((a, b) => a - b);
  const medianWpm = speaking[Math.floor(speaking.length / 2)] ?? 0;
  for (const w of windows) w.differs = medianWpm > 0 && w.words > 0 && Math.abs(w.wpm - medianWpm) / medianWpm > 0.3;
  return { windows, medianWpm };
}

/** Decode any browser-playable audio file to 16 kHz mono (what Whisper expects). */
export async function decodeTo16k(file: Blob): Promise<{ audio: Float32Array; seconds: number }> {
  const buf = await file.arrayBuffer();
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(buf);
  void ctx.close();
  const frames = Math.ceil(decoded.duration * 16000);
  const off = new OfflineAudioContext(1, frames, 16000);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const out = await off.startRendering();
  return { audio: out.getChannelData(0).slice(), seconds: decoded.duration };
}

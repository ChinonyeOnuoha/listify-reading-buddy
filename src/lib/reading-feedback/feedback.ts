// Prepared feedback sentences for adults' AI feedback and the adult lab (no language model). Observations come only from measured
// evidence: the word alignment, pauses measured from the audio, and pace from word timings that pass the quality checks.
// Copy rules (as src/lib/sample-feedback.ts): describe what was noticed, never guess a cause, never compare pronunciation
// or accent, never score, never ask for a reread; the one thing to try is optional and for a NEW passage.
import {
  mergePauses,
  normalise,
  type Op,
  type Pause,
  type TimestampQuality,
  type Word,
} from "./analysis.ts";

/** One moment worth listening back to. `at` and `until` are seconds into the recording. */
export type Moment = {
  kind: "pause" | "skipped" | "repeated";
  at: number;
  until: number;
  text: string;
};
/** Words a minute in one part of the reading (pauses taken out); `changed` marks the part after a clear pace change. */
export type PaceBin = { from: number; to: number; wpm: number; changed: boolean };
/**
 * Notes on one recording. Plain data, so they can be saved on the device with the recording and deleted with it.
 * Only what can be measured fairly reliably is included: pace from word timings that pass the quality checks, pauses
 * of 1.5 s or more inside a sentence, and skipped or repeated stretches of 3 or more words. Single words that differ
 * from the passage are left out, because speech recognition often mishears them.
 */
export type Notes = {
  version: 1;
  /** Seconds, from the first to the last thing heard (for placing moments on the strip). */
  duration: number;
  pace: { summary: string; bins: PaceBin[]; changeAt: number | null };
  moments: Moment[];
  /** Said once, below the moments, when the recording stops before the passage does. */
  endsEarly: string | null;
  tryNext: string | null;
};

type Timed = Word & { confidence?: number };
export type FeedbackInput = {
  passage: string;
  ops: Op[];
  words: Timed[];
  /** Pauses measured from the audio, with neighbouring words placed from the word timings. */
  pauses: Pause[];
  quality: TimestampQuality;
  /** Length of the recording in seconds. */
  seconds?: number;
};

export const MIN_PAUSE_S = 1.5; // a silence shorter than this inside a sentence is not mentioned
export const PACE_CHANGE = 0.25; // sentences after a point differ in pace by more than this from those before
export const LOW_CONFIDENCE = 0.5; // a flagged word heard with less confidence is "couldn't assess", not a difference
export const MIN_RUN = 3; // skipped or repeated stretches shorter than this aren't mentioned
export const BIN_S = 20; // the pace chart shows words a minute every 20 seconds

const TRY: Record<Moment["kind"] | "pace", string> = {
  skipped:
    "On your next passage, you could guide your eyes with a finger or a pen, and see how it feels.",
  repeated:
    "On your next passage, you could guide your eyes with a finger or a pen, and see how it feels.",
  pause:
    "On your next passage, you could lightly mark the phrases before reading it aloud, and see how it feels.",
  pace: "On your next passage, you could take one easy breath before each sentence, and notice how it sounds.",
};

export const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Passage tokens with their punctuation, one per normalised word (the test passage has no hyphenated words). */
const tokens = (passage: string) => passage.split(/\s+/).filter(Boolean);
const bare = (t: string) => t.replace(/^[^\w']+|[^\w']+$/g, "");

/** Titles and names (a capitalised word that doesn't start a sentence). Speech recognisers often mishear names, so
 *  differences on them are not reported. */
export function isName(tok: string[], i: number): boolean {
  const t = bare(tok[i] ?? "");
  if (/^(Mrs|Mr|Ms|Dr|Miss)$/.test(t)) return true;
  return /^[A-Z]/.test(t) && i > 0 && !/[.;!?]["”’]?$/.test(tok[i - 1]!);
}

/** The passage index of each op (insertions point at the next passage word). */
export function refIndexes(ops: Op[]): number[] {
  let i = 0;
  return ops.map((op) => {
    const at = i;
    if (op.type !== "ins") i += op.ref.split(" ").length;
    return at;
  });
}

/** A few passage words around an index, for showing where something happened. */
function around(tok: string[], from: number, to = from, pad = 2) {
  return tok
    .slice(Math.max(0, from - pad), Math.min(tok.length, to + 1 + pad))
    .map(bare)
    .join(" ");
}

/** Sentence (or clause ending in ; ? !) number for each passage word. */
function sentenceOf(tok: string[]): number[] {
  let s = 0;
  return tok.map((t) => {
    const here = s;
    if (/[.;!?]["”’]?$/.test(t)) s++;
    return here;
  });
}

/** Pace by sentence from the timed words matched to the passage; reports one clear change point, or nothing.
 *  Silences measured inside a sentence are left out, so a long pause is reported as a pause, not as slow reading. */
export function paceChange(passage: string, ops: Op[], pauses: Pause[] = []) {
  const tok = tokens(passage);
  const sent = sentenceOf(tok);
  const idx = refIndexes(ops);
  const spans = new Map<number, { first: number; last: number; n: number }>();
  ops.forEach((op, k) => {
    if (op.type !== "match" && op.type !== "sub") return;
    if (op.hyp.start == null || op.hyp.end == null) return;
    const s = sent[idx[k]!]!;
    const sp = spans.get(s) ?? { first: op.hyp.start, last: op.hyp.end, n: 0 };
    sp.first = Math.min(sp.first, op.hyp.start);
    sp.last = Math.max(sp.last, op.hyp.end);
    sp.n += op.ref.split(" ").length;
    spans.set(s, sp);
  });
  const rows = [...spans.entries()]
    .sort((a, b) => a[0] - b[0])
    .filter(([, sp]) => sp.n >= 3 && sp.last > sp.first)
    .map(([s, sp]) => {
      const silent = pauses.reduce(
        (a, p) => a + Math.max(0, Math.min(p.end, sp.last) - Math.max(p.start, sp.first)),
        0,
      );
      return { sentence: s, words: sp.n, seconds: sp.last - sp.first - silent, start: sp.first };
    });
  const rate = (r: typeof rows) =>
    (r.reduce((a, x) => a + x.words, 0) / r.reduce((a, x) => a + x.seconds, 0)) * 60;
  let best: { at: number; before: number; after: number; ratio: number } | null = null;
  for (let k = 2; k <= rows.length - 2; k++) {
    const before = rate(rows.slice(0, k)),
      after = rate(rows.slice(k));
    const ratio = after / before;
    if (
      Math.abs(ratio - 1) > PACE_CHANGE &&
      (!best || Math.abs(ratio - 1) > Math.abs(best.ratio - 1))
    )
      best = { at: k, before, after, ratio };
  }
  if (!best) return { rows, change: null };
  const row = rows[best.at]!;
  const firstWord = sent.indexOf(row.sentence);
  return {
    rows,
    change: {
      sentence: row.sentence,
      words: tok
        .slice(firstWord, firstWord + 4)
        .map(bare)
        .join(" "),
      at: row.start,
      before: Math.round(best.before),
      after: Math.round(best.after),
    },
  };
}

/** Words a minute every BIN_S seconds, from the first word to the last, with measured silences taken out. */
export function paceBins(words: Word[], pauses: Pause[], changeAt: number | null): PaceBin[] {
  const timed = words.filter((w) => w.start != null && w.end != null);
  if (timed.length < 2) return [];
  const first = timed[0]!.start!;
  const last = Math.max(...timed.map((w) => w.end!));
  const edges: number[] = [];
  for (let t = first; t < last; t += BIN_S) edges.push(t);
  // A last part shorter than a quarter of a bin joins the one before it.
  if (edges.length > 1 && last - edges.at(-1)! < BIN_S / 4) edges.pop();
  return edges.map((from, k) => {
    const to = edges[k + 1] ?? last;
    const n = timed.filter(
      (w) => w.start! >= from && w.start! < (k === edges.length - 1 ? Infinity : to),
    ).length;
    const silent = pauses.reduce(
      (a, p) => a + Math.max(0, Math.min(p.end, to) - Math.max(p.start, from)),
      0,
    );
    const speaking = Math.max(1, to - from - silent);
    return {
      from,
      to,
      wpm: Math.round((n / speaking) * 60),
      changed: changeAt != null && from + (to - from) / 2 >= changeAt,
    };
  });
}

const quote = (ws: string[]) =>
  ws.length > 9 ? `${ws.slice(0, 4).join(" ")} … ${ws.slice(-3).join(" ")}` : ws.join(" ");

export function buildFeedback({
  passage,
  ops,
  words,
  pauses,
  quality,
  seconds,
}: FeedbackInput): Notes {
  const tok = tokens(passage);
  const idx = refIndexes(ops);
  const conf = (w: Word) => (w as Timed).confidence ?? 1;
  const timed = words.filter((w) => w.start != null && w.end != null);
  const lastHeard = timed.length ? Math.max(...timed.map((w) => w.end!)) : 0;
  const duration = Math.max(seconds ?? 0, lastHeard, 1);
  const moments: Moment[] = [];
  let endsEarly: string | null = null;
  // When a stretch starts: the end of the last word heard before it.
  const timeBefore = (k: number) => {
    for (let q = k - 1; q >= 0; q--) {
      const o = ops[q]!;
      if (o.type !== "del" && o.hyp.end != null) return o.hyp.end;
    }
    return 0;
  };

  for (let k = 0; k < ops.length; k++) {
    const op = ops[k]!;
    if (op.type === "del") {
      let e = k;
      while (e + 1 < ops.length && ops[e + 1]!.type === "del") e++;
      const from = idx[k]!,
        to = idx[e]!;
      const gone = tok.slice(from, to + 1).map(bare);
      const names = gone.every((_, j) => isName(tok, from + j));
      if (to === tok.length - 1 && gone.length >= MIN_RUN) {
        endsEarly = `The recording ends before “${quote(gone.slice(0, 5))}”, so the rest of the passage wasn't checked.`;
      } else if (gone.length >= MIN_RUN && !names) {
        const at = op.near ?? timeBefore(k);
        const next = ops.slice(e + 1).find((o) => o.type !== "del" && o.hyp.start != null);
        const until = next && next.type !== "del" ? Math.max(at, next.hyp.start!) : at;
        moments.push({
          kind: "skipped",
          at,
          until,
          text: `“${quote(gone)}”. ${gone.length >= 6 ? "A line may have been skipped." : "These words weren't heard."}`,
        });
      }
      k = e;
    } else if (op.type === "ins") {
      let e = k;
      while (e + 1 < ops.length && ops[e + 1]!.type === "ins") e++;
      const run = ops.slice(k, e + 1) as Extract<Op, { type: "ins" }>[];
      const heard = run.map((o) => o.hyp.text);
      if (
        heard.length >= MIN_RUN &&
        run.every((o) => o.repeatOf) &&
        run.every((o) => conf(o.hyp) >= LOW_CONFIDENCE) &&
        run[0]!.hyp.start != null
      )
        moments.push({
          kind: "repeated",
          at: run[0]!.hyp.start,
          until: run.at(-1)!.hyp.end ?? run[0]!.hyp.start,
          text: `“${quote(heard)}” was heard twice in a row.`,
        });
      k = e;
    }
  }

  // Pauses inside a sentence (not after punctuation) of at least MIN_PAUSE_S, placed using the word timings.
  pauses = mergePauses(pauses);
  if (quality.reliable) {
    const hiToRef = new Map<number, number>();
    ops.forEach((op, k) => op.type !== "del" && hiToRef.set(op.hi, idx[k]!));
    for (const p of pauses) {
      if (p.duration < MIN_PAUSE_S) continue;
      // A "silence" with words heard inside it is quiet speech, not a pause.
      if (timed.some((w) => w.start! > p.start + 0.15 && w.start! < p.end - 0.15)) continue;
      // The last word that began before the silence (word end times can run into a pause).
      let hi = -1;
      words.forEach((w, i) => w.start != null && w.start < p.start && (hi = i));
      const ref = hiToRef.get(hi);
      if (hi < 0 || ref == null || /[,.;:!?]["”’]?$/.test(tok[ref] ?? ".")) continue;
      if (!words[hi + 1]) continue;
      const before = tok
        .slice(Math.max(0, ref - 1), ref + 1)
        .map(bare)
        .join(" ");
      const after = bare(tok[ref + 1] ?? words[hi + 1]!.text);
      const secs = Math.round(p.duration);
      moments.push({
        kind: "pause",
        at: p.start,
        until: p.end,
        text: `About ${secs} ${secs === 1 ? "second" : "seconds"} in “${before} … ${after}”.`,
      });
    }
  }
  moments.sort((a, b) => a.at - b.at);

  // Pace only from word timings that pass the quality checks; otherwise say so.
  let pace: Notes["pace"];
  if (quality.reliable && timed.length >= 10) {
    const { change } = paceChange(passage, ops, pauses);
    const bins = paceBins(words, pauses, change?.at ?? null);
    const steady = bins.length
      ? Math.round(
          bins.filter((b) => !b.changed).reduce((a, b) => a + b.wpm, 0) /
            Math.max(1, bins.filter((b) => !b.changed).length) /
            10,
        ) * 10
      : 0;
    pace = {
      bins: bins.length >= 3 ? bins : [],
      changeAt: change?.at ?? null,
      summary: change
        ? `Steady at about ${Math.round(change.before / 10) * 10} words a minute, then ${
            change.after > change.before ? "quicker" : "slower"
          } from about ${clock(change.at)}.`
        : `Steady all the way through, at about ${steady} words a minute.`,
    };
  } else {
    pace = {
      bins: [],
      changeAt: null,
      summary: "Pace couldn't be measured reliably from this recording, so it's left out.",
    };
  }

  const lead = moments[0]?.kind ?? (pace.changeAt != null ? "pace" : null);
  return {
    version: 1,
    duration,
    pace,
    moments,
    endsEarly,
    tryNext: lead ? TRY[lead] : null,
  };
}

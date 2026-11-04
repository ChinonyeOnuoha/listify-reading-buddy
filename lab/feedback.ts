// Prepared feedback sentences for the adult lab experiment (no language model). Observations come only from measured
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

export type Status = "difference" | "review" | "clear" | "unsure";
export type Item = {
  kind: string;
  status: Status;
  words: string;
  at: number | null;
  observation: string;
};
export type Feedback = {
  items: Item[];
  tryNext: string | null;
  notShown: number;
  /** The items left out by the limit, in time order (for reviewing the limit, not for the reader). */
  hidden: Item[];
};

type Timed = Word & { confidence?: number };
export type FeedbackInput = {
  passage: string;
  ops: Op[];
  words: Timed[];
  /** Pauses measured from the audio, with neighbouring words placed from the word timings. */
  pauses: Pause[];
  quality: TimestampQuality;
};

export const MIN_PAUSE_S = 1.5; // a silence shorter than this inside a sentence is not mentioned
export const PACE_CHANGE = 0.25; // sentences after a point differ in pace by more than this from those before
export const LOW_CONFIDENCE = 0.5; // a flagged word heard with less confidence is "couldn't assess", not a difference
const MAX_ITEMS = 4;

const TRY: Record<string, string> = {
  repetition:
    "On your next passage, you could try guiding your eyes with a finger or pen and notice how it feels.",
  omission:
    "On your next passage, you could try a quick silent skim first and see whether you like reading that way.",
  addition:
    "On your next passage, you could try a quick silent skim first and see whether you like reading that way.",
  substitution:
    "On your next passage, you could try a quick silent skim first and see whether you like reading that way.",
  pause:
    "If you're curious, lightly mark phrase groups in your next passage before reading it aloud.",
  pace: "For a new passage, you could take one easy breath before each sentence and notice how it sounds.",
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

export function buildFeedback({ passage, ops, words, pauses, quality }: FeedbackInput): Feedback {
  const tok = tokens(passage);
  const sent = sentenceOf(tok);
  const idx = refIndexes(ops);
  const items: Item[] = [];
  const conf = (w: Word) => (w as Timed).confidence ?? 1;
  // Words as the transcript has them (the alignment compares spelling-neutral keys, which aren't for display).
  const flat = words.flatMap((w) => normalise(w.text));
  const said = (o: { hi: number; hyp: Word }) => flat[o.hi] ?? o.hyp.text;

  for (let k = 0; k < ops.length; k++) {
    const op = ops[k]!;
    if (op.type === "match") continue;
    if (op.type === "ins") {
      // Consecutive extra words form one observation.
      let e = k;
      while (e + 1 < ops.length && ops[e + 1]!.type === "ins") e++;
      const run = ops.slice(k, e + 1) as Extract<Op, { type: "ins" }>[];
      const heard = run.map(said).join(" ");
      const at = run[0]!.hyp.start;
      const ctx = around(tok, idx[k]! - 1, idx[k]!);
      if (run.some((o) => conf(o.hyp) < LOW_CONFIDENCE))
        items.push({
          kind: "unclear",
          status: "unsure",
          words: `“${ctx}”`,
          at,
          observation:
            "Something extra may have been said near here, but it couldn't be heard clearly enough to say what, so it's left open rather than guessed.",
        });
      else if (run.every((o) => o.repeatOf))
        items.push({
          kind: "repetition",
          status: "difference",
          words: `“${ctx}”`,
          at,
          observation: `“${heard}” was heard twice in a row here.`,
        });
      else
        items.push({
          kind: "addition",
          status: "difference",
          words: `“${ctx}”`,
          at,
          observation: `“${heard}” was heard here, but it isn't in the text.`,
        });
      k = e;
    } else if (op.type === "del") {
      // Consecutive missing words form one observation.
      let e = k;
      while (e + 1 < ops.length && ops[e + 1]!.type === "del") e++;
      if (tok.slice(idx[k]!, idx[e]! + 1).every((_, j) => isName(tok, idx[k]! + j))) {
        k = e;
        continue;
      }
      const gone = tok.slice(idx[k]!, idx[e]! + 1).map(bare);
      if (idx[e]! === tok.length - 1 && gone.length > 8)
        // The recording ends before the passage does: say so once, without listing the rest.
        items.push({
          kind: "stopped",
          status: "unsure",
          words: `From “${gone.slice(0, 4).join(" ")} …”`,
          at: op.near,
          observation: `The recording ends here, so the rest of the passage (${gone.length} words) wasn't checked.`,
        });
      else
        items.push({
          kind: "omission",
          status: "difference",
          words:
            gone.length > 8
              ? `“${gone.slice(0, 3).join(" ")} … ${gone.slice(-3).join(" ")}”`
              : `“${around(tok, idx[k]!, idx[e]!)}”`,
          at: op.near,
          observation:
            gone.length > 8
              ? `These ${gone.length} words weren't heard here.`
              : `“${gone.join(" ")}” wasn't heard here.`,
        });
      k = e;
    } else if (isName(tok, idx[k]!)) {
      continue;
    } else {
      const ctx = `Text: “${around(tok, idx[k]!)}” · Heard “${said(op)}” for “${bare(tok[idx[k]!]!)}”`;
      if (conf(op.hyp) < LOW_CONFIDENCE)
        items.push({
          kind: "unclear",
          status: "unsure",
          words: ctx,
          at: op.hyp.start,
          observation: `The word here couldn't be heard clearly enough to say whether it was “${bare(tok[idx[k]!]!)}”, so it's left open rather than guessed.`,
        });
      else
        items.push({
          kind: "substitution",
          status: "difference",
          words: ctx,
          at: op.hyp.start,
          observation:
            "The word heard here was different from the one on the page. Pronunciation and accent aren't compared — only which word was read.",
        });
    }
  }

  // Pauses inside a sentence (not after punctuation) of at least MIN_PAUSE_S, placed using the word timings.
  pauses = mergePauses(pauses);
  if (quality.reliable) {
    const hiToRef = new Map<number, number>();
    ops.forEach((op, k) => op.type !== "del" && hiToRef.set(op.hi, idx[k]!));
    for (const p of pauses) {
      if (p.duration < MIN_PAUSE_S) continue;
      // The last word that began before the silence (word end times can run into a pause).
      let hi = -1;
      words.forEach((w, i) => w.start != null && w.start < p.start && (hi = i));
      const ref = hiToRef.get(hi);
      if (hi < 0 || ref == null || /[,.;:!?]["”’]?$/.test(tok[ref] ?? ".")) continue;
      const next = words[hi + 1];
      if (!next) continue;
      items.push({
        kind: "pause",
        status: "review",
        words: `“${bare(tok[ref]!)} … ${bare(tok[ref + 1] ?? next.text)}”`,
        at: p.start,
        observation: `There was a pause of about ${p.duration.toFixed(1)} seconds inside this phrase. Pauses can be perfectly natural — this is just a moment you might like to listen back to.`,
      });
    }
  }

  // Pace only from word timings that pass the quality checks; otherwise say it couldn't be assessed.
  if (quality.reliable) {
    const { change } = paceChange(passage, ops, pauses);
    if (change && sent.length)
      items.push({
        kind: "pace",
        status: "review",
        words: `From “${change.words} …”`,
        at: change.at,
        observation: `From here the reading was ${change.after > change.before ? "quicker" : "slower"} than before — about ${change.after} words a minute, compared with about ${change.before}. A pace change isn't automatically a problem; it's simply worth a listen.`,
      });
  } else {
    items.push({
      kind: "pace",
      status: "unsure",
      words: "Whole reading",
      at: null,
      observation:
        "Pace couldn't be assessed confidently from this recording, so it's left open rather than guessed.",
    });
  }

  // Keep the most useful few (differences, then moments to review, then open questions), shown in time order.
  const rank: Record<Status, number> = { difference: 0, review: 1, unsure: 2, clear: 3 };
  const ranked = [...items].sort(
    (a, b) => rank[a.status] - rank[b.status] || (a.at ?? Infinity) - (b.at ?? Infinity),
  );
  const byTime = (a: Item, b: Item) => (a.at ?? Infinity) - (b.at ?? Infinity);
  const shown = ranked.slice(0, MAX_ITEMS).sort(byTime);
  const found = shown.filter((i) => i.status === "difference" || i.status === "review");
  if (!found.length) {
    shown.unshift({
      kind: "clear",
      status: "clear",
      words: "Checked: words (not names), repetitions, pauses" + (quality.reliable ? ", pace" : ""),
      at: null,
      observation: "Nice one for making time to read. Nothing stood out in the areas checked.",
    });
  }
  // One small thing to try: from the first difference, else the first moment to review.
  const lead =
    shown.find((i) => i.status === "difference") ?? shown.find((i) => i.status === "review");
  return {
    items: shown,
    tryNext: lead ? (TRY[lead.kind] ?? null) : null,
    notShown: items.length - Math.min(items.length, MAX_ITEMS),
    hidden: ranked.slice(MAX_ITEMS).sort(byTime),
  };
}

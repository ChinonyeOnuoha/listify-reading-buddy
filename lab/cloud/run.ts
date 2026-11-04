// Adult lab experiment: the six test recordings through Deepgram and AssemblyAI, compared with what was actually said.
//
//   node lab/cloud/run.ts            # analyse saved provider results only (no upload, no cost)
//   node lab/cloud/run.ts --upload   # upload any recording that has no saved result yet, then analyse
//
// Keys come from the git-ignored .env.local and stay in this process. Converted audio, raw provider responses and the
// report are written to the git-ignored lab/.cloud-results/. Recordings are read from RECORDINGS_DIR (default ~/Downloads).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  align,
  findPauses,
  mergePauses,
  normalise,
  placePauses,
  timestampQuality,
  type Op,
  type Word,
} from "../analysis.ts";
import { buildFeedback, clock, isName, paceChange, refIndexes } from "../feedback.ts";
import { CASES, PASSAGE } from "../test-material.ts";
import {
  assembly,
  assemblyDelete,
  assemblyUpload,
  deepgram,
  type CloudResult,
  type TimedWord,
} from "./providers.ts";

const ROOT = new URL("../..", import.meta.url).pathname;
const OUT = join(ROOT, "lab/.cloud-results");
const REC = process.env["RECORDINGS_DIR"] ?? join(homedir(), "Downloads");
const UPLOAD = process.argv.includes("--upload");
const TOKENS = PASSAGE.split(/\s+/);

const FILES: Record<string, string> = {
  normal: "Normal reading.m4a",
  repeats: "Repeated words and restarted phrases.m4a",
  changes: "Omitted, added and substituted words.m4a",
  pause: "A deliberate pause in a sentence.m4a",
  pace: "A noticeable change in pace.m4a",
  noise: "Background noise and silence.m4a",
};

/** What was said: the recording script, with corrections confirmed by the reader's listening. Agreement between
 *  providers is never treated as confirmation; words not checked by ear are assumed read as scripted.
 *  Second listening check of 2026-11-04 (docs/ai-feedback-experiment.md), which replaces the first one that day,
 *  and the final check of the same day. These matched the script, so need no correction: changes "light it made";
 *  pace no extra "and" and "to" said once; noise nothing before "Every evening" and nothing after "garden". The silence/noise recording has the first two sentences: the reader confirmed words of
 *  the second at 0:18. */
const AND_NOT_READ: [string, string] = [
  "went out early, and the next day",
  "went out early, the next day",
];
const A_LOW_WALL: [string, string] = ["set it on the low stone wall", "set it on a low stone wall"];
const CONFIRMED: Record<string, [string, string][]> = {
  // 2026-10-08 check (docs/ai-feasibility.md): "and" not read.
  normal: [AND_NOT_READ],
  // A whole-phrase restart, not "said said"; "a" low stone wall.
  repeats: [["Some said said an hour", "Some said an hour, some said an hour"], A_LOW_WALL],
  changes: [AND_NOT_READ],
  // "said", not "swore"; "and" not read.
  pause: [["others swore it burned", "others said it burned"], AND_NOT_READ],
  // "can", not "could".
  pace: [["after dark could find", "after dark can find"]],
  noise: [A_LOW_WALL],
};
const SAID: Record<string, string> = Object.fromEntries(
  CASES.map((c) => {
    let said =
      c.id === "noise"
        ? PASSAGE.split(/(?<=\.)\s/)
            .slice(0, 2)
            .join(" ")
        : c.synthetic.replace(/\[\[[^\]]*\]\]\s*/g, "");
    for (const [from, to] of CONFIRMED[c.id] ?? []) {
      if (!said.includes(from))
        throw new Error(`${c.id}: correction “${from}” not found in the script`);
      said = said.replace(from, to);
    }
    return [c.id, said];
  }),
);

/** List prices for pre-recorded audio, checked on the providers' pricing pages on 2026-11-04. */
const PRICE_PER_MIN: Record<string, number> = {
  "nova-3": 0.0043,
  "universal-3-5-pro": 0.21 / 60,
  "universal-2": 0.15 / 60,
};
const RUNS = [
  { id: "deepgram", label: "Deepgram Nova-3" },
  { id: "aai-u35", label: "AssemblyAI Universal-3.5 Pro" },
  { id: "aai-u2", label: "AssemblyAI Universal-2" },
] as const;

/** The recordings analysed in this run, with what was said in each. */
const SET: { id: string; title: string; file: string; said: string }[] = CASES.map((c) => ({
  id: c.id,
  title: c.title,
  file: FILES[c.id]!,
  said: SAID[c.id]!,
}));

// ── audio ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function toWav(caseId: string, file: string): string {
  const wav = join(OUT, `${caseId}.wav`);
  if (!existsSync(wav))
    execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16@16000", "-c", "1", join(REC, file), wav]);
  return wav;
}
/** 16-bit PCM samples from a WAV file (handles WAVE_FORMAT_EXTENSIBLE headers by walking the chunks). */
function samples(buf: Buffer): { audio: Float32Array; rate: number } {
  let p = 12,
    rate = 16000;
  while (p + 8 <= buf.length) {
    const id = buf.toString("ascii", p, p + 4),
      size = buf.readUInt32LE(p + 4);
    if (id === "fmt ") rate = buf.readUInt32LE(p + 12);
    if (id === "data") {
      const n = Math.floor(Math.min(size, buf.length - p - 8) / 2);
      const audio = new Float32Array(n);
      for (let i = 0; i < n; i++) audio[i] = buf.readInt16LE(p + 8 + i * 2) / 32768;
      return { audio, rate };
    }
    p += 8 + size + (size % 2);
  }
  throw new Error("no data chunk");
}

// ── providers (cached: a recording is uploaded at most once per provider) ───────────────────────────────────────────
async function results(
  caseId: string,
  wavFile: Buffer,
): Promise<Record<string, CloudResult | null>> {
  const out: Record<string, CloudResult | null> = {};
  const path = (run: string) => join(OUT, `${caseId}.${run}.json`);
  const missing = RUNS.filter((r) => !existsSync(path(r.id)));
  const wav = new Uint8Array(wavFile);
  if (missing.length && UPLOAD) {
    const dg = process.env["DEEPGRAM_API_KEY"],
      aaiKey = process.env["ASSEMBLYAI_API_KEY"];
    const save = (run: string, r: CloudResult) =>
      writeFileSync(path(run), JSON.stringify(r, null, 1));
    if (missing.some((r) => r.id === "deepgram")) {
      if (!dg) throw new Error("DEEPGRAM_API_KEY is not set in .env.local");
      save("deepgram", await deepgram(wav, dg));
    }
    const aai = missing.filter((r) => r.id.startsWith("aai"));
    if (aai.length) {
      if (!aaiKey) throw new Error("ASSEMBLYAI_API_KEY is not set in .env.local");
      // One upload for both models; deleting a transcript also deletes the upload, so delete only at the end.
      const url = await assemblyUpload(wav, aaiKey);
      const done: string[] = [];
      try {
        for (const r of aai) {
          const res = await assembly(
            url,
            r.id === "aai-u35" ? "universal-3-5-pro" : "universal-2",
            aaiKey,
          );
          done.push(res.requestId);
          save(r.id, res);
        }
      } finally {
        for (const id of done) await assemblyDelete(id, aaiKey);
      }
    }
  }
  for (const r of RUNS)
    out[r.id] = existsSync(path(r.id))
      ? (JSON.parse(readFileSync(path(r.id), "utf8")) as CloudResult)
      : null;
  return out;
}

// ── comparison ─────────────────────────────────────────────────────────────────────────────────────────────────────
type Diff = {
  type: "sub" | "del" | "ins";
  ref: string;
  heard: string;
  at: number;
  time: number | null;
  repeat: boolean;
};
function diffs(ops: Op[]): Diff[] {
  const idx = refIndexes(ops);
  return ops.flatMap((op, k): Diff[] =>
    op.type === "match"
      ? []
      : op.type === "del"
        ? [{ type: "del", ref: op.ref, heard: "", at: idx[k]!, time: op.near, repeat: false }]
        : op.type === "sub"
          ? [
              {
                type: "sub",
                ref: op.ref,
                heard: op.hyp.text,
                at: idx[k]!,
                time: op.hyp.start,
                repeat: false,
              },
            ]
          : [
              {
                type: "ins",
                ref: "",
                heard: op.hyp.text,
                at: idx[k]!,
                time: op.hyp.start,
                repeat: !!op.repeatOf,
              },
            ],
  );
}
const same = (a: Diff, b: Diff) =>
  a.type === b.type && a.ref === b.ref && a.heard === b.heard && Math.abs(a.at - b.at) <= 3;
const show = (d: Diff) =>
  (d.type === "sub"
    ? `“${d.ref}” → “${d.heard}”`
    : d.type === "del"
      ? `missing “${d.ref}”`
      : `extra “${d.heard}”${d.repeat ? " (repeat)" : ""}`) +
  (d.time != null ? ` at ${d.time.toFixed(1)} s` : "");

/** Flags against the passage, split into real differences (what was said) and system errors. */
function classify(expected: Diff[], found: Diff[]) {
  const left = [...expected];
  const real: Diff[] = [],
    system: Diff[] = [];
  for (const f of found) {
    const i = left.findIndex((e) => same(e, f));
    if (i >= 0) real.push(...left.splice(i, 1).map(() => f));
    else system.push(f);
  }
  return { real, system, missed: left };
}

const words = (r: CloudResult): TimedWord[] => r.words;
const text = (w: Word[]) => w.map((x) => x.text).join(" ");

// ── run ────────────────────────────────────────────────────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
if (existsSync(join(ROOT, ".env.local"))) process.loadEnvFile(join(ROOT, ".env.local"));

const md: string[] = [
  "# Cloud transcription experiment — local report (git-ignored; contains transcripts)",
  "",
];
const table: string[][] = [];
const billed: Record<string, number> = {};

for (const c of SET) {
  if (!existsSync(join(OUT, `${c.id}.wav`)) && !existsSync(join(REC, c.file))) {
    console.log(`Skipped ${c.title}: “${c.file}” not found in ${REC}`);
    md.push(`## ${c.title}`, "", `_Recording “${c.file}” not found._`, "");
    continue;
  }
  const wavPath = toWav(c.id, c.file);
  const wav = readFileSync(wavPath);
  const { audio, rate } = samples(wav);
  const seconds = audio.length / rate;
  const said = c.said;
  const expected = diffs(
    align(
      PASSAGE,
      normalise(said).map((t) => ({ text: t, start: null, end: null })),
    ),
  );
  const measured = { pauses: mergePauses(findPauses(audio, rate, 1.0).pauses) };
  const short = mergePauses(findPauses(audio, rate, 0.3).pauses);
  const res = await results(c.id, wav);

  md.push(
    `## ${c.title} (${seconds.toFixed(1)} s)`,
    "",
    `**Said (the script, plus corrections confirmed by listening; the rest is provisional):** ${said}`,
    "",
  );
  md.push(
    `**Expected differences from the passage:** ${expected.map(show).join("; ") || "none"}`,
    "",
  );
  md.push(
    `**Silences ≥ 1 s measured from the audio:** ${measured.pauses.map((p) => `${p.duration.toFixed(1)} s at ${p.start.toFixed(1)}–${p.end.toFixed(1)} s`).join("; ") || "none"}`,
    "",
  );

  for (const run of RUNS) {
    const r = res[run.id];
    if (!r) {
      md.push(`### ${run.label}`, "", "_No result yet (run with --upload)._", "");
      continue;
    }
    billed[r.model] = (billed[r.model] ?? 0) + r.billedSeconds;
    const w = words(r);
    const vsSaid = diffs(align(said, w));
    const ops = align(PASSAGE, w);
    const cls = classify(expected, diffs(ops));
    const quality = timestampQuality(w);
    const placed = placePauses(measured.pauses, w);
    const pace = quality.reliable ? paceChange(PASSAGE, ops, short) : null;
    const fb = buildFeedback({
      passage: PASSAGE,
      ops,
      words: w,
      pauses: placePauses(short, w),
      quality,
    });

    md.push(`### ${run.label} — model reported: ${r.model}`, "");
    md.push(`Transcript (uncorrected): ${text(w)}`, "");
    md.push(
      `Recognition errors vs what was said (${vsSaid.length} in ${normalise(said).length} words): ${vsSaid.map(show).join("; ") || "none"}`,
      "",
    );
    md.push(
      `Flags vs passage: ${cls.real.length} real · ${cls.system.length} system errors${cls.system.length ? ` (${cls.system.map(show).join("; ")})` : ""} · missed: ${cls.missed.map(show).join("; ") || "none"}`,
      "",
    );
    md.push(
      `Timestamps: ${JSON.stringify(quality)} · lowest word confidence ${Math.min(...w.map((x) => x.confidence)).toFixed(2)} · ${(r.ms / 1000).toFixed(1)} s to transcribe`,
      "",
    );
    md.push(
      `Silences placed with these word timings: ${placed.map((p) => `${p.duration.toFixed(1)} s at ${clock(p.start)} (${p.start.toFixed(1)} s) after “${p.after ?? "?"}”, before “${p.before ?? "?"}”`).join("; ") || "none"}`,
      "",
    );
    if (c.id === "pause") {
      const k = ops.findIndex(
        (o, i) =>
          o.type === "match" &&
          o.ref === "of" &&
          ops[i + 1]?.type === "match" &&
          (ops[i + 1] as { ref: string }).ref === "light",
      );
      const of = k >= 0 ? (ops[k] as { hyp: Word }).hyp : null;
      const light = k >= 0 ? (ops[k + 1] as { hyp: Word }).hyp : null;
      md.push(
        `Gap “of” → “light” in the word timings: ${of && light ? `${of.end!.toFixed(2)}–${light.start!.toFixed(2)} s (${(light.start! - of.end!).toFixed(2)} s)` : "words not both found"}`,
        "",
      );
    }
    md.push(
      `Pace by sentence: ${pace ? pace.rows.map((x) => `${x.sentence + 1}: ${Math.round((x.words / x.seconds) * 60)}`).join(", ") + ` wpm · change: ${pace.change ? `from “${pace.change.words}” ${pace.change.before}→${pace.change.after} wpm` : "none"}` : "not assessed (timestamps unreliable)"}`,
      "",
    );
    md.push("Prepared feedback:", "");
    for (const i of fb.items)
      md.push(
        `- [${i.status}] ${i.words}${i.at != null ? ` (${clock(i.at)})` : ""} — ${i.observation}`,
      );
    md.push(
      `- Try next: ${fb.tryNext ?? "—"}${fb.notShown ? ` (${fb.notShown} more not shown)` : ""}`,
      "",
    );
    if (fb.hidden.length) {
      md.push("Not shown (over the four-item limit):", "");
      for (const i of fb.hidden)
        md.push(
          `- [${i.status}] ${i.words}${i.at != null ? ` (${clock(i.at)})` : ""} — ${i.observation}`,
        );
      md.push("");
    }

    table.push([
      c.id,
      run.id,
      String(vsSaid.length),
      String(vsSaid.filter((d) => d.type === "ins" || !isName(said.split(/\s+/), d.at)).length),
      String(normalise(said).length),
      String(cls.real.length),
      String(cls.system.length),
      String(cls.system.filter((d) => d.type === "ins" || !isName(TOKENS, d.at)).length),
      String(cls.missed.length),
      pace?.change ? `${pace.change.sentence + 1}` : pace ? "none" : "n/a",
    ]);
  }
}

md.push(
  "## Summary",
  "",
  "| case | run | recognition errors vs said (all words) | of which not names | words said | real flags | system-error flags | of which not names | missed | pace change at sentence |",
  "|---|---|---|---|---|---|---|---|---|---|",
);
for (const row of table) md.push(`| ${row.join(" | ")} |`);
md.push("", "## Billed audio (list price)", "");
let total = 0;
for (const [model, s] of Object.entries(billed)) {
  const cost = (s / 60) * (PRICE_PER_MIN[model] ?? NaN);
  total += cost;
  md.push(`- ${model}: ${s.toFixed(1)} s = ${(s / 60).toFixed(2)} min → $${cost.toFixed(4)}`);
}
md.push(`- Total: $${total.toFixed(4)}`);
const REPORT = "report.md";
writeFileSync(join(OUT, REPORT), md.join("\n"));
console.log(
  `Report written to lab/.cloud-results/${REPORT} (${table.length} provider runs analysed; total list-price cost $${total.toFixed(4)})`,
);

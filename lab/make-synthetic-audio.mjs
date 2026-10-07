// Generates SYNTHETIC test audio with the macOS `say` voice into lab/synthetic-audio/ (git-ignored).
// Pipeline checks only — this is not evidence about real voices, accents or reading.
// Usage (macOS): node lab/make-synthetic-audio.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { CASES, PASSAGE } from "./test-material.ts";

const out = new URL("./synthetic-audio/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const voice = process.env.VOICE ?? "Samantha";
const say = (text, file) => execFileSync("say", ["-v", voice, "-o", file, "--data-format=LEI16@16000", text]);

for (const c of CASES.filter((c) => c.id !== "noise")) {
  say(c.synthetic, `${out}${c.id}.wav`);
  console.log("wrote", c.id);
}

// Noise case: 5 s silence + 6 s low noise, then the first sentence read over continuing noise.
const firstSentence = PASSAGE.split(". ")[0] + ".";
say(firstSentence, `${out}_speech.wav`);
const speech = readFileSync(`${out}_speech.wav`);
const dataAt = speech.indexOf("data") + 8;
const pcm = new Int16Array(speech.buffer.slice(speech.byteOffset + dataAt, speech.byteOffset + speech.length - ((speech.length - dataAt) % 2)));
const rate = 16000;
const total = rate * 11 + pcm.length;
const mix = new Int16Array(total);
let seed = 7;
const noise = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5) * 2;
for (let i = rate * 5; i < total; i++) {
  const n = noise() * 900; // low broadband noise
  const s = i >= rate * 11 ? pcm[i - rate * 11] : 0;
  mix[i] = Math.max(-32768, Math.min(32767, Math.round(n + s)));
}
const header = Buffer.alloc(44);
header.write("RIFF", 0); header.writeUInt32LE(36 + total * 2, 4); header.write("WAVE", 8); header.write("fmt ", 12);
header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24);
header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(total * 2, 40);
writeFileSync(`${out}noise.wav`, Buffer.concat([header, Buffer.from(mix.buffer)]));
console.log("wrote noise");

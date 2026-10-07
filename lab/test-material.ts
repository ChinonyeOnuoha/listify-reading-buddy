// Original test passage (written for this project) and the recording script. Kept in sync with RECORDING_SCRIPT.md.

export const PASSAGE = `Every evening, Mrs Okafor carried a small brass lantern to the end of Willow Lane. She set it on the low stone wall beside the post box, so that anyone walking home after dark could find the gate to the community garden. Children liked to guess how long the flame would last. Some said an hour; others swore it burned until morning. Nobody ever checked. What mattered was the warm circle of light it made on the path, and the way strangers slowed down to say good night as they passed. One windy night the lantern went out early, and the next day three neighbours arrived with new wicks, a bottle of oil and a box of matches.`;

export type TestCase = {
  id: string;
  title: string;
  /** What to do while recording (shown to the reader). */
  instructions: string[];
  /** What a correct analysis should notice — for checking results, not shown to the model. */
  expect: string[];
  /** Text for the macOS `say` voice, used only to check the processing pipeline. */
  synthetic: string;
};

const P = PASSAGE;
export const CASES: TestCase[] = [
  {
    id: "normal",
    title: "1. Normal reading",
    instructions: ["Read the whole passage as written, at your usual pace."],
    expect: ["Few or no differences. Any differences here are most likely recognition errors — check by listening."],
    synthetic: P,
  },
  {
    id: "repeats",
    title: "2. Repeated words and restarted phrases",
    instructions: [
      "Read the passage, but:",
      "• restart a phrase: “carried a small brass… a small brass lantern”",
      "• repeat a word: “Some said said an hour”",
      "• restart a sentence: “Nobody ever… Nobody ever checked.”",
    ],
    expect: ["“a small brass” twice", "“said” twice", "“Nobody ever” twice"],
    synthetic: P.replace("carried a small brass lantern", "carried a small brass, a small brass lantern")
      .replace("Some said an hour", "Some said said an hour")
      .replace("Nobody ever checked.", "Nobody ever. Nobody ever checked."),
  },
  {
    id: "changes",
    title: "3. Omitted, added and substituted words",
    instructions: [
      "Read the passage, but:",
      "• leave out “low”: “on the stone wall”",
      "• add “very”: “the very warm circle of light”",
      "• say “village” instead of “community”",
      "• say “two neighbours” instead of “three neighbours”",
    ],
    expect: ["“low” omitted", "“very” added", "“community” → “village”", "“three” → “two”"],
    synthetic: P.replace("low stone wall", "stone wall")
      .replace("the warm circle", "the very warm circle")
      .replace("community garden", "village garden")
      .replace("three neighbours", "two neighbours"),
  },
  {
    id: "pause",
    title: "4. A deliberate pause within a sentence",
    instructions: ["Read the passage, but pause for about 2 seconds inside “the warm circle of … light” (count “one-thousand, two-thousand” silently)."],
    expect: ["A ~2 s pause between “of” and “light”. Other natural pauses (between sentences) will also show — a pause is not automatically a problem."],
    synthetic: P.replace("the warm circle of light", "the warm circle of [[slnc 2000]] light"),
  },
  {
    id: "pace",
    title: "5. A noticeable change in pace",
    instructions: ["Read the first three sentences slowly. From “Some said an hour” to the end, read noticeably faster."],
    expect: ["Faster words-per-minute after “Some said an hour” — only if word timestamps look reliable."],
    synthetic: "[[rate 130]] " + P.replace("Some said an hour", "[[rate 260]] Some said an hour"),
  },
  {
    id: "noise",
    title: "6. Silence or background noise",
    instructions: [
      "Record about 5 seconds of silence, then about 10 seconds of everyday background noise (a fan, running tap or quiet music) without speaking.",
      "Then, with the noise still going, read only the first sentence.",
    ],
    expect: ["No words during the silence/noise-only part. Watch for invented words (hallucinations) there."],
    synthetic: "(generated separately: 5 s silence + 6 s low noise + first sentence)",
  },
];

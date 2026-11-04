// A second, fresh test passage (written for this project) and a three-recording script, used to check the analysis on
// text it was never adjusted for. Kept in sync with FRESH_RECORDING_SCRIPT.md. The expectations were written before any
// recording was made; the analysis code is not to be changed to fit these results (see docs/ai-feedback-experiment.md).

export const FRESH_PASSAGE = `The ferry to Gull Island was meant to leave at seven, but most mornings it was late. Passengers waited on the wooden pier with flasks of tea, watching the gulls argue over crusts. A man in a yellow coat sold newspapers from a cart, and he always seemed to know which boat would arrive first. He never explained how. When the engine finally coughed into life, a small cheer went up from the queue. The crossing took twenty minutes on a calm day and almost an hour when the wind turned. Children pressed their faces to the cold windows, counting the buoys that bobbed past like red apples.`;

export type FreshCase = {
  id: string;
  title: string;
  /** The recording's file name in RECORDINGS_DIR. */
  file: string;
  /** What to do while recording (shown to the reader). */
  instructions: string[];
  /** What a correct analysis should report, written before recording. */
  expect: string[];
  /** The script as it should be read; corrected only by the reader's own listening. */
  said: string;
};

const P = FRESH_PASSAGE;
export const FRESH_CASES: FreshCase[] = [
  {
    id: "fresh-natural",
    title: "F1. Natural reading",
    file: "Fresh 1 natural reading.m4a",
    instructions: ["Read the whole passage as written, at your usual pace."],
    expect: [
      "No differences, pauses or pace changes, unless listening shows something was read differently.",
    ],
    said: P,
  },
  {
    id: "fresh-repeat-omit",
    title: "F2. One repeated word and one omission",
    file: "Fresh 2 repeat and omission.m4a",
    instructions: [
      "Read the passage, but:",
      "• say “sold” twice: “A man in a yellow coat sold sold newspapers”",
      "• leave out “cold”: “pressed their faces to the windows”",
    ],
    expect: [
      "“sold” reported once as heard twice in a row",
      "“cold” reported as not heard",
      "nothing else",
    ],
    said: P.replace("coat sold newspapers", "coat sold sold newspapers").replace(
      "to the cold windows",
      "to the windows",
    ),
  },
  {
    id: "fresh-pause-pace",
    title: "F3. A pause and a pace change",
    file: "Fresh 3 pause and pace.m4a",
    instructions: [
      "Read the first five sentences slowly, and pause for about 2 seconds inside “a small cheer … went up”.",
      "From “The crossing took” to the end, read noticeably faster.",
    ],
    expect: [
      "one pause of about 2 s between “cheer” and “went”",
      "a quicker pace from “The crossing took”",
      "no word differences",
    ],
    said: P,
  },
];

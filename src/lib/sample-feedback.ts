// SAMPLE data only. None of this is generated from the user's recording.
// Copy rules: describe what was noticed, never guess a cause, never treat accents as errors,
// never promise improvement and never ask the reader to reread. Experiments are optional and for a NEW passage.
export const SAMPLE_PASSAGE =
  "A library card means more than borrowing books. It means a quiet corner on a busy afternoon, a librarian who remembers your name, and a stack of stories waiting to be opened.";

export type SampleKind = "repetition" | "word-change" | "pause" | "pacing" | "no-findings" | "uncertain";

/**
 * How an observation should be framed. Pauses and pace changes are "review" moments, not mistakes;
 * "clear" (nothing found) and "unsure" (couldn't assess) must never look alike.
 */
export type SampleStatus = "difference" | "review" | "clear" | "unsure";

export const STATUS_LABEL: Record<SampleStatus, string> = {
  difference: "Difference from the text",
  review: "Moment to review — not a mistake",
  clear: "Nothing found in the areas checked",
  unsure: "Couldn't assess confidently",
};

export type SampleExample = {
  kind: SampleKind;
  status: SampleStatus;
  label: string;
  /** Words from the sample passage this relates to */
  words?: string;
  location?: string;
  observation: string;
  /** Optional experiment for a NEW passage — never a reread */
  experiment?: string;
};

export const SAMPLE_EXAMPLES: SampleExample[] = [
  {
    kind: "repetition",
    status: "difference",
    label: "Repetitions",
    words: "“card means means more”",
    observation: "A word was said twice in a row.",
    experiment: "follow the line with a finger or pen.",
  },
  {
    kind: "word-change",
    status: "difference",
    label: "Changed words",
    words: "Text: “a quiet corner” · Heard: “the quiet corner”",
    observation: "One word came out differently from the text.",
    experiment: "skim the passage silently once before reading aloud.",
  },
  {
    kind: "pause",
    status: "review",
    label: "Pauses",
    words: "“a librarian … who remembers”",
    observation: "There was a longer pause in the middle of a phrase.",
    experiment: "lightly mark phrase groups before you start.",
  },
  {
    kind: "pacing",
    status: "review",
    label: "Pace",
    words: "“and a stack of stories waiting to be opened”",
    observation: "The pace picked up towards the end of a sentence.",
    experiment: "take one easy breath before the last sentence.",
  },
  {
    kind: "no-findings",
    status: "clear",
    label: "All clear",
    observation: "Nothing stood out in the words, repetitions, pauses or pace.",
  },
  {
    kind: "uncertain",
    status: "unsure",
    label: "Not sure",
    words: "“and a stack of stories waiting to be opened”",
    observation: "Buddy couldn’t hear this part clearly, so it says nothing about it.",
  },
];

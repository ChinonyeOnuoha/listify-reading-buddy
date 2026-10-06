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
  extraTips?: string[];
};

export const SAMPLE_EXAMPLES: SampleExample[] = [
  {
    kind: "repetition",
    status: "difference",
    label: "Repetitions",
    words: "“card means means more”",
    location: "Sentence 1",
    observation: "“means” was heard twice in a row here.",
    experiment:
      "If you'd like, try guiding your eyes with a finger or pen 👆 on your next passage and notice how it feels.",
    extraTips: ["Some readers like to glance a line ahead with their eyes. Entirely optional."],
  },
  {
    kind: "word-change",
    status: "difference",
    label: "Missing, added or replaced words",
    words: "Text: “a quiet corner” · Heard: “the quiet corner”",
    location: "Sentence 2",
    observation:
      "The word heard here was different from the one on the page. Pronunciation and accent aren't compared — only which word was read.",
    experiment: "On a new passage, you could try a quick silent skim first 👀 and see whether you like reading that way.",
  },
  {
    kind: "pause",
    status: "review",
    label: "Pauses",
    words: "“a librarian … who remembers”",
    location: "Sentence 2",
    observation:
      "There was a pause of about 2 seconds inside this phrase. Pauses can be perfectly natural — this is just a moment you might like to listen back to.",
    experiment: "If you're curious, lightly mark phrase groups ✏️ in your next passage before reading it aloud.",
  },
  {
    kind: "pacing",
    status: "review",
    label: "Pacing changes",
    words: "“and a stack of stories waiting to be opened”",
    location: "Final phrase",
    observation:
      "This phrase was read noticeably faster than the rest. A pace change isn't automatically a problem — it's simply worth a listen.",
    experiment: "For a new passage, you could take one easy breath 🌬️ before the final sentence and notice how it sounds.",
    extraTips: ["Recording a minute at a time can make pace easier to hear. Optional."],
  },
  {
    kind: "no-findings",
    status: "clear",
    label: "No findings",
    location: "Checked: words, repetitions, pauses, pace",
    observation: "Nice one for making time to read 🙌🏾 Nothing stood out in the areas checked.",
  },
  {
    kind: "uncertain",
    status: "unsure",
    label: "Uncertainty",
    words: "“and a stack of stories waiting to be opened”",
    location: "Final sentence",
    observation:
      "Thanks for putting in the practice 💛 The pacing in the last sentence couldn't be assessed confidently, so it's left open rather than guessed.",
  },
];

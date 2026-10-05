// SAMPLE data only. None of this is generated from the user's recording.
export const SAMPLE_PASSAGE =
  "A library card means more than borrowing books. It means a quiet corner on a busy afternoon, a librarian who remembers your name, and a stack of stories waiting to be opened.";

export type SampleKind =
  | "repetition"
  | "word-change"
  | "pause"
  | "pacing"
  | "no-findings"
  | "uncertain";

export type SampleExample = {
  kind: SampleKind;
  label: string;
  emoji: string;
  /** Words from the sample passage this relates to */
  words?: string;
  location?: string;
  observation: string;
  /** One priority experiment for a NEW passage */
  experiment?: string;
  extraTips?: string[];
};

export const SAMPLE_EXAMPLES: SampleExample[] = [
  {
    kind: "repetition",
    label: "Extra repetitions",
    emoji: "🔁",
    words: "“card means means more”",
    location: "Sentence 1",
    observation: "“means” came through twice here.",
    experiment:
      "For your next passage, try guiding your eyes with a finger or pen 👆 Then check whether immediate repetitions happen less often.",
    extraTips: ["Reading a line slightly ahead with your eyes can also be worth a try."],
  },
  {
    kind: "word-change",
    label: "Missing, added or replaced words",
    emoji: "🔤",
    words: "Passage: “a quiet corner” · Heard: “the quiet corner”",
    location: "Sentence 2",
    observation: "“a” sounded like “the” in this phrase.",
    experiment:
      "On a new passage, try a quick silent skim first 👀 Then notice whether small words like “a” and “the” feel easier to keep.",
  },
  {
    kind: "pause",
    label: "Pauses that may interrupt phrasing",
    emoji: "⏸️",
    words: "“a librarian … who remembers”",
    location: "Sentence 2",
    observation:
      "There was a pause of about 2 seconds inside this phrase. Pauses can be perfectly fine — this is just a moment you might like to listen back to.",
    experiment:
      "If you're curious, lightly mark phrase groups in your next passage ✏️ and listen to how the pauses land.",
  },
  {
    kind: "pacing",
    label: "Noticeable pace changes",
    emoji: "🎚️",
    words: "“and a stack of stories waiting to be opened”",
    location: "Final phrase",
    observation:
      "This phrase moved noticeably faster than the rest. Worth a listen — a pace change isn't automatically a problem.",
    experiment:
      "For your next passage, you could try one easy breath before the final sentence 🌬️ and compare when you listen back.",
    extraTips: ["Recording a minute at a time and listening between can make pace easier to hear."],
  },
  {
    kind: "no-findings",
    label: "Nothing found",
    emoji: "🙌🏾",
    observation: "Nice one for making time to read 🙌🏾 I didn't find issues in the areas checked.",
  },
  {
    kind: "uncertain",
    label: "Couldn't assess",
    emoji: "💛",
    words: "“and a stack of stories waiting to be opened”",
    location: "Final sentence",
    observation:
      "Thanks for putting in the practice 💛 I couldn't confidently assess the pacing in the last sentence, so I'll leave that open.",
  },
];

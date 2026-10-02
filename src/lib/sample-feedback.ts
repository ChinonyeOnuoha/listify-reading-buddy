// SAMPLE data only. None of this is generated from the user's recording.
export const SAMPLE_PASSAGE =
  "A library card means more than borrowing books. It means a quiet corner on a busy afternoon, a librarian who remembers your name, and a stack of stories waiting to be opened.";

export type FeedbackKind = "repetition" | "word-change" | "pause" | "pacing";

export type FeedbackCard = {
  kind: FeedbackKind;
  label: string;
  emoji: string;
  location: string;
  observation: string;
  experiment: string;
};

export const SAMPLE_CARDS: FeedbackCard[] = [
  {
    kind: "repetition",
    label: "Repeated words",
    emoji: "🔁",
    location: "Sentence 1 · “card means more”",
    observation: "“means” came through twice here.",
    experiment:
      "For your next passage, try guiding your eyes with a finger or pen 👆 Then check whether immediate repetitions happen less often.",
  },
  {
    kind: "word-change",
    label: "Added, left out or swapped words",
    emoji: "🔤",
    location: "Sentence 2 · “a quiet corner”",
    observation: "The passage says “a quiet corner”. The recording sounded like “the quiet corner”.",
    experiment:
      "On a new passage, try a quick silent skim first 👀 Then notice whether small words like “a” and “the” feel easier to keep.",
  },
  {
    kind: "pause",
    label: "Pauses inside a phrase",
    emoji: "⏸️",
    location: "Sentence 2 · “a librarian … who remembers”",
    observation: "There was a pause of about 2 seconds between “librarian” and “who remembers”.",
    experiment:
      "Pauses can be perfectly fine. If you'd like to explore, lightly mark phrase groups in your next passage ✏️ and see how the pauses land.",
  },
  {
    kind: "pacing",
    label: "Changes in pacing",
    emoji: "🎚️",
    location: "End of passage · “a stack of stories…”",
    observation: "The last phrase moved noticeably faster than the rest of the reading.",
    experiment:
      "For your next passage, you could try taking one easy breath before the final sentence 🌬️ and listen back to compare.",
  },
];

export const SAMPLE_NO_FINDINGS =
  "Nice one for making time to read 🙌🏾 I didn't find issues in the areas checked.";

export const SAMPLE_UNCERTAIN =
  "Thanks for putting in the practice 💛 I couldn't confidently assess the pacing in the last sentence, so I'll leave that open.";

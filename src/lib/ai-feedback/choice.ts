// The adult's choice about AI feedback, remembered on this device so it applies to their future recordings until they
// change it. Only the choice is stored (never audio, words or passage text). Storage can be unavailable (private
// windows, blocked site data): then nothing is remembered and the choice is simply asked again next time.

export type Training = "may-be-used" | "excluded";
/** "ai": send a recording for AI feedback when asked; "device": keep recordings on this device only. */
export type Choice = "ai" | "device";

const KEY = "reading-buddy:ai-feedback-choice";
/** Bump when the consent wording changes in a way that needs asking again. */
export const CONSENT_VERSION = 2;

type Saved = { choice: Choice; training: Training; version: number };

/** The saved choice, if it was made under the same terms (a change in how recordings are treated asks again). */
export function loadChoice(training: Training): Choice | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Saved | null;
    if (!saved || saved.version !== CONSENT_VERSION) return null;
    if (saved.choice === "device") return "device";
    return saved.choice === "ai" && saved.training === training ? "ai" : null;
  } catch {
    return null;
  }
}

export function saveChoice(choice: Choice, training: Training) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ choice, training, version: CONSENT_VERSION } satisfies Saved),
    );
  } catch {
    // Not remembered; the choice still applies for this visit.
  }
}

export function forgetChoice() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to forget.
  }
}

import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";

const PRESETS = [5, 10, 15] as const;
const MAX = 180;

/** Whole minutes from 1 to MAX, or null. */
function parseMinutes(v: string) {
  const n = Number(v);
  return v.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= MAX ? n : null;
}

type Props = {
  target: number | null;
  /** Called only with a confirmed, valid target. */
  onSet: (minutes: number) => void;
};

export function TargetCard({ target, onSet }: Props) {
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  // Compact row once set: a directly editable field (no separate Edit button).
  const [rowDraft, setRowDraft] = useState(target ? String(target) : "");
  useEffect(() => setRowDraft(target ? String(target) : ""), [target]);

  if (target !== null) {
    return (
      // Once set, the target is a quiet editable row — no card of its own.
      <section className="reveal" aria-label="Today's reading target">
        <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2 sm:justify-center">
          <label htmlFor="target-minutes" className="font-medium">
            Today's target
          </label>
          <span className="flex items-center gap-2">
            <input
              id="target-minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX}
              value={rowDraft}
              onChange={(e) => {
                setRowDraft(e.target.value);
                // Update straight away when the number is valid; content below is untouched.
                const n = parseMinutes(e.target.value);
                if (n) onSet(n);
              }}
              onBlur={() => setRowDraft(String(target))}
              aria-describedby="target-minutes-hint"
              className="field w-20 py-2 text-center text-lg font-medium"
            />
            <span className="text-muted-foreground">minutes</span>
          </span>
        </div>
        <p id="target-minutes-hint" className="sr-only">
          Whole minutes from 1 to {MAX}. Changing the target keeps your passage.
        </p>
      </section>
    );
  }

  const submitCustom = (e: FormEvent) => {
    e.preventDefault();
    const n = parseMinutes(draft);
    if (!n) return setError(`Enter a whole number of minutes from 1 to ${MAX}.`);
    setError("");
    onSet(n);
  };

  const choice = (label: string, pressed: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="tile relative min-h-14 items-center justify-center px-3 py-3 text-center font-medium"
    >
      {label}
      {pressed && (
        <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" strokeWidth={3} aria-hidden />
        </span>
      )}
    </button>
  );

  return (
    <section className="card" aria-labelledby="target-h">
      <h2 id="target-h" className="text-xl font-medium">Today's reading target</h2>
      <p className="mt-1 text-muted-foreground">How much time would you like to read today?</p>

      <div role="group" aria-labelledby="target-h" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {PRESETS.map((m) => choice(`${m} min`, false, () => onSet(m)))}
        {choice("Custom", custom, () => setCustom(true))}
      </div>

      {custom && (
        <form onSubmit={submitCustom} className="reveal mt-6" noValidate>
          <label htmlFor="custom-minutes" className="font-medium">
            Minutes
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              id="custom-minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX}
              value={draft}
              autoFocus
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError("");
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "custom-error" : undefined}
              className="field w-28"
            />
            <button type="submit" className="btn-secondary">
              Set target
            </button>
          </div>
          {error && (
            <p id="custom-error" role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}

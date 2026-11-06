import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight, Minus, Play, Plus } from "lucide-react";
import { CompanionPerchless } from "./Buddy";
import { ScreenTitle, StepHead } from "./ui";
import { COLOURS } from "@/lib/nook-memory";

/* ---- Home --------------------------------------------------------------------------------------------------------------- */

export function HomePanel({
  welcomeBack,
  adultSub,
  kidSub,
  onAdult,
  onKid,
  onSample,
  footer,
}: {
  welcomeBack: boolean;
  adultSub: string;
  kidSub: string;
  onAdult: () => void;
  onKid: () => void;
  onSample: () => void;
  footer: ReactNode;
}) {
  const choice = (title: string, sub: string, onClick: () => void) => (
    <button type="button" className="choice" onClick={onClick}>
      <span className="min-w-0">
        <span className="block text-[1.0625rem] font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{sub}</span>
      </span>
      <ChevronRight className="ml-auto size-5 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
  return (
    <>
      <div className="panel-body">
        <div className="flex items-end justify-between gap-4">
          <ScreenTitle kid>{welcomeBack ? "Welcome back" : "Who’s reading today?"}</ScreenTitle>
          <CompanionPerchless pose="wave" className="w-12 shrink-0" />
        </div>
        <p className="lead">
          {welcomeBack
            ? "Your nook is just as you left it."
            : "Make time to read aloud, record yourself and listen back."}
        </p>
        <div className="flex flex-col gap-2">
          {choice("Practise reading aloud", adultSub, onAdult)}
          {choice("Children’s corner", kidSub, onKid)}
          {choice("Try a sample", "See how it works. No microphone needed.", onSample)}
        </div>
      </div>
      <div className="panel-foot">{footer}</div>
    </>
  );
}

/* ---- Reading time ---------------------------------------------------------------------------------------------------- */

const validMinutes = (t: string) => /^\d{1,3}$/.test(t) && +t >= 1 && +t <= 180;

/**
 * Minutes a day. Main practice offers 5, 10, 15 or any whole number from 1 to 180; the children's corner offers Off, 5, 10
 * or 15 and is set by a grown-up.
 */
export function TimeStep({
  kid,
  value,
  editing,
  step,
  onBack,
  onSave,
  onPreview,
}: {
  kid: boolean;
  value: number | null;
  editing: boolean;
  step: number;
  onBack: () => void;
  onSave: (minutes: number | null) => void;
  /** Called as minutes are tried, so the clock in the scene can show them. */
  onPreview?: (minutes: number | null) => void;
}) {
  const presets = kid ? [null, 5, 10, 15] : [5, 10, 15];
  const startCustom = !kid && value !== null && !presets.includes(value);
  const [custom, setCustom] = useState(startCustom);
  const [draft, setDraft] = useState(startCustom ? String(value) : "20");
  const [picked, setPicked] = useState<number | null | undefined>(
    kid ? value : (value ?? undefined),
  );
  const minutes = custom ? (validMinutes(draft) ? +draft : undefined) : picked;
  const previewRef = useRef(onPreview);
  previewRef.current = onPreview;
  useEffect(() => {
    if (minutes !== undefined) previewRef.current?.(minutes);
  }, [minutes]);
  const bad = custom && !validMinutes(draft);
  const ready = kid ? !custom : minutes !== undefined;

  const opt = (m: number | null, label: ReactNode, sub: string) => {
    const on = !custom && picked === m;
    return (
      <button
        key={String(m)}
        type="button"
        role="radio"
        aria-checked={on}
        aria-label={m === null ? "Off, no reading time" : `${m} minutes`}
        className={`opt ${m === null ? "text-[0.9375rem]" : ""}`}
        onClick={() => {
          setCustom(false);
          setPicked(m);
        }}
      >
        {label}
        <small>{sub}</small>
      </button>
    );
  };

  return (
    <>
      <div className="panel-body">
        <StepHead
          onBack={onBack}
          backLabel={editing ? "Back to your nook" : "Back"}
          step={editing ? undefined : step}
          of={editing ? undefined : 3}
          name="Reading time"
        />
        <ScreenTitle kid={kid}>
          {kid ? "Set a reading time?" : "How long would you like to read today?"}
        </ScreenTitle>
        <p className="lead">
          {kid
            ? "For grown-ups. A gentle guide that never counts down or stops the reader."
            : "Only recorded time counts, and you can keep going after."}
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Minutes">
          {presets.map((m) => (m === null ? opt(null, "Off", "no time") : opt(m, m, "min")))}
          {!kid && (
            <button
              type="button"
              role="radio"
              aria-checked={custom}
              aria-label="Other, you choose the minutes"
              className="opt text-[0.9375rem]"
              onClick={() => setCustom(true)}
            >
              Other
              <small>you choose</small>
            </button>
          )}
        </div>
        {custom && (
          <div className="flex flex-col gap-2">
            <label htmlFor="minutes" className="text-[0.9375rem] font-semibold">
              Your minutes
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary w-12 px-0"
                aria-label="5 minutes less"
                onClick={() => setDraft(String(Math.max(1, (parseInt(draft, 10) || 1) - 5)))}
              >
                <Minus className="size-[18px]" aria-hidden />
              </button>
              <input
                id="minutes"
                className="field h-12 w-24 text-center text-xl font-semibold tabular-nums"
                inputMode="numeric"
                autoComplete="off"
                maxLength={3}
                value={draft}
                aria-invalid={bad}
                aria-describedby="minutes-hint"
                onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              />
              <span className="text-muted-foreground" aria-hidden>
                min
              </span>
              <button
                type="button"
                className="btn-secondary w-12 px-0"
                aria-label="5 minutes more"
                onClick={() => setDraft(String(Math.min(180, (parseInt(draft, 10) || 0) + 5)))}
              >
                <Plus className="size-[18px]" aria-hidden />
              </button>
            </div>
            <p
              id="minutes-hint"
              className={`text-sm ${bad ? "text-destructive" : "text-muted-foreground"}`}
            >
              {bad ? "Enter a whole number from 1 to 180." : "Any whole number from 1 to 180."}
            </p>
          </div>
        )}
      </div>
      <div className="panel-foot">
        <button
          type="button"
          className="btn-primary w-full"
          disabled={!ready}
          onClick={() => onSave(kid ? (picked ?? null) : (minutes ?? null))}
        >
          {editing ? "Save" : kid ? "Hand over to the reader" : "Continue"}
        </button>
      </div>
    </>
  );
}

/* ---- Cushion and beanbag -------------------------------------------------------------------------------------------- */

export function ColourStep({
  kid,
  value,
  editing,
  step,
  onBack,
  onSave,
  onSkip,
  onPreview,
}: {
  kid: boolean;
  value: string | null;
  editing: boolean;
  step: number;
  onBack: () => void;
  onSave: (hex: string) => void;
  onSkip?: (() => void) | undefined;
  /** Called as each colour is tried, so the scene can show it. */
  onPreview: (hex: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(value);
  return (
    <>
      <div className="panel-body">
        <StepHead
          onBack={onBack}
          backLabel={editing ? "Back to your nook" : "Back"}
          step={editing ? undefined : step}
          of={editing ? undefined : 3}
          name={kid ? "Beanbag" : "Cushion"}
        />
        <ScreenTitle kid={kid}>{kid ? "Pick your beanbag" : "Get comfortable"}</ScreenTitle>
        <p className="lead">
          {kid ? "Which colour feels like you today?" : "Choose a cushion. Then the lamp comes on."}
        </p>
        <div
          role="radiogroup"
          aria-label={kid ? "Beanbag colour" : "Cushion colour"}
          // Four across; eight across on wider phones and tablets; one row to swipe on the smallest phones.
          className="grid grid-cols-[repeat(4,4rem)] gap-x-4 gap-y-5 max-[379px]:swatch-row min-[600px]:max-wide:grid-cols-[repeat(8,4rem)]"
        >
          {COLOURS.map((c) => (
            <button
              key={c.hex}
              type="button"
              role="radio"
              aria-checked={picked === c.hex}
              className="swatch"
              onClick={() => {
                setPicked(c.hex);
                onPreview(c.hex);
              }}
            >
              <span className="dot" style={{ background: c.hex }} />
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="panel-foot">
        {/* On phones Skip sits beside the main button, so the step needs less height under the nook. */}
        <div className="flex gap-2 wide:flex-col">
          {onSkip && !editing && (
            <button type="button" className="btn-secondary px-4 wide:hidden" onClick={onSkip}>
              Skip
            </button>
          )}
          <button
            type="button"
            className="btn-primary min-w-0 flex-1 wide:w-full"
            disabled={!picked}
            onClick={() => picked && onSave(picked)}
          >
            {editing ? "Save" : kid ? "Next: pick a story" : "Switch on the lamp"}
          </button>
          {onSkip && !editing && (
            <button
              type="button"
              className="btn-link hidden w-full wide:inline-flex"
              onClick={onSkip}
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ---- Ready: the summary of the nook --------------------------------------------------------------------------------- */

export type SummaryRow = { label: string; value: string; onChange: () => void };

export function ReadyPanel({
  kid,
  lampOn,
  rows,
  readLabel,
  onRead,
  lastRecording,
}: {
  kid: boolean;
  lampOn: boolean;
  rows: SummaryRow[];
  readLabel: string;
  onRead: () => void;
  /** The recording kept from last time, which opens its listen-back screen (and its notes). */
  lastRecording?: { detail: string; onOpen: () => void } | undefined;
}) {
  const light = kid ? "lantern" : "lamp";
  return (
    <>
      <div className="panel-body">
        <p className="text-sm text-muted-foreground" role="status">
          {lampOn ? `The ${light} is on.` : `The ${light} is warming up…`}
        </p>
        <ScreenTitle kid>{kid ? "Your corner is ready" : "Your nook is ready"}</ScreenTitle>
        <ul aria-label={kid ? "Your corner" : "Your nook"} className="flex flex-col">
          {rows.map((r) => (
            <li
              key={r.label}
              className="flex min-h-14 items-center justify-between gap-3 border-b border-border py-1 last:border-0"
            >
              <span className="min-w-0">
                <span className="block text-sm text-muted-foreground">{r.label}</span>
                <span className="block font-semibold break-words">{r.value}</span>
              </span>
              <button
                type="button"
                className="btn-link shrink-0"
                aria-label={`Change ${r.label.toLowerCase()}`}
                onClick={r.onChange}
              >
                Change
              </button>
            </li>
          ))}
        </ul>
        {lastRecording && (
          <button
            type="button"
            className="grid min-h-16 grid-cols-[2.75rem_minmax(0,1fr)_1.25rem] items-center gap-3 rounded-2xl bg-raised px-3.5 py-2.5 text-left transition-colors hover:bg-selected"
            aria-label={`Your last recording, ${lastRecording.detail.replace(" · ", ", ")}. Listen back`}
            onClick={lastRecording.onOpen}
          >
            <span
              className="grid size-11 place-items-center rounded-full bg-soft text-primary"
              aria-hidden
            >
              <Play className="ml-0.5 size-4 fill-current" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">Your last recording</span>
              <span className="block text-sm text-muted-foreground tabular-nums">
                {lastRecording.detail}
              </span>
            </span>
            <ChevronRight className="size-[18px] text-muted-foreground" aria-hidden />
          </button>
        )}
      </div>
      <div className="panel-foot">
        <button type="button" className="btn-primary w-full" onClick={onRead}>
          {readLabel}
        </button>
      </div>
    </>
  );
}

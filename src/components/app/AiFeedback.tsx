import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Loader2, Play } from "lucide-react";
import { Modal, ScreenTitle } from "./ui";
import { clock, type Moment, type Notes } from "@/lib/reading-feedback/feedback";
import type { AiFeedback as AiState } from "./useAiFeedback";

const PAUSED: Record<string, string> = {
  credit: "AI feedback is paused: its free allowance has been used up.",
  "daily-limit": "AI feedback has reached today’s limit. It should be back tomorrow.",
  off: "AI feedback is switched off at the moment.",
  unreachable: "AI feedback can’t be reached at the moment.",
};
const FAILED: Record<string, string> = {
  "too-long": "This recording is longer than AI feedback can take.",
  "bad-audio": "This audio couldn’t be used for AI feedback.",
  unavailable: "AI feedback didn’t work this time.",
};
const STAGE = {
  sending: "Sending your recording…",
  listening: "Listening to your recording…",
  preparing: "Preparing your notes…",
} as const;
const STILL_WORKS = "Recording and playback work as usual.";
const KIND: Record<Moment["kind"], string> = {
  pause: "Pause",
  skipped: "Words not heard",
  repeated: "Repeated",
};

/**
 * Optional AI feedback on the main practice's review. Adults only: the children's corner never shows it.
 * Nothing is sent until the adult has turned it on and then asks for notes on a recording. Notes belong to their
 * recording: they are shown whenever that recording is, even after AI feedback is turned off.
 * The card's last row says whether AI feedback is on or off, and is the one place to change it.
 */
export function AiFeedback({
  ai,
  notes,
  hasPassage,
  onTurnOn,
  onPlayFrom,
  onTurnedOff,
}: {
  ai: AiState;
  notes: Notes | null;
  hasPassage: boolean;
  onTurnOn: () => void;
  onPlayFrom: (t: number) => void;
  onTurnedOff: () => void;
}) {
  const { status, choice, run, check } = ai;
  const [sheet, setSheet] = useState(false);
  const rowRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!status) void check();
  }, [status, check]);

  const mayTrain = status?.training !== "excluded";
  const on = choice === "ai";
  const working = run.stage === "sending" || run.stage === "listening" || run.stage === "preparing";

  const row =
    status && choice !== null ? (
      <button
        ref={rowRef}
        type="button"
        className="-mx-2 grid min-h-12 grid-cols-[minmax(0,1fr)_1.25rem] items-center gap-3 rounded-[10px] border-t border-border px-2 py-1 text-left text-[0.9375rem] leading-snug text-muted-foreground"
        aria-label={on ? "AI feedback is on. Change" : "AI feedback is off. Turn on"}
        onClick={() => (on ? setSheet(true) : onTurnOn())}
      >
        <span>{on ? "AI feedback is on" : "AI feedback is off"}</span>
        <ChevronRight className="size-[18px]" aria-hidden />
      </button>
    ) : null;

  let body: React.ReactNode;
  if (notes) {
    body = <NotesView notes={notes} onPlayFrom={onPlayFrom} offNow={!!status && !on} />;
  } else if (!status) {
    body = (
      <p className="text-sm text-muted-foreground" role="status">
        <Loader2
          className="mr-1.5 -mt-0.5 inline size-4 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
        Checking AI feedback…
      </p>
    );
  } else if (choice === null) {
    body = (
      <>
        <p className="leading-normal">
          Buddy can compare your reading with your passage using AI speech recognition. It’s off
          unless you turn it on.
        </p>
        <button type="button" className="btn-secondary self-start" onClick={onTurnOn}>
          About AI feedback
        </button>
      </>
    );
  } else if (!on) {
    body = <p className="text-sm text-muted-foreground">Your recordings stay on this device.</p>;
  } else if (working) {
    body = (
      <div className="flex flex-wrap items-center justify-between gap-2" role="status">
        <span>
          <Loader2
            className="mr-1.5 -mt-0.5 inline size-4 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
          {STAGE[run.stage]}
        </span>
        {run.stage !== "preparing" && (
          <button type="button" className="btn-quiet" onClick={ai.cancel}>
            Stop waiting
          </button>
        )}
      </div>
    );
  } else if (!status.available) {
    body = (
      <p className="text-sm text-muted-foreground" role="status">
        {PAUSED[status.paused ?? "off"]} {STILL_WORKS}
      </p>
    );
  } else if (!hasPassage) {
    body = (
      <p className="text-sm text-muted-foreground">
        AI feedback needs the words you read: paste your passage, or add the words to your
        photographed pages.
      </p>
    );
  } else {
    body = (
      <>
        {run.stage === "error" && (
          <p className="text-sm text-muted-foreground" role="alert">
            {PAUSED[run.reason] ?? FAILED[run.reason]} {STILL_WORKS}
          </p>
        )}
        <button type="button" className="btn-secondary self-start" onClick={() => void ai.start()}>
          {run.stage === "error" ? "Try again" : "Get notes on this recording"}
        </button>
        <p className="text-sm text-muted-foreground">
          {mayTrain
            ? "Sends this recording to AssemblyAI, which may use it to train its models."
            : "Sends this recording to AssemblyAI to be transcribed."}
        </p>
      </>
    );
  }

  return (
    <section
      aria-labelledby="ai-h"
      className="flex flex-col gap-4 rounded-2xl bg-raised px-4 pt-[1.125rem] pb-2 sm:px-5"
    >
      <h2 id="ai-h" className="text-xl leading-tight font-semibold">
        {notes ? "Notes on this reading" : "AI feedback"}
      </h2>
      {body}
      {row ?? <span className="h-2" aria-hidden />}
      <ChangeSheet
        open={sheet}
        onClose={() => setSheet(false)}
        returnFocus={rowRef}
        onTurnOff={() => {
          ai.turnOff();
          setSheet(false);
          onTurnedOff();
        }}
      />
    </section>
  );
}

/** Pace, the moments to listen to, one thing to try, and what isn't checked. One column, read top to bottom. */
function NotesView({
  notes,
  onPlayFrom,
  offNow,
}: {
  notes: Notes;
  onPlayFrom: (t: number) => void;
  offNow: boolean;
}) {
  const { pace, moments } = notes;
  const len = notes.duration;
  const pct = (t: number) => `${Math.max(0, Math.min(100, (t / len) * 100))}%`;
  const kinds = (["pause", "skipped", "repeated"] as const).filter((k) =>
    moments.some((m) => m.kind === k),
  );
  const count = (k: Moment["kind"]) => moments.filter((m) => m.kind === k).length;
  const max = Math.max(1, ...pace.bins.map((b) => b.wpm));
  const changed = pace.bins.filter((b) => b.changed);
  const steady = pace.bins.filter((b) => !b.changed);
  const avg = (bs: typeof steady) =>
    Math.round(bs.reduce((a, b) => a + b.wpm, 0) / Math.max(1, bs.length) / 10) * 10;
  const chartLabel = `Words a minute in ${pace.bins.length} parts of the reading: about ${avg(steady)} ${
    changed.length && pace.changeAt != null
      ? `for the first ${steady.length} parts, then about ${avg(changed)} from ${clock(pace.changeAt)}.`
      : "throughout."
  }`;
  const stripLabel = moments.length
    ? `The recording from 0:00 to ${clock(len)} with ${kinds
        .map(
          (k) => `${count(k)} ${KIND[k].toLowerCase()}${k === "pause" && count(k) > 1 ? "s" : ""}`,
        )
        .join(", ")}, at ${moments.map((m) => clock(m.at)).join(", ")}.`
    : "";

  return (
    <>
      <div className="-mt-2 flex flex-col gap-1.5">
        <p className="text-[0.9375rem] leading-normal text-muted-foreground">
          Made by AI speech recognition, which can mishear. Listen back before deciding anything.
        </p>
        {offNow && (
          <p className="text-[0.9375rem] leading-normal">
            AI feedback is off now. These notes were made before, and stay with this recording.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <h3 className="text-[1.0625rem] font-semibold">Pace</h3>
        <p className="leading-normal">{pace.summary}</p>
        {pace.bins.length > 0 && (
          <figure className="flex flex-col gap-2">
            <div
              role="img"
              aria-label={chartLabel}
              className="flex h-24 items-end gap-1.5 border-b border-line"
            >
              {pace.bins.map((b, i) => (
                <span
                  key={i}
                  className={`flex-1 rounded-t ${b.changed ? "bg-primary" : "bg-line"}`}
                  style={{ height: `${Math.max(6, (b.wpm / max) * 100)}%` }}
                />
              ))}
            </div>
            <figcaption className="relative h-4 text-[0.8125rem] text-muted-foreground tabular-nums">
              <span className="absolute left-0">0:00</span>
              {pace.changeAt != null && changed.length > 0 && (
                <span
                  className="absolute -translate-x-1/2"
                  style={{ left: `${(steady.length / pace.bins.length) * 100}%` }}
                >
                  {clock(pace.changeAt)}
                </span>
              )}
              <span className="absolute right-0">{clock(pace.bins.at(-1)!.to)}</span>
            </figcaption>
            <p className="text-sm leading-snug text-muted-foreground">
              Words a minute, every 20 seconds. Pauses aren’t counted as slow.
            </p>
          </figure>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <h3 className="text-[1.0625rem] font-semibold">
          {moments.length === 0
            ? "Moments to listen to"
            : `${moments.length} ${moments.length === 1 ? "moment" : "moments"} to listen to`}
        </h3>
        {moments.length === 0 ? (
          <p className="leading-normal">
            Nothing stood out: no long pauses inside sentences, and no skipped or repeated lines.
          </p>
        ) : (
          <>
            <figure className="flex flex-col gap-2">
              <div
                role="img"
                aria-label={stripLabel}
                className="relative h-7 rounded-md bg-selected"
              >
                {moments.map((m, i) =>
                  m.kind === "pause" ? (
                    <span
                      key={i}
                      className="absolute top-[3px] bottom-[3px] w-[5px] rounded-[3px] bg-primary"
                      style={{ left: pct(m.at) }}
                    />
                  ) : (
                    <span
                      key={i}
                      className={`absolute top-[9px] bottom-[9px] rounded-[5px] ${
                        m.kind === "skipped" ? "bg-foreground" : "border-2 border-foreground"
                      }`}
                      style={{
                        left: pct(m.at),
                        width: `max(10px, ${((m.until - m.at) / len) * 100}%)`,
                      }}
                    />
                  ),
                )}
              </div>
              <figcaption className="flex flex-wrap gap-x-4 gap-y-1.5 text-[0.8125rem] text-muted-foreground">
                {kinds.map((k) => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className={
                        k === "pause"
                          ? "h-3.5 w-[5px] rounded-[3px] bg-primary"
                          : k === "skipped"
                            ? "h-2.5 w-[18px] rounded-[5px] bg-foreground"
                            : "h-2.5 w-[18px] rounded-[5px] border-2 border-foreground"
                      }
                    />
                    {KIND[k]}
                  </span>
                ))}
              </figcaption>
            </figure>
            <ol className="flex flex-col gap-3.5">
              {moments.map((m, i) => (
                <li key={i} className="flex items-start gap-3">
                  <button
                    type="button"
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-soft text-primary transition-transform duration-100 active:scale-95"
                    aria-label={`Play from ${clock(m.at)}`}
                    onClick={() => onPlayFrom(Math.max(0, m.at - 1.5))}
                  >
                    <Play className="ml-0.5 size-4 fill-current" aria-hidden />
                  </button>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-bold text-muted-foreground tabular-nums">
                      {clock(m.at)} · {KIND[m.kind]}
                    </span>
                    <span className="leading-snug break-words">{m.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
        {notes.endsEarly && (
          <p className="text-sm leading-snug text-muted-foreground">{notes.endsEarly}</p>
        )}
      </div>

      {notes.tryNext && (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <h3 className="text-[1.0625rem] font-semibold">One thing to try</h3>
          <p className="leading-normal">{notes.tryNext}</p>
        </div>
      )}

      <p className="text-sm leading-snug text-muted-foreground">
        Not checked: pronunciation, accent and single words. Speech recognition often mishears
        these, so Buddy leaves them out. These notes are saved with this recording and deleted with
        it.
      </p>
    </>
  );
}

/** Change AI feedback: On or Off, the current one selected. Choosing Off says what changes before confirming. */
function ChangeSheet({
  open,
  onClose,
  onTurnOff,
  returnFocus,
}: {
  open: boolean;
  onClose: () => void;
  onTurnOff: () => void;
  returnFocus: React.RefObject<HTMLElement | null>;
}) {
  const [pick, setPick] = useState<"on" | "off">("on");
  useEffect(() => {
    if (open) setPick("on");
  }, [open]);
  const option = (value: "on" | "off", title: string, line: string) => (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-[14px] p-3.5 ${
        pick === value ? "bg-selected shadow-[inset_0_0_0_2px_var(--amber)]" : "bg-raised"
      }`}
    >
      <input
        type="radio"
        name="ai-feedback"
        value={value}
        checked={pick === value}
        onChange={() => setPick(value)}
        className="mt-1 size-5 shrink-0 accent-[var(--amber)]"
      />
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">{title}</span>
        <span className="text-sm leading-snug text-muted-foreground">{line}</span>
      </span>
    </label>
  );
  return (
    <Modal open={open} onClose={onClose} title="AI feedback" returnFocus={returnFocus}>
      <fieldset className="flex flex-col gap-2.5">
        <legend className="sr-only">AI feedback</legend>
        {option(
          "on",
          "On",
          "When you ask for notes, that recording goes to AssemblyAI. Nothing is sent otherwise.",
        )}
        {option("off", "Off", "Recordings stay on this device. Listening back works as usual.")}
      </fieldset>
      {pick === "off" && (
        <p className="leading-normal">
          Notes you already have stay with their recordings. Buddy already asked AssemblyAI to
          delete recordings sent earlier; if it kept a copy for training, turning this off doesn’t
          undo that.
        </p>
      )}
      <div className="rb-acts is-stacked">
        {/* Stacked: shown with the main action on top. */}
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary min-h-12 text-base"
          onClick={pick === "off" ? onTurnOff : onClose}
        >
          {pick === "off" ? "Turn off AI feedback" : "Keep it on"}
        </button>
      </div>
    </Modal>
  );
}

/**
 * Turning AI feedback on: one page with what happens to recordings and the adult, own-voice and consent tick box.
 * Asked every time it's turned on, because recordings leave the device. "Keep it off" remembers Off.
 */
export function TurnOnPanel({
  ai,
  onBack,
  onDone,
}: {
  ai: AiState;
  onBack: () => void;
  onDone: (on: boolean) => void;
}) {
  const [agree, setAgree] = useState(false);
  const mayTrain = ai.status?.training !== "excluded";
  return (
    <>
      <div className="panel-body">
        <button type="button" className="btn-quiet -mt-2 -ml-2.5 self-start" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden /> Back to your recording
        </button>
        <ScreenTitle>Turn on AI feedback</ScreenTitle>
        <p className="lead">For adults reading aloud. The children’s corner never uses it.</p>
        <section aria-labelledby="ai-what" className="flex flex-col gap-2.5">
          <h2 id="ai-what" className="text-lg font-semibold">
            What happens to your recordings
          </h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 leading-normal">
            <li>
              Only when you ask for notes, that recording’s audio goes to{" "}
              <strong>AssemblyAI</strong>, a speech recognition company, on its EU servers. Your
              passage and pages don’t.
            </li>
            {mayTrain ? (
              <li>
                <strong>AssemblyAI may use recordings to train its AI models.</strong> Reading Buddy
                uses its free plan, which doesn’t allow switching this off.
              </li>
            ) : (
              <li>
                AssemblyAI has confirmed in writing that recordings sent this way aren’t used to
                train its models.
              </li>
            )}
            <li>
              Once your notes are ready, Buddy asks AssemblyAI to delete the recording and its
              transcript.
              {mayTrain &&
                " If it has already kept a copy for training, deleting the recording here doesn’t undo that."}
            </li>
            <li>
              Notes are saved with their recording on this device. Deleting the recording deletes
              its notes.
            </li>
            <li>
              It has only been tested on a few recordings by one reader, so treat anything it notes
              as a moment to check, not a mistake.
            </li>
          </ul>
        </section>
        <section aria-labelledby="ai-before" className="flex flex-col gap-2.5">
          <h2 id="ai-before" className="text-lg font-semibold">
            Before you turn it on
          </h2>
          <label className="flex cursor-pointer items-start gap-3 rounded-[14px] bg-raised p-3.5">
            <input
              type="checkbox"
              className="mt-1 size-5 shrink-0 accent-[var(--amber)]"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            <span className="leading-normal">
              I’m 18 or over, the recordings I send will be of my own voice, and I agree to them
              going to AssemblyAI as described above.
            </span>
          </label>
        </section>
      </div>
      <div className="panel-foot">
        <button
          type="button"
          className="btn-primary w-full"
          disabled={!agree}
          aria-describedby={agree ? undefined : "ai-tick"}
          onClick={() => {
            ai.choose("ai");
            onDone(true);
          }}
        >
          Turn on AI feedback
        </button>
        {!agree && (
          <p id="ai-tick" className="text-center text-sm text-muted-foreground">
            Tick the box to turn it on.
          </p>
        )}
        <button
          type="button"
          className="btn-link w-full"
          onClick={() => {
            ai.choose("device");
            onDone(false);
          }}
        >
          Keep it off
        </button>
      </div>
    </>
  );
}

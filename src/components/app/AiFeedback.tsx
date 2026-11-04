import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "./ui";
import { STATUS_LABEL } from "@/lib/sample-feedback";
import { clock, type Item } from "@/lib/reading-feedback/feedback";
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

/**
 * Optional AI feedback on the main practice's review. Adults only: the children's corner never shows it.
 * Nothing is sent until the adult has chosen AI feedback (in the dialog) and then asks for it on a recording.
 */
export function AiFeedback({ ai, hasPassage }: { ai: AiState; hasPassage: boolean }) {
  const { status, choice, run, check } = ai;
  const [about, setAbout] = useState(false);
  const [adult, setAdult] = useState(false);
  const [more, setMore] = useState(false);
  const openRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!status) void check();
  }, [status, check]);
  useEffect(() => setMore(false), [run]);

  const mayTrain = status?.training !== "excluded";
  const change = (
    <button type="button" className="text-link" onClick={ai.changeChoice}>
      Change
    </button>
  );

  return (
    <section
      aria-labelledby="ai-h"
      className="flex flex-col gap-3 rounded-2xl bg-raised p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="ai-h" className="text-lg font-semibold">
          AI feedback
        </h2>
        <span className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
          Optional · adults only
        </span>
      </div>

      {!status ? (
        <p className="text-sm text-muted-foreground" role="status">
          <Loader2 className="mr-1.5 -mt-0.5 inline size-4 animate-spin" aria-hidden />
          Checking AI feedback…
        </p>
      ) : choice === null ? (
        <>
          <p className="leading-normal">
            Buddy can compare your reading with your passage using AI speech recognition. It’s off
            unless you choose it.
          </p>
          <button
            ref={openRef}
            type="button"
            className="btn-secondary self-start"
            onClick={() => setAbout(true)}
          >
            About AI feedback
          </button>
        </>
      ) : choice === "device" ? (
        <p className="text-sm text-muted-foreground">
          Off. Your recordings stay on this device. {change}
        </p>
      ) : (
        <>
          {run.stage === "done" ? (
            <Notes
              items={run.feedback.items}
              hidden={run.feedback.hidden}
              tryNext={run.feedback.tryNext}
              more={more}
              onMore={() => setMore(true)}
            />
          ) : run.stage === "sending" || run.stage === "listening" || run.stage === "preparing" ? (
            <div className="flex flex-wrap items-center justify-between gap-2" role="status">
              <span>
                <Loader2 className="mr-1.5 -mt-0.5 inline size-4 animate-spin" aria-hidden />
                {STAGE[run.stage]}
              </span>
              {run.stage !== "preparing" && (
                <button type="button" className="btn-quiet" onClick={ai.cancel}>
                  Stop waiting
                </button>
              )}
            </div>
          ) : !status.available ? (
            <p className="text-sm text-muted-foreground" role="status">
              {PAUSED[status.paused ?? "off"]} {STILL_WORKS}
            </p>
          ) : !hasPassage ? (
            <p className="text-sm text-muted-foreground">
              AI feedback needs the words you read: paste your passage, or add the words to your
              photographed pages.
            </p>
          ) : (
            <>
              {run.stage === "error" && (
                <p className="text-sm text-muted-foreground" role="alert">
                  {PAUSED[run.reason] ?? FAILED[run.reason]} {STILL_WORKS}
                </p>
              )}
              <button
                type="button"
                className="btn-secondary self-start"
                onClick={() => void ai.start()}
              >
                {run.stage === "error" ? "Try again" : "Get AI feedback on this recording"}
              </button>
              <p className="text-sm text-muted-foreground">
                {mayTrain
                  ? "Sends this recording to AssemblyAI, which may use it to train its models."
                  : "Sends this recording to AssemblyAI to be transcribed."}
              </p>
            </>
          )}
          <p className="text-sm text-muted-foreground">
            On{mayTrain ? ", knowing AssemblyAI may use recordings for training" : ""}. {change}
          </p>
        </>
      )}

      <Modal open={about} onClose={() => setAbout(false)} title="AI feedback" returnFocus={openRef}>
        <div className="flex flex-col gap-3 leading-normal">
          <p className="lead">
            It compares what you read aloud with your passage and points out moments you might like
            to listen back to.
          </p>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              The recording (just the audio, not your passage or pages) goes through Reading Buddy’s
              server to <strong>AssemblyAI</strong>, a speech-recognition company, on its EU
              servers.
            </li>
            {mayTrain ? (
              <li>
                <strong>AssemblyAI may use your recording to train its AI models.</strong> Reading
                Buddy uses AssemblyAI’s free plan, which doesn’t allow switching this off.
              </li>
            ) : (
              <li>
                AssemblyAI has confirmed in writing that recordings sent this way aren’t used to
                train its models.
              </li>
            )}
            <li>
              Once your notes are ready, Reading Buddy asks AssemblyAI to delete the recording and
              its transcript, and keeps no copy on its server. Your recording stays saved on this
              device until you delete it.
              {mayTrain &&
                " If AssemblyAI has already kept a copy for training, deleting the recording here or changing your choice later doesn’t undo that."}
            </li>
            <li>
              Speech recognition can mishear words, especially names. So far it has only been tested
              on a few recordings by one reader, so treat anything it notes as a moment to check,
              not a mistake.
            </li>
            <li>Not for children’s voices: the children’s corner never uses AI feedback.</li>
          </ul>
          <label className="flex items-start gap-3 rounded-xl bg-raised p-3">
            <input
              type="checkbox"
              className="mt-1 size-5 shrink-0 accent-[var(--amber)]"
              checked={adult}
              onChange={(e) => setAdult(e.target.checked)}
            />
            <span>I’m 18 or over, and the recordings I send will be of my own voice.</span>
          </label>
          <p className="text-sm text-muted-foreground">
            You can change this at any time; a change applies to recordings from then on. Your
            choice is remembered on this device, and nothing is sent until you ask for feedback on a
            recording.
          </p>
        </div>
        <div className="rb-acts">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              ai.choose("device");
              setAbout(false);
            }}
          >
            Keep recordings on this device
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!adult}
            onClick={() => {
              ai.choose("ai");
              setAbout(false);
            }}
          >
            {mayTrain ? "Use AI feedback, knowing this" : "Use AI feedback"}
          </button>
        </div>
      </Modal>
    </section>
  );
}

function Notes(p: {
  items: Item[];
  hidden: Item[];
  tryNext: string | null;
  more: boolean;
  onMore: () => void;
}) {
  const list = p.more
    ? [...p.items, ...p.hidden].sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity))
    : p.items;
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Made by AI speech recognition, which can mishear. Listen back to check anything noted.
      </p>
      <ul className="flex flex-col gap-3">
        {list.map((i, k) => (
          <li key={k} className="flex flex-col gap-2">
            <span className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
              {STATUS_LABEL[i.status]}
              {i.at != null && ` · ${clock(i.at)}`}
            </span>
            <p className="rounded-lg bg-night px-3.5 py-2.5 shadow-[inset_3px_0_0_var(--amber)]">
              {i.words}
            </p>
            <p className="leading-normal">{i.observation}</p>
          </li>
        ))}
      </ul>
      {!p.more && p.hidden.length > 0 && (
        <button type="button" className="btn-quiet self-start" onClick={p.onMore}>
          Show {p.hidden.length} more
        </button>
      )}
      {p.tryNext && <p className="text-sm text-muted-foreground">{p.tryNext}</p>}
    </>
  );
}

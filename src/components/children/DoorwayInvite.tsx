import { ArrowRight } from "lucide-react";
import { DoorwayArt } from "./DoorwayArt";

/** A retained children's session, as the welcome screen shows it. `title` is the story's title or "Your own story". */
export type DoorwayResume = { title: string; preparing: boolean };

/**
 * The quiet way into the children's corner, on the welcome screen. The whole invitation — picture, title and its action —
 * is ONE button: one tab stop, one accessible name, nothing nested. It never asks for an adult reading target.
 * The action is plain text (no border, fill, pill or underline); hovering tints the row and nudges the arrow, and keyboard
 * focus shows the app's normal ring around the whole row.
 *
 * With nothing in the children's session it invites ("A doorway to stories … Step inside"). When the children's session
 * holds something real (a chosen story, the child's own pages, a recording) the same control says so and continues it
 * ("Back to your story … Continue"): entering never creates a new session, so the screen, page, recording and reflection
 * come back exactly as they were. The adult session's own Resume card is a separate control.
 */
export function DoorwayInvite({
  onEnter,
  resume,
}: {
  onEnter: () => void;
  resume?: DoorwayResume | null;
}) {
  const heading = resume
    ? resume.preparing
      ? "Continue your reading"
      : "Back to your story"
    : "A doorway to stories";
  const detail = resume
    ? resume.preparing
      ? "Your pages are waiting"
      : resume.title
    : "A reading corner for children";
  return (
    <button
      type="button"
      onClick={onEnter}
      className="group -ml-2 flex w-[calc(100%+0.5rem)] items-center gap-4 rounded-2xl p-2 text-left transition-colors hover:bg-tint lg:mx-auto lg:ml-auto lg:w-fit lg:max-w-md lg:gap-5 lg:px-4"
    >
      <DoorwayArt className="w-24 shrink-0 sm:w-28" />
      <span className="min-w-0">
        <span className="display-serif block text-[1.25rem] leading-snug">{heading}</span>{" "}
        <span
          className={`mt-0.5 block text-sm text-muted-foreground ${resume && !resume.preparing ? "font-medium [overflow-wrap:anywhere]" : ""}`}
        >
          {detail}
        </span>{" "}
        <span className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-primary">
          {resume ? "Continue" : "Step inside"}
          <ArrowRight
            className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
        {resume && <span className="sr-only"> in the children’s reading corner</span>}
      </span>
    </button>
  );
}

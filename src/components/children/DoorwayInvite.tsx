import { ArrowRight } from "lucide-react";
import { DoorwayArt } from "./DoorwayArt";

/**
 * The quiet way into the children's corner, on the welcome screen. The whole invitation — picture, title and "Step inside" —
 * is ONE button: one tab stop, one accessible name, nothing nested. It never asks for an adult reading target.
 * "Step inside" is plain text (no border, fill, pill or underline); hovering tints the row and nudges the arrow, and keyboard
 * focus shows the app's normal ring around the whole row.
 */
export function DoorwayInvite({ onEnter }: { onEnter: () => void }) {
  return (
    <button
      type="button"
      onClick={onEnter}
      className="group -ml-2 flex w-[calc(100%+0.5rem)] items-center gap-4 rounded-2xl p-2 text-left transition-colors hover:bg-tint lg:mx-auto lg:ml-auto lg:w-fit lg:max-w-md lg:gap-5 lg:px-4"
    >
      <DoorwayArt className="w-24 shrink-0 sm:w-28" />
      <span className="min-w-0">
        <span className="display-serif block text-[1.25rem] leading-snug">
          A doorway to stories
        </span>{" "}
        <span className="mt-0.5 block text-sm text-muted-foreground">
          A reading corner for children
        </span>{" "}
        <span className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-primary">
          Step inside
          <ArrowRight
            className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </span>
    </button>
  );
}

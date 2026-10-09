import { ArrowRight } from "lucide-react";

type Props = {
  onEnter: () => void;
  /**
   * "beside": a compact row on phones; on wide screens a modest column beside the target card.
   * "row": always the compact horizontal row (used once the main flow has moved on).
   */
  layout: "beside" | "row";
};

/**
 * The quiet way into the children's corner, on the welcome screen. It never asks for an adult reading target, and it is
 * clearly secondary: small art, a short serif title, one understated text action. The picture is the approved doorway art
 * (decorative: the text says everything it does).
 */
export function DoorwayInvite({ onEnter, layout }: Props) {
  const beside = layout === "beside";
  return (
    <section
      aria-labelledby="doorway-h"
      className={
        beside
          ? "flex items-center gap-4 lg:flex-col lg:gap-3 lg:pt-6 lg:text-center"
          : "flex items-center gap-4"
      }
    >
      <img
        src="/illustrations/doorway.png"
        alt=""
        width={252}
        height={232}
        decoding="async"
        className={beside ? "h-auto w-20 shrink-0 sm:w-24 lg:w-40" : "h-auto w-20 shrink-0 sm:w-24"}
      />
      <div className="min-w-0">
        <h2 id="doorway-h" className="display-serif text-[1.25rem] leading-snug">
          A doorway to stories
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">A reading corner for children</p>
        <button
          type="button"
          onClick={onEnter}
          aria-label="Step inside the children’s reading corner"
          className={`text-link -ml-1 mt-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 ${
            beside ? "lg:mx-auto lg:ml-0" : ""
          }`}
        >
          Step inside <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}

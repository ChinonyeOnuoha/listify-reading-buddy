import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ConfirmInline } from "@/components/reading/ConfirmInline";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { lengthLabel, type StoryMeta } from "@/content/stories";
import { StoryCredits } from "./StoryCredits";

type Props = {
  /** The story being previewed; null = closed. */
  story: StoryMeta | null;
  onClose: () => void;
  onRead: (story: StoryMeta) => void;
  /** Set when reading this story would replace a kept recording: shows the confirmation inside the modal. */
  replacing: { message: string } | null;
  onConfirmReplace: () => void;
  onCancelReplace: () => void;
  /** Where focus goes when the modal closes: the card that opened it. */
  returnFocus: (slug: string) => void;
};

/**
 * One modal per story: a preview (cover, title, description, length, Read this story) with About this story as a second view
 * in the SAME modal — never a dialog on top of a dialog. Full-screen and opaque on phones (nothing else shows behind it),
 * centred on wide screens. It is a plain preview: opening or closing it changes nothing, and it never touches the recording
 * or the microphone.
 */
export function StoryModal({
  story,
  onClose,
  onRead,
  replacing,
  onConfirmReplace,
  onCancelReplace,
  returnFocus,
}: Props) {
  const [view, setView] = useState<"preview" | "about">("preview");
  const primary = useRef<HTMLButtonElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const aboutBtn = useRef<HTMLButtonElement>(null);
  const lastSlug = useRef<string | null>(null);

  // A different story always opens on its preview.
  useEffect(() => {
    if (story) lastSlug.current = story.slug;
    setView("preview");
  }, [story?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Moving between the two views keeps focus on a sensible control.
  const show = (v: "preview" | "about") => {
    setView(v);
    requestAnimationFrame(() => (v === "about" ? back : aboutBtn).current?.focus());
  };

  return (
    <Dialog open={!!story} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          primary.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          if (lastSlug.current) returnFocus(lastSlug.current);
        }}
        className="top-0 left-0 h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 content-start gap-4 overflow-y-auto overscroll-contain rounded-none border-0 bg-card p-5 pt-16 text-foreground sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[88dvh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[26px] sm:border sm:border-border sm:p-8 sm:pt-14"
      >
        {story && view === "preview" && (
          <>
            <span
              className={`block aspect-[4/3] max-h-[38dvh] w-full overflow-hidden rounded-2xl sm:max-h-none ${story.cardFit === "contain" ? "bg-white" : "bg-tint"}`}
            >
              <img
                src={story.cardImage}
                alt=""
                width={480}
                height={360}
                decoding="async"
                className={`size-full ${story.cardFit === "contain" ? "object-contain" : "object-cover"}`}
              />
            </span>
            <div>
              <DialogTitle className="display-serif text-[1.625rem] leading-tight">
                {story.title}
              </DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {lengthLabel(story.words)} · {story.words} words · {story.pageCount} pages
              </p>
            </div>
            <DialogDescription className="text-base text-foreground">
              {story.summary}
            </DialogDescription>

            {replacing && (
              <ConfirmInline
                message={replacing.message}
                confirmLabel="Replace and read"
                cancelLabel="Keep my recording"
                onConfirm={onConfirmReplace}
                onCancel={onCancelReplace}
              />
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                ref={primary}
                type="button"
                className="btn-primary btn-pill w-full sm:w-auto"
                onClick={() => onRead(story)}
              >
                Read this story <ArrowRight className="size-[18px]" aria-hidden />
              </button>
              <button
                ref={aboutBtn}
                type="button"
                className="btn-secondary w-full sm:w-auto"
                onClick={() => show("about")}
              >
                About this story
              </button>
            </div>
          </>
        )}

        {story && view === "about" && (
          <>
            <button
              ref={back}
              type="button"
              className="btn-quiet -ml-3 w-fit"
              onClick={() => show("preview")}
            >
              <ArrowLeft className="size-4" aria-hidden /> Back to the story
            </button>
            <div>
              <DialogTitle className="display-serif text-[1.5rem] leading-tight">
                About this story
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                {story.title}
              </DialogDescription>
            </div>
            <StoryCredits story={story} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

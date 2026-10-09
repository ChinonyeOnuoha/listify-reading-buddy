import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { lengthLabel, readingWords, wordsLine, type StoryMeta } from "@/content/stories";
import { StoryCredits } from "./StoryCredits";

/**
 * Understated "About this story" link opening the credit and licence information (used on the reading screen).
 * Closing returns focus to the link without moving the page, so the reader's view is exactly as they left it.
 */
export function AboutStory({ story, className = "" }: { story: StoryMeta; className?: string }) {
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          ref={trigger}
          type="button"
          className={`text-link min-h-11 text-sm whitespace-nowrap ${className}`}
        >
          About this story
        </button>
      </DialogTrigger>
      <DialogContent
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          trigger.current?.focus({ preventScroll: true });
        }}
        className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-[26px] border-border bg-card p-6 text-foreground sm:p-8"
      >
        <DialogTitle className="display-serif pr-10 text-[1.5rem] leading-tight">
          {story.title}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {lengthLabel(readingWords(story))} · {wordsLine(story)} · {story.pageCount} pages
        </DialogDescription>
        <StoryCredits story={story} />
      </DialogContent>
    </Dialog>
  );
}

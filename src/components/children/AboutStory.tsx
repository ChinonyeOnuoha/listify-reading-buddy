import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { attributionLine, lengthLabel, type StoryMeta } from "@/content/stories";

/** Understated "About this story" link opening the credit and licence information the story's licence asks for. */
export function AboutStory({ story, className = "" }: { story: StoryMeta; className?: string }) {
  const c = story.credit;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`text-link min-h-11 text-sm whitespace-nowrap ${className}`}
        >
          About this story
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[26px] border-border bg-card p-6 text-foreground sm:p-8">
        <DialogTitle className="display-serif pr-10 text-[1.5rem] leading-tight">
          {story.title}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {lengthLabel(story.words)} · {story.words} words · {story.pageCount} pages
        </DialogDescription>

        <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="font-medium">Written by</dt>
          <dd>{c.author}</dd>
          {c.adaptation && (
            <>
              <dt className="font-medium">Adapted by</dt>
              <dd>{c.adaptation}</dd>
            </>
          )}
          {c.translator && (
            <>
              <dt className="font-medium">Translated by</dt>
              <dd>{c.translator}</dd>
            </>
          )}
          <dt className="font-medium">Illustrated by</dt>
          <dd>{c.illustrator}</dd>
          <dt className="font-medium">Licence</dt>
          <dd>
            <a className="text-link" href={c.licenceUrl} target="_blank" rel="noopener noreferrer">
              Creative Commons Attribution 4.0 ({c.licence})
              <ExternalLink className="ml-1 inline size-3.5" aria-hidden />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </dd>
          <dt className="font-medium">Source</dt>
          <dd>
            <a className="text-link" href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
              {c.sourceName}
              <ExternalLink className="ml-1 inline size-3.5" aria-hidden />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            {c.originalSource && (
              <span className="text-muted-foreground"> · original source {c.originalSource}</span>
            )}
          </dd>
        </dl>

        <p className="rounded-2xl bg-tint p-3 text-sm">{attributionLine(c)}</p>
        <p className="text-sm text-muted-foreground">
          The words are unchanged except for spacing. The pictures are the edition’s own, resized
          and re-saved for this app. Reading Buddy is not endorsed by African Storybook, its
          publishers or the creators.
        </p>
      </DialogContent>
    </Dialog>
  );
}

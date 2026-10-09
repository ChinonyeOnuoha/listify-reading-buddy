import { ExternalLink } from "lucide-react";
import { attributionLine, type StoryMeta } from "@/content/stories";

/** The credit, licence and source information a story's licence asks for. Shared by every place that shows it. */
export function StoryCredits({ story }: { story: StoryMeta }) {
  const c = story.credit;
  const ext = <span className="sr-only"> (opens in a new tab)</span>;
  return (
    <>
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
            {ext}
          </a>
        </dd>
        <dt className="font-medium">Source</dt>
        <dd>
          <a className="text-link" href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
            {c.sourceName}
            <ExternalLink className="ml-1 inline size-3.5" aria-hidden />
            {ext}
          </a>
          {c.originalSource && (
            <span className="text-muted-foreground"> · original source {c.originalSource}</span>
          )}
        </dd>
      </dl>

      <p className="rounded-2xl bg-tint p-3 text-sm">{attributionLine(c)}</p>
      <p className="text-sm text-muted-foreground">
        The words are unchanged except for spacing. The pictures are the edition’s own, resized and
        re-saved for this app. Reading Buddy is not endorsed by African Storybook, its publishers or
        the creators.
      </p>
    </>
  );
}

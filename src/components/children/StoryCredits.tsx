import { ExternalLink } from "lucide-react";
import type { StoryMeta } from "@/content/stories";

/**
 * The credit, licence and source information a story's licence and source ask for, plus what this app changed.
 * Shared by every place that shows it. For Book Dash stories it also shows the Book Dash logo, which Book Dash asks for.
 */
export function StoryCredits({ story }: { story: StoryMeta }) {
  const c = story.credit;
  const ext = <span className="sr-only"> (opens in a new tab)</span>;
  return (
    <>
      <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
        {c.people.map(([role, names]) => (
          <div key={role + names} className="contents">
            <dt className="font-medium">{role}</dt>
            <dd>{names}</dd>
          </div>
        ))}
        {c.copyright && (
          <>
            <dt className="font-medium">Copyright</dt>
            <dd>{c.copyright}</dd>
          </>
        )}
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
          <a className="text-link" href={c.source.url} target="_blank" rel="noopener noreferrer">
            {c.source.name}
            <ExternalLink className="ml-1 inline size-3.5" aria-hidden />
            {ext}
          </a>
          {c.originalSource && (
            <span className="text-muted-foreground"> · original source {c.originalSource}</span>
          )}
        </dd>
      </dl>

      <p className="rounded-2xl bg-tint p-3 text-sm">{c.attribution}</p>

      {c.logo === "book-dash" && (
        <a
          className="inline-flex min-h-11 items-center gap-3 rounded-xl text-sm"
          href="https://bookdash.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="/credits/book-dash-logo.svg"
            alt="Book Dash"
            width={108}
            height={54}
            className="h-10 w-auto rounded-md bg-white p-1"
          />
          <span className="text-link">
            Book Dash — www.bookdash.org
            <ExternalLink className="ml-1 inline size-3.5" aria-hidden />
            {ext}
          </span>
        </a>
      )}

      {c.acknowledgements.length > 0 && (
        <div className="text-sm">
          <p className="font-medium">Also credited in the book</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {c.acknowledgements.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        <p className="font-medium text-foreground">What was changed for this app</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {c.changes.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p className="mt-2">
          Reading Buddy is not endorsed by {c.source.name}, the publishers or the creators.
        </p>
      </div>
    </>
  );
}

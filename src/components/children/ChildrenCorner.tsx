import { useEffect } from "react";
import { PassageView } from "@/components/reading/PassageView";
import { ReadStep } from "@/components/reading/ReadStep";
import { getStory } from "@/content/stories";
import { ChildReview } from "./ChildReview";
import { ChooseScreen } from "./ChooseScreen";
import { StoryReader } from "./StoryReader";
import type { ChildSession } from "./useChildSession";

type Props = {
  s: ChildSession;
  onDone: () => void;
  onReserveBar: (px: number) => void;
  onReserveDock: (px: number) => void;
};

/**
 * The children's reading corner: choose → read → listen back. It reuses the adult flow's recorder screen and content step;
 * the only differences are the passage area (illustrated stories) and that there is no timed target.
 */
export function ChildrenCorner({ s, onDone, onReserveBar, onReserveDock }: Props) {
  const story = s.source?.kind === "story" ? getStory(s.source.slug) : null;
  const { view } = s;

  // Each screen starts at the top and hands focus to its heading (keyboard and screen-reader users land on the new screen).
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("child-h")?.focus({ preventScroll: true });
  }, [view]);

  if (view === "review") return <ChildReview s={s} onDone={onDone} />;

  if (view === "read" && s.source) {
    const own = s.source.kind === "own";
    return (
      <>
        {own && (
          <h1 id="child-h" tabIndex={-1} className="sr-only outline-none">
            Your story
          </h1>
        )}
        <ReadStep
          target={null}
          passageLabel={own ? "Your story" : (story?.title ?? "Your story")}
          backLabel={own ? "Change your story" : "Choose a story"}
          passage={
            own ? (
              <PassageView
                text={s.mode === "paste" ? s.text : undefined}
                images={s.mode === "upload" ? s.images : undefined}
                page={s.readPage}
                onPage={s.setReadPage}
              />
            ) : story ? (
              <StoryReader
                story={story}
                textSize={s.textSize}
                onTextSize={s.setTextSize}
                page={s.readPage}
                onPage={s.setReadPage}
              />
            ) : null
          }
          recState={s.rec.state}
          micError={s.rec.micError}
          problem={s.rec.problem}
          elapsed={s.rec.elapsed}
          takeDuration={s.rec.take ? s.rec.take.duration : null}
          onStart={() => void s.rec.start()}
          onPause={s.rec.pause}
          onResume={s.rec.resume}
          onPreview={s.rec.previewSoFar}
          onFinish={s.rec.finish}
          onUpload={s.rec.upload}
          onBack={() => {
            s.setTab(own ? "own" : "pick");
            s.setView("choose");
          }}
          onReview={() => s.setView("review")}
          onReserve={onReserveDock}
        />
      </>
    );
  }

  return <ChooseScreen s={s} onReserveBar={onReserveBar} />;
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Lock, LogOut } from "lucide-react";
import { BookMark } from "@/components/reading/BookMark";
import { ContinueBar } from "@/components/reading/ContinueBar";
import { PrepareStep, type InputMode, type PageImage } from "@/components/reading/PrepareStep";
import { ReadStep } from "@/components/reading/ReadStep";
import { ReviewStep } from "@/components/reading/ReviewStep";
import { SampleSession, type SampleStage } from "@/components/reading/SampleSession";
import { TargetCard } from "@/components/reading/TargetCard";
import { useRecorder } from "@/components/reading/useRecorder";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reading Buddy — read aloud, kindly" },
      { name: "description", content: "Make a little time to read aloud: bring a passage, record yourself reading, then listen back." },
      { property: "og:title", content: "Reading Buddy" },
      { property: "og:description", content: "A warm companion for making time to read aloud." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type View = "prepare" | "read" | "review";

function Index() {
  // The visitor's own session. The sample session below never reads or writes any of this.
  const [view, setView] = useState<View>("prepare");
  const [target, setTarget] = useState<number | null>(null);
  const [mode, setMode] = useState<InputMode>(null);
  const [text, setText] = useState("");
  const [images, setImages] = useState<PageImage[]>([]);
  const rec = useRecorder(() => setView("review"));

  // Sample walkthrough: separate state; exiting returns to the preserved setup.
  const [sample, setSample] = useState<SampleStage | null>(null);

  // Usable content only: non-whitespace text, or at least one successfully loaded page.
  const canContinue = (mode === "paste" && text.trim().length > 0) || (mode === "upload" && images.length > 0);

  // Pasted text only switches to the "ready" layout after a paste or when the reader leaves the field —
  // never on the first typed character.
  const [pasteDone, setPasteDone] = useState(false);
  const textRef = useRef(text);
  textRef.current = text;
  useEffect(() => {
    if (!text.trim()) setPasteDone(false); // all text removed → back to the empty paste state
  }, [text]);

  // "Change content" reopens the choices; Cancel returns to the method that was showing.
  const [changing, setChanging] = useState(false);
  const modeAtChange = useRef<InputMode>(null);
  const readyFor = (m: InputMode) =>
    (m === "upload" && images.length > 0) || (m === "paste" && !!text.trim() && pasteDone);
  const contentReady = readyFor(mode);
  const collapsed = contentReady && !changing;

  const selectMode = (m: Exclude<InputMode, null>) => {
    setMode(m);
    if (changing && readyFor(m)) setChanging(false);
  };
  const commitPaste = () => {
    if (!textRef.current.trim()) return;
    setPasteDone(true);
    setChanging(false);
  };

  // Space the fixed Continue bar needs at the bottom of the page.
  const [barSpace, setBarSpace] = useState(0);
  const showBar = view === "prepare" && !sample && canContinue;

  // Each view and sample stage starts at the top; the sticky header stays put.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, sample]);

  // When the target is first set, keyboard and screen-reader users land on the newly revealed card.
  const hadTarget = useRef(false);
  useEffect(() => {
    if (target !== null && !hadTarget.current) document.getElementById("content-h")?.focus();
    hadTarget.current = target !== null;
  }, [target]);

  const newSession = () => {
    rec.clear();
    images.forEach((i) => URL.revokeObjectURL(i.url));
    setImages([]);
    setText("");
    setMode(null);
    setChanging(false);
    setView("prepare");
  };

  return (
    <>
      {/* Compact, opaque, sticky logo header. */}
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
          <div className="flex items-center gap-2 text-primary">
            {/* Compact serif monogram: the B tucks slightly under the R, both stay readable. */}
            <span className="font-logo flex items-baseline text-[1.75rem] leading-none" aria-hidden>
              <span>R</span>
              <span className="-ml-[0.14em]">B</span>
            </span>
            <BookMark className="h-6 w-8" />
            <span className="sr-only">Reading Buddy</span>
          </div>
          {sample && (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="rounded-md bg-peach px-2.5 py-1 text-sm font-medium">Sample session</span>
              <button className="btn-quiet -mr-3" onClick={() => setSample(null)}>
                <LogOut className="size-4" aria-hidden /> Exit sample
              </button>
            </div>
          )}
        </div>
      </header>

      <main
        className={`mx-auto flex flex-col gap-4 px-4 py-8 sm:px-6 sm:py-12 lg:gap-6 ${
          (sample ? sample === "read" : view === "read") ? "max-w-6xl" : "max-w-3xl"
        }`}
        // Reserve room for the fixed Continue bar so it never covers previews, editing controls or helper text.
        style={showBar && barSpace ? { paddingBottom: barSpace + 24 } : undefined}
      >
        {sample ? (
          <SampleSession stage={sample} setStage={setSample} onStartMine={() => setSample(null)} />
        ) : (
          <>
            {view === "prepare" && (
              <>
                {contentReady ? (
                  <header className="text-center">
                    <h1 className="text-[1.75rem] font-semibold sm:text-[2.125rem]">Your reading is ready</h1>
                  </header>
                ) : (
                  <header className="text-center">
                    <h1 className="text-[1.75rem] font-semibold sm:text-[2.125rem]">What are you reading today?</h1>
                    <p className="mt-2 text-muted-foreground">Make a little time to read aloud. I'll keep you company.</p>
                  </header>
                )}

                <TargetCard target={target} onSet={setTarget} compact={contentReady} />

                {target !== null && (
                  <PrepareStep
                    mode={mode}
                    onSelectMode={selectMode}
                    text={text}
                    setText={setText}
                    images={images}
                    setImages={setImages}
                    collapsed={collapsed}
                    changing={changing}
                    onChangeContent={() => {
                      modeAtChange.current = mode;
                      setChanging(true);
                    }}
                    onCancelChange={() => {
                      setMode(modeAtChange.current);
                      setChanging(false);
                    }}
                    onPasteCommit={commitPaste}
                    onPagesAdded={() => setChanging(false)}
                  />
                )}

                <p className="mt-2 text-center text-muted-foreground">
                  Just exploring?{" "}
                  <button className="text-link inline-flex items-center gap-1" onClick={() => setSample("read")}>
                    Try a sample session <ArrowRight className="size-4" aria-hidden />
                  </button>
                </p>
              </>
            )}

            {view === "read" && mode && target !== null && (
              <ReadStep
                mode={mode}
                text={text}
                images={images}
                target={target}
                recording={rec.recording}
                micError={rec.micError}
                elapsed={rec.recording ? rec.elapsed : 0}
                takeDuration={rec.take ? rec.take.duration : null}
                onStart={rec.start}
                onStop={rec.stop}
                onUpload={rec.upload}
                onBack={() => setView("prepare")}
                onReview={() => setView("review")}
              />
            )}

            {view === "review" && target !== null && (
              <ReviewStep
                take={rec.take}
                target={target}
                onBack={() => setView("read")}
                onDiscard={() => {
                  rec.clear();
                  setView("read");
                }}
                onNewSession={newSession}
              />
            )}
          </>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Lock className="mr-1.5 -mt-0.5 inline size-4" aria-hidden />
          Your passage, pages and recordings stay in this browser tab and are never uploaded.
        </p>
      </main>

      {showBar && (
        <ContinueBar
          status={mode === "upload" ? `${images.length} ${images.length === 1 ? "page" : "pages"} ready` : "Passage ready"}
          onContinue={() => setView("read")}
          onReserve={setBarSpace}
        />
      )}
    </>
  );
}

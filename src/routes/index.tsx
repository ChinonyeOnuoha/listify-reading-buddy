import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Lock, LogOut } from "lucide-react";
import { BookMark } from "@/components/reading/BookMark";
import { ContinueBar } from "@/components/reading/ContinueBar";
import { PrepareStep, type InputMode, type PageImage } from "@/components/reading/PrepareStep";
import { ReadStep } from "@/components/reading/ReadStep";
import { ReviewStep } from "@/components/reading/ReviewStep";
import { SampleFeedback } from "@/components/reading/SampleFeedback";
import { SampleSession, type SampleStage } from "@/components/reading/SampleSession";
import { SessionDialog } from "@/components/reading/SessionDialog";
import { TargetCard } from "@/components/reading/TargetCard";
import { formatTime, useRecorder } from "@/components/reading/useRecorder";
import { usePwa } from "@/lib/pwa";

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

/** "home" is the welcome screen shown while a session exists (with Resume session); "samples" is sample feedback. */
type View = "home" | "prepare" | "read" | "review" | "samples";
type Place = Exclude<View, "home">;

const pauseAllAudio = () => document.querySelectorAll("audio").forEach((a) => a.pause());

function Index() {
  // The visitor's own session, kept in this tab's memory only. The sample session never reads or writes any of it.
  const [view, setView] = useState<View>("prepare");
  const [resumeTo, setResumeTo] = useState<Place>("prepare");
  const [target, setTarget] = useState<number | null>(null);
  const [mode, setMode] = useState<InputMode>(null);
  const [text, setText] = useState("");
  const [images, setImages] = useState<PageImage[]>([]);
  const rec = useRecorder(() => setView("review"));
  const pwa = usePwa();
  // Installed or not, the session lives in memory only — wording follows where it's running.
  const place = pwa.standalone ? "app" : "tab";

  // Bumped when the session is discarded, so uploads still decoding can't bring discarded pages back.
  const sessionGen = useRef(0);
  const isCurrentSession = useCallback((g: number) => g === sessionGen.current, []);

  const hasSession = target !== null || !!text.trim() || images.length > 0 || !!rec.take || rec.unfinished;

  // Review playback position, kept while visiting sample feedback (reset for a new recording).
  const [reviewPos, setReviewPos] = useState(0);
  useEffect(() => setReviewPos(0), [rec.take?.url]);

  // Sample feedback is its own screen with a browser-history entry, so Back returns to Review with nothing lost.
  const openSamples = () => {
    window.history.pushState({ rb: "samples" }, "");
    setView("samples");
  };
  const leaveSamples = () => {
    if ((window.history.state as { rb?: string } | null)?.rb === "samples") window.history.back();
    else setView("review");
  };
  useEffect(() => {
    const onPop = () => setView((v) => (v === "samples" ? "review" : v));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // Focus the new screen's heading when moving between Review and sample feedback.
  const prevView = useRef<View>(view);
  useEffect(() => {
    if (view === "samples") document.getElementById("samples-h")?.focus();
    if (view === "review" && prevView.current === "samples") document.getElementById("review-h")?.focus();
    prevView.current = view;
  }, [view]);

  // Sample walkthrough: separate state; exiting it never touches the personal session.
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
  // Space the phone recording dock needs at the bottom of the reading screen.
  const [dockSpace, setDockSpace] = useState(0);
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

  // ---- Logo: go home without clearing anything -------------------------------------------------------------
  const logoRef = useRef<HTMLButtonElement>(null);
  const [homeDialog, setHomeDialog] = useState<null | "confirm" | "failed">(null);
  const [stopping, setStopping] = useState(false);

  const goHome = () => {
    pauseAllAudio();
    if (view !== "home") setResumeTo(view);
    setView(hasSession ? "home" : "prepare");
  };
  const onLogo = () => {
    if (sample) {
      setSample(null); // leave the sample; the personal session is untouched
      if (view !== "home") setResumeTo(view);
      setView(hasSession ? "home" : "prepare");
      return;
    }
    if (rec.unfinished) return setHomeDialog("confirm");
    goHome();
  };
  const stopAndGoHome = async () => {
    if (homeDialog === "failed") {
      setHomeDialog(null);
      goHome();
      return;
    }
    setStopping(true);
    const kept = await rec.finishQuietly(); // finishes (recording or paused), keeps the audio, releases the mic
    setStopping(false);
    if (!kept) return setHomeDialog("failed"); // explain before navigating away
    setHomeDialog(null);
    pauseAllAudio();
    setResumeTo("review"); // Resume opens the finished recording — it never restarts recording
    setView("home");
  };

  // ---- Exit session: the one explicit way to discard ---------------------------------------------------------
  const exitRef = useRef<HTMLButtonElement>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [focusWelcome, setFocusWelcome] = useState(false);

  const discardSession = () => {
    sessionGen.current += 1;
    rec.discard(); // stops recording without keeping it, releases the mic, revokes audio
    pauseAllAudio();
    images.forEach((i) => URL.revokeObjectURL(i.url));
    setImages([]);
    setText("");
    setMode(null);
    setTarget(null);
    setPasteDone(false);
    setChanging(false);
    setResumeTo("prepare");
    setHomeDialog(null);
    hadTarget.current = false;
    setView("prepare");
    setExitOpen(false);
    setFocusWelcome(true); // the Exit button is gone, so focus the fresh welcome heading
  };
  useEffect(() => {
    if (!focusWelcome) return;
    document.getElementById("welcome-h")?.focus();
    setFocusWelcome(false);
  }, [focusWelcome]);

  // Review's "Start a new session" keeps the target (as before) and clears content and audio.
  const newSession = () => {
    rec.clear();
    images.forEach((i) => URL.revokeObjectURL(i.url));
    setImages([]);
    setText("");
    setMode(null);
    setChanging(false);
    setView("prepare");
  };

  const summary = [
    target !== null && `${target} min target`,
    images.length > 0 && `${images.length} ${images.length === 1 ? "page" : "pages"}`,
    !!text.trim() && "pasted text",
    rec.take && `recording ${formatTime(rec.take.duration)}`,
  ].filter(Boolean);

  const welcome = (
    <header className="text-left sm:text-center">
      <h1 id="welcome-h" tabIndex={-1} className="welcome-serif text-[1.875rem] leading-tight text-heading outline-none sm:text-[2.375rem]">
        What shall we read aloud together today?
      </h1>
    </header>
  );

  return (
    <>
      {/* Compact, opaque, sticky header: the logo goes home; Exit session / Exit sample sit on the right. */}
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        {/* Slimmer on short screens (landscape phones) so the reading area isn't squeezed between header and dock. */}
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8 [@media(max-height:480px)]:h-12">
          <button ref={logoRef} onClick={onLogo} className="-ml-2 flex items-center gap-2 rounded-lg px-2 py-1 text-primary hover:bg-tint" aria-label="Reading Buddy home">
            {/* Compact serif monogram: the B tucks slightly under the R, both stay readable. */}
            <span className="font-logo flex items-baseline text-[1.75rem] leading-none" aria-hidden>
              <span>R</span>
              <span className="-ml-[0.14em]">B</span>
            </span>
            <BookMark className="h-6 w-8" />
          </button>
          {sample ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="rounded-md bg-peach px-2.5 py-1 text-sm font-medium">Sample session</span>
              <button className="btn-quiet -mr-3" onClick={() => setSample(null)}>
                <LogOut className="size-4" aria-hidden /> Exit sample
              </button>
            </div>
          ) : (
            hasSession && (
              <button ref={exitRef} className="btn-quiet -mr-3 text-sm font-normal text-muted-foreground hover:text-primary" onClick={() => setExitOpen(true)}>
                <LogOut className="size-4" aria-hidden /> Exit session
              </button>
            )
          )}
        </div>
      </header>

      <main
        className={`mx-auto flex flex-col gap-4 px-4 py-8 sm:px-6 sm:py-12 lg:gap-6 ${
          (sample ? sample === "read" : view === "read") ? "max-w-6xl" : "max-w-3xl"
        }`}
        // Reserve room for the fixed Continue bar so it never covers previews, editing controls or helper text.
        style={
          showBar && barSpace
            ? { paddingBottom: barSpace + 24 }
            : view === "read" && !sample && dockSpace
              ? { paddingBottom: dockSpace + 16 }
              : undefined
        }
      >
        {!pwa.online && (
          <p role="status" className="rounded-2xl border border-border bg-card px-4 py-2 text-sm">
            You're offline. Reading Buddy still works in this {place}.
          </p>
        )}
        {/* A new version is only offered when nothing would be lost by reloading. */}
        {pwa.updateReady && !sample && !hasSession && (view === "prepare" || view === "home") && (
          <p role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm">
            A new version of Reading Buddy is ready.
            <button className="text-link" onClick={pwa.applyUpdate}>
              Update now
            </button>
          </p>
        )}

        {sample ? (
          <SampleSession stage={sample} setStage={setSample} onStartMine={() => setSample(null)} />
        ) : (
          <>
            {view === "home" && (
              <>
                {welcome}
                <section className="card reveal" aria-labelledby="resume-h">
                  <h2 id="resume-h" className="text-xl font-medium">
                    Your session is waiting
                  </h2>
                  {summary.length > 0 && <p className="mt-1 text-muted-foreground">{summary.join(" · ")}</p>}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pwa.standalone ? "Closing the app clears it." : "Closing or reloading this tab clears it."}
                  </p>
                  <button className="btn-primary mt-6 w-full sm:w-auto" onClick={() => setView(resumeTo)}>
                    Resume session <ArrowRight className="size-[18px]" aria-hidden />
                  </button>
                </section>
              </>
            )}

            {view === "prepare" && (
              <>
                {contentReady ? <h1 className="sr-only">Your reading</h1> : welcome}

                <TargetCard target={target} onSet={setTarget} />

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
                    generation={sessionGen.current}
                    isCurrentSession={isCurrentSession}
                  />
                )}

                {/* Fixed to the bottom normally; while a phone keyboard is open it sits here, right under the content. */}
                {showBar && <ContinueBar onContinue={() => setView("read")} onReserve={setBarSpace} />}
              </>
            )}

            {(view === "prepare" || view === "home") && (
              <p className="mt-2 text-center text-muted-foreground">
                Just exploring?{" "}
                <button className="text-link inline-flex items-center gap-1" onClick={() => setSample("read")}>
                  Try a sample session <ArrowRight className="size-4" aria-hidden />
                </button>
              </p>
            )}

            {view === "read" && mode && target !== null && (
              <ReadStep
                mode={mode}
                text={text}
                images={images}
                target={target}
                recState={rec.state}
                micError={rec.micError}
                problem={rec.problem}
                elapsed={rec.elapsed}
                takeDuration={rec.take ? rec.take.duration : null}
                onStart={() => void rec.start()}
                onPause={rec.pause}
                onResume={rec.resume}
                onPreview={rec.previewSoFar}
                onFinish={rec.finish}
                onUpload={rec.upload}
                onBack={() => setView("prepare")}
                onReview={() => setView("review")}
                onReserve={setDockSpace}
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
                onExploreSamples={openSamples}
                startAt={reviewPos}
                onPosition={setReviewPos}
              />
            )}

            {view === "samples" && (
              <>
                <div>
                  <button className="btn-quiet -ml-3" onClick={leaveSamples}>
                    <ArrowLeft className="size-4" aria-hidden /> Back to recording
                  </button>
                  <h1 id="samples-h" tabIndex={-1} className="mt-3 text-left text-[1.75rem] font-semibold outline-none sm:text-center sm:text-[2.125rem]">
                    Sample feedback
                  </h1>
                </div>
                <SampleFeedback />
              </>
            )}
          </>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Lock className="mr-1.5 -mt-0.5 inline size-4" aria-hidden />
          {pwa.standalone
            ? "Your passage, pages and recordings stay in this app only while it's open, and are never uploaded."
            : "Your passage, pages and recordings stay in this browser tab and are never uploaded."}
        </p>

        {/* Understated install option on the welcome screens only; hidden once installed. */}
        {!sample && (view === "prepare" || view === "home") && !pwa.standalone && (pwa.canInstall || pwa.ios) && (
          <div className="-mt-2 text-center text-sm text-muted-foreground">
            {pwa.canInstall ? (
              <button className="text-link" onClick={() => void pwa.install()}>
                Install Reading Buddy
              </button>
            ) : (
              <details className="inline-block text-left">
                <summary className="text-link cursor-pointer list-none text-center">Install Reading Buddy</summary>
                <p className="mt-2 max-w-xs">In Safari, tap Share, then “Add to Home Screen”. Sessions still clear when the app is closed.</p>
              </details>
            )}
          </div>
        )}
      </main>


      <SessionDialog
        open={homeDialog !== null}
        onOpenChange={(o) => !o && setHomeDialog(null)}
        title={homeDialog === "failed" ? "The recording couldn't be kept" : "Return home?"}
        cancelLabel={homeDialog === "failed" ? "Stay here" : rec.state === "paused" ? "Stay here" : "Keep recording"}
        confirmLabel={homeDialog === "failed" ? "Go home anyway" : "Finish and go home"}
        onConfirm={() => void stopAndGoHome()}
        busy={stopping}
        returnFocus={logoRef}
      >
        {homeDialog === "failed" ? (
          <p>
            {rec.problem ?? "No audio was captured, so there's nothing to keep."} Your target and content are still here.
          </p>
        ) : (
          <p>
            Going home will finish your {rec.state === "paused" ? "paused " : ""}recording and keep it. Your recording and session will stay available in this{" "}
            {place}.
          </p>
        )}
      </SessionDialog>

      <SessionDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        title="Leave this session?"
        cancelLabel="Stay in session"
        confirmLabel="Leave and discard"
        onConfirm={discardSession}
        returnFocus={exitRef}
      >
        <p>Your reading target, added content and any recording will be cleared. This can't be undone.</p>
        {rec.unfinished && (
          <p className="font-medium text-foreground">
            {rec.state === "paused" ? "You have a paused recording — leaving will discard it." : "You're recording right now — leaving will stop and discard it."}
          </p>
        )}
      </SessionDialog>
    </>
  );
}

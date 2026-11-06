import { createFileRoute } from "@tanstack/react-router";
import { AiFeedback, TurnOnPanel } from "@/components/app/AiFeedback";
import { useAiFeedback } from "@/components/app/useAiFeedback";
import { aiFeedbackConfigured } from "@/lib/ai-feedback/config";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FolderClosed, Volume2, VolumeX } from "lucide-react";
import { BookMark } from "@/components/reading/BookMark";
import { InstallButton } from "@/components/reading/InstallButton";
import { formatTime, type AudioTake } from "@/components/reading/useRecorder";
import { AboutStory } from "@/components/children/AboutStory";
import { StoryReader } from "@/components/children/StoryReader";
import { Nook } from "@/components/nook/Nook";
import { BringStep } from "@/components/app/BringStep";
import { PagesView, Pager, PassageText, ReaderFrame, TextSize } from "@/components/app/Reader";
import { Recorder } from "@/components/app/Recorder";
import {
  AdultReview,
  KidReview,
  type Feeling,
  type KidResponseAction,
} from "@/components/app/Review";
import { SamplePanel } from "@/components/app/Sample";
import { SavedPanel, type SavedItem } from "@/components/app/Saved";
import { ColourStep, HomePanel, ReadyPanel, TimeStep } from "@/components/app/setup";
import { KidTabs, StoriesStep, type LengthFilter } from "@/components/app/Stories";
import { Confirm, Modal, Toast, type ToastMessage } from "@/components/app/ui";
import { getStory, readingWords, type StoryTheme } from "@/content/stories";
import { askToKeepStorage, formatBytes } from "@/lib/device-store";
import { colourName, useNookMemory } from "@/lib/nook-memory";
import { shouldOfferUpdate, usePwa } from "@/lib/pwa";
import { useReadingSession, type ReadingSession, type Snapshot } from "@/lib/reading-session";
import { playCue, type Cue } from "@/lib/sound";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reading Buddy — practise reading aloud" },
      {
        name: "description",
        content: aiFeedbackConfigured()
          ? "Build a quiet reading nook, read aloud, record yourself and listen back. A children’s corner has picture stories. Everything stays on your device, unless an adult chooses optional AI feedback for a recording."
          : "Build a quiet reading nook, read aloud, record yourself and listen back. A children’s corner has picture stories. Everything stays on your device.",
      },
      { property: "og:title", content: "Reading Buddy — practise reading aloud" },
      {
        property: "og:description",
        content: aiFeedbackConfigured()
          ? "Read aloud, record yourself and listen back, in a calm night-time reading nook, with optional AI feedback for adults."
          : "Read aloud, record yourself and listen back, in a calm night-time reading nook. AI feedback is not connected yet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Corner = "home" | "adult" | "kid" | "sample" | "saved";
type Screen = "time" | "bring" | "cushion" | "stories" | "ready" | "read" | "review";
type Pending =
  | { kind: "leave"; then: () => void }
  | { kind: "deleteAll" }
  | { kind: "forget" }
  | { kind: "deleteNotes" };

const pauseAllAudio = () => document.querySelectorAll("audio").forEach((a) => a.pause());
/** WAV at 16 kHz, 16-bit mono: about 32 KB a second. Used to size a recording in Saved. */
const recordingBytes = (t: AudioTake | null) => (t ? Math.round(t.duration * 32000) : 0);

function Index() {
  const { nook, loaded: nookLoaded, update: setNook, forget: forgetNook } = useNookMemory();
  const [corner, setCorner] = useState<Corner>("home");
  const [screen, setScreen] = useState<Screen>("time");
  const [editing, setEditing] = useState(false);
  const [lampOn, setLampOn] = useState(false);
  const [kidLampOn, setKidLampOn] = useState(false);
  const [preview, setPreview] = useState<{
    cushion?: string;
    beanbag?: string;
    minutes?: number | null;
  }>({});
  const [kidTab, setKidTab] = useState<"pick" | "own">("pick");
  const [filter, setFilter] = useState<"all" | StoryTheme>("all");
  const [lengthFilter, setLengthFilter] = useState<LengthFilter | null>(null);
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [reviewPos, setReviewPos] = useState({ main: 0, children: 0 });
  const [textSize, setTextSize] = useState({ main: 2, children: 2 });
  const [sample, setSample] = useState<{ step: 1 | 2 | 3; note: number }>({ step: 1, note: 0 });
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [micFor, setMicFor] = useState<ReadingSession | null>(null);
  const [aiPage, setAiPage] = useState(false);
  // Typing a passage on a phone: the keyboard takes half the screen, so the nook stops being pinned meanwhile.
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const on = (e: FocusEvent) => {
      const box = e.target instanceof HTMLTextAreaElement ? e.target : null;
      setTyping(!!box);
      // Unpinning moves the text box in the page; keep it in view.
      if (box) window.setTimeout(() => box.scrollIntoView?.({ block: "nearest" }), 50);
    };
    const off = () => setTyping(false);
    document.addEventListener("focusin", on);
    document.addEventListener("focusout", off);
    return () => {
      document.removeEventListener("focusin", on);
      document.removeEventListener("focusout", off);
    };
  }, []);
  const pwa = usePwa();

  const toReview = useCallback(() => setScreen("review"), []);
  const main = useReadingSession("main", toReview);
  const child = useReadingSession("children", toReview);
  const kid = corner === "kid";
  const s = kid ? child : main;
  // Optional AI feedback compares the main practice's recording with the words read: pasted text, or photographed
  // pages that all have their words added. Never used in the children's corner.
  const mainWords =
    main.mode === "paste"
      ? main.text.trim()
      : main.mode === "upload" && main.pages.length && main.pages.every((p) => p.words?.trim())
        ? main.pages.map((p) => p.words!.trim()).join(" ")
        : "";
  const ai = useAiFeedback(main.rec.take, mainWords || null, main.rec.attachNotes);

  const say = (text: string, undo?: () => void, onExpire?: () => void) => {
    setToast((prev) => {
      prev?.onExpire?.(); // a message being replaced is final
      return { id: Date.now(), text, undo, onExpire };
    });
  };
  const sound = (cue: Cue) => {
    if (nook.sound && !main.rec.unfinished && !child.rec.unfinished) playCue(cue);
  };

  // ---- Lamp and lantern: the last thing to happen when setup is done -----------------------------------------------
  const lightTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(lightTimer.current), []);
  const light = (which: "lamp" | "lantern") => {
    window.clearTimeout(lightTimer.current);
    const set = which === "lamp" ? setLampOn : setKidLampOn;
    set(false);
    lightTimer.current = window.setTimeout(() => {
      set(true);
      sound(which);
    }, 450);
    setNook({ remembered: true });
  };

  // ---- Where each corner starts, given what is already remembered ----------------------------------------------------
  const go = (to: Screen, opts: { editing?: boolean } = {}) => {
    setEditing(!!opts.editing);
    setPreview({});
    setAiPage(false);
    setScreen(to);
  };
  const resolveAdult = () => {
    if (nook.minutes === null) return go("time");
    if (!main.hasContent) return go("bring");
    if (!nook.cushionAsked) return go("cushion");
    go("ready");
    if (!lampOn) light("lamp");
  };
  const resolveKid = (patch: { source?: boolean } = {}) => {
    if (!nook.kidTimeAsked) return go("time");
    if (!nook.beanbag) return go("cushion");
    if (!(patch.source ?? !!child.source)) return go(kidTab === "own" ? "bring" : "stories");
    go("ready");
    if (!kidLampOn) light("lantern");
  };
  // After a step is saved: back to the summary when editing, otherwise on to whatever is still unset.
  const afterStep = (k: "adult" | "kid") => {
    if (editing) return go("ready");
    if (k === "adult") resolveAdult();
    else resolveKid();
  };
  // resolve* read the latest remembered values, so steps update the nook first and resolve on the next render.
  const [advance, setAdvance] = useState<null | "adult" | "kid">(null);
  useEffect(() => {
    if (!advance) return;
    setAdvance(null);
    afterStep(advance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advance]);

  // ---- Leaving: never lose a recording in progress --------------------------------------------------------------------
  const guard = (then: () => void) => {
    if (s.rec.unfinished && (corner === "adult" || corner === "kid"))
      return setPending({ kind: "leave", then });
    then();
  };
  const finishAndLeave = async () => {
    if (pending?.kind !== "leave") return;
    setBusy(true);
    await s.rec.finishQuietly();
    setBusy(false);
    const then = pending.then;
    setPending(null);
    then();
  };

  // Entering a corner adds a history entry, so the browser's Back returns home.
  const enter = (c: Exclude<Corner, "home">, start: () => void) => {
    pauseAllAudio();
    if (corner === "home") window.history.pushState({ rb: c }, "");
    else window.history.replaceState({ rb: c }, "");
    setCorner(c);
    start();
  };
  const toHome = () => {
    pauseAllAudio();
    setEditing(false);
    setCorner("home");
    if ((window.history.state as { rb?: string } | null)?.rb) window.history.replaceState(null, "");
  };
  const home = () => guard(toHome);
  const cornerRef = useRef(corner);
  cornerRef.current = corner;
  const unfinishedRef = useRef(false);
  unfinishedRef.current = main.rec.unfinished || child.rec.unfinished;
  useEffect(() => {
    const onPop = () => {
      if (cornerRef.current === "home") return;
      if (unfinishedRef.current) {
        window.history.pushState({ rb: cornerRef.current }, "");
        return setPending({ kind: "leave", then: toHome });
      }
      pauseAllAudio();
      setCorner("home");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Screens start at the top on narrow layouts, where the page itself scrolls.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [corner, screen, sample.step, aiPage]);

  // The first time something is saved, say where it lives.
  const hadTake = useRef({ main: false, children: false });
  useEffect(() => {
    for (const x of [main, child]) {
      const now = !!x.rec.take;
      if (now && !hadTake.current[x.key] && nookLoaded && !nook.savedNoteShown && x.loaded) {
        setNook({ savedNoteShown: true });
        askToKeepStorage();
        say("Saved on this device. You can delete it any time in Saved.");
      }
      hadTake.current[x.key] = now;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main.rec.take, child.rec.take]);

  // ---- Undoable deletes -----------------------------------------------------------------------------------------------
  const deleteSessionWithUndo = (x: ReadingSession, label: string) => {
    const snap: Snapshot = x.takeOut();
    if (x === child) setFeeling(null);
    say(
      `${label} deleted.`,
      () => x.putBack(snap),
      () => x.release(snap),
    );
  };
  const deleteRecording = (x: ReadingSession) => {
    // A recording with AI notes asks first: its notes go too, and that can't be undone.
    if (x.rec.take?.notes) return setPending({ kind: "deleteNotes" });
    const take = x.rec.detach();
    if (!take) return;
    go("read");
    say(
      "Recording deleted.",
      () => x.rec.restore(take),
      () => URL.revokeObjectURL(take.url),
    );
  };
  const removePage = (x: ReadingSession, i: number) => {
    const before = x.pages;
    const gone = before[i];
    if (!gone) return;
    x.setPages(before.filter((_, k) => k !== i));
    say(
      `Page ${i + 1} removed.`,
      () => x.setPages(before),
      () => URL.revokeObjectURL(gone.url),
    );
  };

  // ---- Microphone: explained once, then the browser asks ------------------------------------------------------------
  const startRecording = (x: ReadingSession) => {
    if (!nook.micExplained) return setMicFor(x);
    void x.rec.start();
  };

  // ---- Corners ----------------------------------------------------------------------------------------------------------
  const goAdult = () =>
    enter("adult", () => {
      setLampOn(false);
      resolveAdult();
    });
  const goKid = () =>
    enter("kid", () => {
      setKidLampOn(false);
      resolveKid();
    });
  const goSample = (step: 1 | 2 | 3 = 1) =>
    enter("sample", () => {
      setSample({ step, note: 0 });
    });
  const goSaved = () => guard(() => enter("saved", () => {}));
  // From Saved: open a reading's listen-back screen in its own corner.
  const openReview = (c: "adult" | "kid") =>
    enter(c, () => {
      if (c === "adult") setLampOn(true);
      else setKidLampOn(true);
      go("review");
    });

  // Choosing a different story (or own content) puts the kept recording aside, with Undo.
  const beginKid = (source: { kind: "story"; slug: string } | { kind: "own" }) => {
    const same =
      child.source?.kind === source.kind &&
      (source.kind === "own" ||
        (child.source?.kind === "story" && child.source.slug === source.slug));
    if (!same) {
      const prevSource = child.source;
      const prevPage = child.page;
      const take = child.rec.detach();
      setFeeling(null);
      child.setPage(0);
      if (take) {
        const name =
          prevSource?.kind === "story"
            ? `“${getStory(prevSource.slug)?.title ?? "the story"}”`
            : "your own story";
        say(
          `Your recording of ${name} was deleted.`,
          () => {
            child.setSource(prevSource);
            child.setPage(prevPage);
            child.rec.restore(take);
          },
          () => URL.revokeObjectURL(take.url),
        );
      }
    }
    child.setSource(source);
    if (editing) return go("ready");
    resolveKid({ source: true });
  };

  // ---- Scene ----------------------------------------------------------------------------------------------------------
  const sceneCushion = preview.cushion ?? nook.cushion;
  const sceneBeanbag = preview.beanbag ?? nook.beanbag;
  const scene = (
    <Nook
      focus={kid ? "child" : corner === "adult" ? "adult" : "home"}
      // Each corner's clock shows its own reading time: the grown-up's choice in the children's corner (or none).
      minutes={preview.minutes !== undefined ? preview.minutes : kid ? nook.kidMinutes : nook.minutes}
      reading={
        corner === "sample"
          ? "sample"
          : main.hasContent
            ? main.mode === "upload"
              ? "pages"
              : "text"
            : "none"
      }
      cushion={sceneCushion}
      lamp={lampOn}
      kidCushion={sceneBeanbag}
      kidBook={!!child.source}
      kidLamp={kidLampOn}
      shelf={(main.rec.take ? 1 : 0) + (child.rec.take ? 1 : 0)}
    />
  );

  // ---- Panels ----------------------------------------------------------------------------------------------------------
  const story = child.source?.kind === "story" ? getStory(child.source.slug) : null;
  const kidTitle = story ? story.title : "Your own story";
  const adultSub =
    nook.minutes !== null
      ? `${nook.minutes} minutes a day${nook.cushion ? ` · ${colourName(nook.cushion)} cushion` : ""}`
      : "Bring your own pages or text.";
  const kidSub = child.source
    ? `Carry on with ${kidTitle}`
    : "Eight picture stories, or bring your own.";
  const contentLabel = (x: ReadingSession) =>
    x.mode === "upload" && x.pages.length
      ? `${x.pages.length} photographed ${x.pages.length === 1 ? "page" : "pages"}`
      : x.text.trim()
        ? "Pasted passage"
        : "Nothing added yet";

  let panel: ReactNode = null;
  let wide = false;
  if (corner === "home") {
    panel = (
      <HomePanel
        welcomeBack={nook.remembered}
        adultSub={adultSub}
        kidSub={kidSub}
        onAdult={goAdult}
        onKid={goKid}
        onSample={() => goSample()}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {ai.configured
                ? "Saved on this device. Nothing is uploaded unless you ask for AI feedback on a recording."
                : "Saved on this device only. Nothing is uploaded."}
            </p>
            {!pwa.standalone && (
              <InstallButton
                canInstall={pwa.canInstall}
                ios={pwa.ios}
                onInstall={() => void pwa.install()}
              />
            )}
          </div>
        }
      />
    );
  } else if (corner === "sample") {
    wide = true;
    panel = (
      <SamplePanel
        step={sample.step}
        note={sample.note}
        onStep={(step) => setSample((x) => ({ ...x, step }))}
        onNote={(note) => setSample((x) => ({ ...x, note }))}
        onHome={toHome}
        onStartMine={goAdult}
      />
    );
  } else if (corner === "saved") {
    wide = true;
    const items: SavedItem[] = [];
    for (const [x, where] of [
      [main, "Main practice"],
      [child, "Children’s corner"],
    ] as const) {
      if (x.isEmpty) continue;
      const bytes = x.pages.reduce((n, p) => n + p.blob.size, 0) + recordingBytes(x.rec.take);
      const title = x === child ? (x.source ? kidTitle : contentLabel(x)) : contentLabel(x);
      const parts = [
        where,
        x.rec.take ? `recording ${formatTime(x.rec.take.duration)}` : "no recording yet",
      ];
      if (x.rec.take?.notes) parts.push("AI notes");
      if (bytes) parts.push(formatBytes(bytes));
      items.push({
        id: x.key,
        title,
        detail: parts.join(" · "),
        bytes,
        onDelete: () => deleteSessionWithUndo(x, `“${title}”`),
        onOpen: x.rec.take ? () => openReview(x === child ? "kid" : "adult") : undefined,
      });
    }
    const nookBits = [
      nook.minutes !== null && `${nook.minutes} min a day`,
      nook.cushion && `${colourName(nook.cushion)} cushion`,
      nook.beanbag && `${colourName(nook.beanbag)} beanbag`,
      nook.kidMinutes !== null && `${nook.kidMinutes} min in the corner`,
    ].filter(Boolean);
    panel = (
      <SavedPanel
        items={items}
        nookLine={nookBits.length ? nookBits.join(" · ") : "Nothing remembered yet."}
        hasNook={nook.remembered || nookBits.length > 0}
        onHome={toHome}
        onDeleteAll={() => setPending({ kind: "deleteAll" })}
        onForget={() => setPending({ kind: "forget" })}
      />
    );
  } else if (screen === "time") {
    panel = (
      <TimeStep
        key={`${corner}-time`}
        kid={kid}
        value={kid ? nook.kidMinutes : nook.minutes}
        editing={editing}
        step={1}
        onBack={() => (editing ? go("ready") : toHome())}
        onPreview={(m) => setPreview({ minutes: m })}
        onSave={(m) => {
          setNook(kid ? { kidMinutes: m, kidTimeAsked: true } : { minutes: m });
          sound("tick");
          setAdvance(kid ? "kid" : "adult");
        }}
      />
    );
  } else if (screen === "cushion") {
    panel = (
      <ColourStep
        key={`${corner}-colour`}
        kid={kid}
        value={kid ? nook.beanbag : nook.cushion}
        editing={editing}
        step={kid ? 2 : 3}
        onBack={() => (editing ? go("ready") : go(kid ? "time" : "bring"))}
        onPreview={(hex) => {
          setPreview(kid ? { beanbag: hex } : { cushion: hex });
          sound("cushion");
        }}
        onSave={(hex) => {
          setNook(kid ? { beanbag: hex } : { cushion: hex, cushionAsked: true });
          setAdvance(kid ? "kid" : "adult");
        }}
        onSkip={
          kid
            ? undefined
            : () => {
                setNook({ cushion: null, cushionAsked: true });
                setAdvance("adult");
              }
        }
      />
    );
  } else if (screen === "stories") {
    wide = true;
    panel = (
      <StoriesStep
        editing={editing}
        onBack={() => (editing ? go("ready") : go("cushion"))}
        onTab={(t) => {
          setKidTab(t);
          if (t === "own") {
            if (!child.mode) child.setMode("paste");
            setScreen("bring");
          }
        }}
        filter={filter}
        onFilter={setFilter}
        lengthFilter={lengthFilter}
        onClearLength={() => setLengthFilter(null)}
        onRead={(st) => beginKid({ kind: "story", slug: st.slug })}
      />
    );
  } else if (screen === "bring") {
    panel = (
      <BringStep
        key={corner}
        s={s}
        kid={kid}
        editing={editing}
        step={kid ? 3 : 2}
        title={kid ? "Bring a story you love" : "What are you reading today?"}
        lead={
          kid
            ? "Paste the words, or add photos of the pages. A grown-up can help."
            : "Paste a passage or add photos of your pages."
        }
        tabs={
          kid ? (
            <KidTabs
              tab="own"
              onTab={(t) => {
                setKidTab(t);
                if (t === "pick") setScreen("stories");
              }}
            />
          ) : undefined
        }
        nextLabel={kid ? "Light the lantern" : "Continue"}
        onBack={() => (editing ? go("ready") : kid ? go("cushion") : go("time"))}
        onNext={() => {
          if (kid) return beginKid({ kind: "own" });
          if (editing) return go("ready");
          resolveAdult();
        }}
        onRemovePage={(i) => removePage(s, i)}
        onSound={sound}
      />
    );
  } else if (screen === "ready") {
    const rows = kid
      ? [
          {
            label: "Reading time",
            value: nook.kidMinutes ? `${nook.kidMinutes} minutes` : "No time set",
            onChange: () => go("time", { editing: true }),
          },
          {
            label: "Beanbag",
            value: colourName(nook.beanbag) ?? "None",
            onChange: () => go("cushion", { editing: true }),
          },
          {
            label: "Story",
            value:
              child.source?.kind === "own"
                ? `Your own story · ${contentLabel(child).toLowerCase()}`
                : kidTitle,
            onChange: () =>
              go(child.source?.kind === "own" ? "bring" : "stories", { editing: true }),
          },
        ]
      : [
          {
            label: "Reading time",
            value: `${nook.minutes} minutes`,
            onChange: () => go("time", { editing: true }),
          },
          {
            label: "Your reading",
            value: contentLabel(main),
            onChange: () => go("bring", { editing: true }),
          },
          {
            label: "Cushion",
            value: colourName(nook.cushion) ?? "None",
            onChange: () => go("cushion", { editing: true }),
          },
        ];
    panel = (
      <ReadyPanel
        kid={kid}
        lampOn={kid ? kidLampOn : lampOn}
        rows={rows}
        readLabel={kid ? "Open the story" : "Sit down and read"}
        onRead={() => go("read")}
        lastRecording={
          s.rec.take
            ? {
                detail: `${formatTime(s.rec.take.duration)}${s.rec.take.notes && !kid ? " · with notes" : ""}`,
                onOpen: () => go("review"),
              }
            : undefined
        }
      />
    );
  } else if (screen === "review" && !kid && aiPage) {
    panel = (
      <TurnOnPanel
        ai={ai}
        onBack={() => setAiPage(false)}
        onDone={(on) => {
          setAiPage(false);
          say(on ? "AI feedback is on." : "AI feedback is off.");
        }}
      />
    );
  } else if (screen === "review") {
    panel = kid ? (
      <KidReview
        title={kidTitle}
        take={child.rec.take}
        feeling={feeling}
        ownContent={child.source?.kind === "own"}
        startAt={reviewPos.children}
        onPosition={(t) => setReviewPos((p) => ({ ...p, children: t }))}
        onFeeling={setFeeling}
        onAction={(a: KidResponseAction) => {
          setKidTab("pick");
          setLengthFilter(
            a === "shorter"
              ? story
                ? { kind: "shorter", words: readingWords(story), title: story.title }
                : { kind: "short" }
              : null,
          );
          setKidLampOn(false);
          go("stories");
        }}
        onChooseAnother={() => {
          setKidTab("pick");
          setLengthFilter(null);
          setKidLampOn(false);
          go("stories");
        }}
        onDone={home}
        more={[
          { label: "Record again", onSelect: () => go("read") },
          { label: "Delete recording", danger: true, onSelect: () => deleteRecording(child) },
        ]}
      />
    ) : (
      <AdultReview
        take={main.rec.take}
        target={nook.minutes}
        startAt={reviewPos.main}
        onPosition={(t) => setReviewPos((p) => ({ ...p, main: t }))}
        onRecordAgain={() => go("read")}
        onBackToNook={() => go("ready")}
        feedback={
          ai.configured
            ? (playFrom) => (
                <AiFeedback
                  ai={ai}
                  notes={main.rec.take?.notes ?? null}
                  hasPassage={!!mainWords}
                  onTurnOn={() => setAiPage(true)}
                  onPlayFrom={playFrom}
                  onTurnedOff={() => say("AI feedback is off.")}
                />
              )
            : undefined
        }
        more={[
          { label: "See sample notes", onSelect: () => goSample(3) },
          {
            label: "Start a new session",
            onSelect: () => {
              deleteSessionWithUndo(main, "Your passage and recording were");
              go("bring");
            },
          },
          { label: "Delete recording", danger: true, onSelect: () => deleteRecording(main) },
        ]}
      />
    );
  }

  // ---- Reading screen ------------------------------------------------------------------------------------------------
  const reading = (corner === "adult" || corner === "kid") && screen === "read";
  // During setup steps the nook stays in view on phones (see .rb-pin).
  const pinned =
    (corner === "adult" || corner === "kid") &&
    (screen === "time" || screen === "bring" || screen === "cushion" || screen === "stories");
  let reader: ReactNode = null;
  if (reading) {
    const size = kid ? textSize.children : textSize.main;
    const setSize = (n: number) => setTextSize((t) => ({ ...t, [kid ? "children" : "main"]: n }));
    const isStory = kid && child.source?.kind === "story";
    const pages = s.mode === "upload" && !isStory;
    const pg = s.pages[Math.min(s.page, s.pages.length - 1)];
    const turn = (n: number) => {
      s.setPage(n);
      sound("page");
    };
    const recorder = (
      <Recorder
        rec={s.rec}
        target={kid ? nook.kidMinutes : nook.minutes}
        kid={kid}
        onStart={() => startRecording(s)}
        onListenBack={() => go("review")}
      />
    );
    reader = (
      <div className="flex min-h-0 flex-1 flex-col gap-4 wide:flex-row wide:gap-6">
        <ReaderFrame
          label={isStory ? kidTitle : kid ? "Your story" : "Your reading"}
          onBack={() =>
            guard(() => {
              go("ready");
            })
          }
          tools={
            isStory && story ? (
              <>
                <TextSize size={size} onSize={setSize} />
                <AboutStory story={story} className="hidden sm:inline-flex" />
                <Pager
                  page={Math.min(child.page, story.pageCount - 1)}
                  total={story.pageCount}
                  onPage={turn}
                />
              </>
            ) : (
              <>
                {(!pages || pg?.words) && <TextSize size={size} onSize={setSize} />}
                {pages && s.pages.length > 1 && (
                  <Pager
                    page={Math.min(s.page, s.pages.length - 1)}
                    total={s.pages.length}
                    onPage={turn}
                  />
                )}
              </>
            )
          }
        >
          {isStory && story ? (
            <StoryReader
              story={story}
              textSize={size}
              onTextSize={setSize}
              controls={false}
              page={child.page}
              onPage={turn}
            />
          ) : pages ? (
            <PagesView pages={s.pages} page={s.page} size={size} />
          ) : (
            <PassageText text={s.text} size={size} kid={kid} />
          )}
        </ReaderFrame>
        {recorder}
      </div>
    );
  }

  const offerUpdate = shouldOfferUpdate({
    updateReady: pwa.updateReady,
    sample: corner === "sample",
    hasSession: main.rec.unfinished || child.rec.unfinished,
    view: corner === "home" ? "home" : "read",
  });
  const modeLabel =
    corner === "adult"
      ? "Main practice"
      : kid
        ? "Children’s corner"
        : corner === "sample"
          ? "Sample"
          : "";

  return (
    <div
      className={`flex min-h-dvh flex-col wide:h-dvh wide:overflow-hidden ${
        pinned && !typing ? "rb-pin" : ""
      }`}
    >
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 bg-background px-4 wide:static wide:px-6">
        <button
          type="button"
          onClick={home}
          className="-ml-1 flex items-center gap-1.5 rounded-[10px] p-1"
          aria-label="Reading Buddy home"
        >
          <span className="font-logo flex items-baseline text-[1.75rem] leading-none" aria-hidden>
            <span>R</span>
            <span className="-ml-[0.14em]">B</span>
          </span>
          <BookMark className="h-6 w-8" />
        </button>
        <div className="flex items-center gap-1">
          {modeLabel && (
            <span className="mr-2 hidden text-sm text-muted-foreground sm:inline">{modeLabel}</span>
          )}
          <button
            type="button"
            className="btn-icon"
            aria-pressed={nook.sound}
            aria-label="Sound"
            title={nook.sound ? "Sound on" : "Sound off"}
            onClick={() => {
              const on = !nook.sound;
              setNook({ sound: on });
              if (on) playCue("tick");
            }}
          >
            {nook.sound ? (
              <Volume2 className="size-5" aria-hidden />
            ) : (
              <VolumeX className="size-5" aria-hidden />
            )}
          </button>
          <button
            type="button"
            className="btn-icon"
            aria-label="Saved on this device"
            title="Saved on this device"
            onClick={goSaved}
          >
            <FolderClosed className="size-5" aria-hidden />
          </button>
        </div>
      </header>

      {(!pwa.online || offerUpdate) && (
        <p
          role="status"
          className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-raised px-4 py-2 text-sm wide:mx-6"
        >
          {!pwa.online
            ? "You’re offline. Reading Buddy still works here."
            : "A new version of Reading Buddy is ready."}
          {pwa.online && offerUpdate && (
            <button type="button" className="text-link" onClick={pwa.applyUpdate}>
              Update now
            </button>
          )}
        </p>
      )}

      <main className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 wide:flex-row wide:gap-6 wide:px-6 wide:pb-6">
        {reading ? (
          reader
        ) : (
          <>
            <div className="rb-scene relative h-[min(75vw,440px)] shrink-0 overflow-hidden rounded-[20px] bg-[#1C2541] wide:h-auto wide:min-w-0 wide:flex-1">
              {scene}
            </div>
            <section
              aria-label={modeLabel || "Reading Buddy"}
              className={`panel wide:min-h-0 wide:shrink-0 ${wide ? "wide:w-[35rem]" : "wide:w-[27.5rem]"}`}
            >
              {panel}
            </section>
          </>
        )}
      </main>

      <Toast toast={pending ? null : toast} onDone={() => setToast(null)} />

      <Confirm
        open={pending?.kind === "leave"}
        onCancel={() => setPending(null)}
        onConfirm={() => void finishAndLeave()}
        busy={busy}
        title="Finish recording and go back?"
        body={<p>Your recording so far will be kept on this device.</p>}
        confirmLabel="Finish and go back"
        cancelLabel="Keep reading"
      />
      <Confirm
        open={pending?.kind === "deleteNotes"}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const take = main.rec.detach();
          if (take) URL.revokeObjectURL(take.url);
          setPending(null);
          go("read");
          say("Recording and notes deleted.");
        }}
        danger
        title="Delete this recording?"
        body={<p>Its AI notes will be deleted too. This can’t be undone.</p>}
        confirmLabel="Delete recording and notes"
      />
      <Confirm
        open={pending?.kind === "deleteAll"}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          for (const x of [main, child]) {
            x.rec.discard();
            x.release(x.takeOut());
          }
          setFeeling(null);
          setPending(null);
          say("All readings, recordings and notes deleted.");
        }}
        danger
        title="Delete all readings, recordings and notes?"
        body={
          <p>
            Everything saved on this device will be removed, from both the main practice and the
            children’s corner. This can’t be undone.
          </p>
        }
        confirmLabel="Delete all"
      />
      <Confirm
        open={pending?.kind === "forget"}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          forgetNook();
          setLampOn(false);
          setKidLampOn(false);
          setPending(null);
          toHome();
          say("Your nook was forgotten. Saved readings are still in Saved.");
        }}
        title="Forget your nook?"
        body={
          <p>
            Your reading times, cushion and beanbag go back to the start. Saved readings stay until
            you delete them.
          </p>
        }
        confirmLabel="Forget nook"
      />
      <Modal
        open={!!micFor}
        onClose={() => setMicFor(null)}
        title={<span className={kid ? "kid" : ""}>Buddy needs to hear you</span>}
        description="Your browser will ask to use the microphone. Recordings stay on this device."
      >
        <div className="rb-acts">
          <button type="button" className="btn-secondary" onClick={() => setMicFor(null)}>
            Not now
          </button>
          <button
            type="button"
            className="btn-primary min-h-12 text-base"
            onClick={() => {
              const x = micFor;
              setMicFor(null);
              setNook({ micExplained: true });
              if (x) void x.rec.start();
            }}
          >
            Allow microphone
          </button>
        </div>
      </Modal>
    </div>
  );
}

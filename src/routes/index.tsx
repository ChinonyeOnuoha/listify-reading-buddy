import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PrepareStep, type InputMode, type PageImage } from "@/components/reading/PrepareStep";
import { ReadStep } from "@/components/reading/ReadStep";
import { ReviewStep } from "@/components/reading/ReviewStep";
import { useRecorder } from "@/components/reading/useRecorder";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Listify: Reading Buddy — read aloud, kindly" },
      { name: "description", content: "A guided read-aloud session: prepare a passage, record yourself reading, then listen back." },
      { property: "og:title", content: "Listify: Reading Buddy" },
      { property: "og:description", content: "A warm companion for making time to read aloud." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Step = "prepare" | "read" | "review";
const STEPS: { id: Step; label: string }[] = [
  { id: "prepare", label: "Prepare" },
  { id: "read", label: "Read" },
  { id: "review", label: "Review" },
];

function Index() {
  const [step, setStep] = useState<Step>("prepare");
  const [target, setTarget] = useState(10);
  const [mode, setMode] = useState<InputMode>(null);
  const [text, setText] = useState("");
  const [images, setImages] = useState<PageImage[]>([]);
  const rec = useRecorder(() => setStep("review"));

  const canContinue = (mode === "paste" && text.trim().length > 0) || (mode === "upload" && images.length > 0);
  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const canGo = (s: Step) =>
    !rec.recording && (s === "prepare" || (s === "read" && canContinue) || (s === "review" && !!rec.take));

  const newSession = () => {
    rec.clear();
    images.forEach((i) => URL.revokeObjectURL(i.url));
    setImages([]);
    setText("");
    setMode(null);
    setStep("prepare");
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-primary sm:text-4xl">Listify: Reading Buddy 📚</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">Make a little time to read aloud. I'll keep you company.</p>
      </header>

      <nav aria-label="Session steps" className="mx-auto mt-6 mb-6 max-w-md">
        <ol className="grid grid-cols-3 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                onClick={() => canGo(s.id) && setStep(s.id)}
                disabled={!canGo(s.id) && s.id !== step}
                aria-current={s.id === step ? "step" : undefined}
                className={`w-full rounded-full border-[1.5px] px-2 py-2 text-sm font-bold transition disabled:opacity-50 ${
                  s.id === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : i < stepIdx
                      ? "border-peach-strong bg-accent"
                      : "border-border bg-card"
                }`}
              >
                {i + 1}. {s.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {step === "prepare" && (
        <PrepareStep
          target={target}
          setTarget={setTarget}
          mode={mode}
          setMode={setMode}
          text={text}
          setText={setText}
          images={images}
          setImages={setImages}
          canContinue={canContinue}
          onContinue={() => setStep("read")}
        />
      )}
      {step === "read" && mode && (
        <ReadStep
          mode={mode}
          text={text}
          images={images}
          target={target}
          recording={rec.recording}
          micError={rec.micError}
          elapsed={rec.recording ? rec.elapsed : 0}
          hasTake={!!rec.take}
          onStart={rec.start}
          onStop={rec.stop}
          onUpload={rec.upload}
          onBack={() => setStep("prepare")}
        />
      )}
      {step === "review" && (
        <ReviewStep
          take={rec.take}
          target={target}
          onBack={() => setStep("read")}
          onDiscard={() => { rec.clear(); setStep("read"); }}
          onNewSession={newSession}
        />
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        🔒 Your passage, pages and recordings stay in this browser tab and are never uploaded.
      </p>
    </main>
  );
}

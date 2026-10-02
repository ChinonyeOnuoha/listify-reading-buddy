import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Recorder, type RecState } from "@/components/reading/Recorder";
import { SampleFeedback } from "@/components/reading/SampleFeedback";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Listify: Reading Buddy — read aloud, kindly" },
      { name: "description", content: "Set a daily reading target, paste a passage, record yourself reading aloud and play it back." },
      { property: "og:title", content: "Listify: Reading Buddy" },
      { property: "og:description", content: "A warm companion for making time to read aloud." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [target, setTarget] = useState(10);
  const [passage, setPassage] = useState("");
  const [image, setImage] = useState<{ url: string; name: string } | null>(null);
  const [recState, setRecState] = useState<RecState>("ready");
  const [showSample, setShowSample] = useState(false);

  useEffect(() => () => { if (image) URL.revokeObjectURL(image.url); }, [image]);

  const recording = recState === "recording";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-primary sm:text-4xl">Listify: Reading Buddy 📚</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Make a little time to read aloud. I'll keep you company.
        </p>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <section className="card-soft p-5 sm:p-6">
            <label htmlFor="target" className="text-xl font-bold font-display">Today's reading target</label>
            <div className="mt-3 flex items-center gap-3">
              <input
                id="target"
                type="number"
                min={1}
                max={180}
                value={target}
                onChange={(e) => setTarget(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
                className="field w-28 text-lg font-bold"
              />
              <span className="text-muted-foreground">minutes ⏱️</span>
            </div>
          </section>

          <section className="card-soft p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="passage" className="text-xl font-bold font-display">Your passage</label>
              {recording && <span className="text-sm font-bold text-ember">● Recording</span>}
            </div>
            {recording ? (
              <div className="reading-text mt-3 max-h-[60vh] overflow-y-auto rounded-2xl bg-peach p-4">
                {passage || "No passage pasted — that's okay, read from your page 📖"}
              </div>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">Paste the exact words you plan to read.</p>
                <textarea
                  id="passage"
                  value={passage}
                  onChange={(e) => setPassage(e.target.value.slice(0, 10000))}
                  rows={8}
                  placeholder="Paste your passage here…"
                  className="field reading-text mt-3 max-w-none"
                />
              </>
            )}

            <div className="mt-4">
              <label className="pill pill-ghost cursor-pointer text-sm">
                📷 Add a page photo or screenshot
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setImage({ url: URL.createObjectURL(f), name: f.name });
                    e.target.value = "";
                  }}
                />
              </label>
              {image && (
                <div className="mt-3 rounded-2xl bg-peach p-3">
                  <img src={image.url} alt={`Page preview: ${image.name}`} className="max-h-[70vh] w-full rounded-xl object-contain" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Heads up 📝 I can't read text from photos yet. Please paste the passage text above too, so it can be compared later.
                  </p>
                  <button className="pill pill-ghost mt-2 px-4 py-1.5 text-sm" onClick={() => setImage(null)}>Remove photo</button>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <Recorder targetMinutes={target} onStateChange={setRecState} />
          <section className="card-soft p-5 sm:p-6">
            <h2 className="text-xl font-bold">Feedback</h2>
            <p className="mt-1 text-muted-foreground">
              Live analysis isn't connected yet 🔌 Want a peek at how feedback will look?
            </p>
            <button className="pill pill-primary mt-4" onClick={() => setShowSample(true)}>
              ✨ Explore sample feedback
            </button>
          </section>
          <p className="px-2 text-xs text-muted-foreground">
            🔒 Your passage, photos and recordings stay in this browser tab and are never uploaded.
          </p>
        </div>
      </div>

      {showSample && (
        <div className="mt-6">
          <SampleFeedback onClose={() => setShowSample(false)} />
        </div>
      )}
    </main>
  );
}

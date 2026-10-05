import { ArrowDown, ArrowRight, ArrowUp, ClipboardPaste, ImagePlus, RefreshCw, Trash2, Upload } from "lucide-react";

export type PageImage = { id: string; url: string; name: string };
export type InputMode = "paste" | "upload" | null;

type Props = {
  target: number;
  setTarget: (n: number) => void;
  mode: InputMode;
  setMode: (m: InputMode) => void;
  text: string;
  setText: (t: string) => void;
  images: PageImage[];
  setImages: (fn: (prev: PageImage[]) => PageImage[]) => void;
  canContinue: boolean;
  onContinue: () => void;
};

const toImage = (f: File): PageImage => ({ id: crypto.randomUUID(), url: URL.createObjectURL(f), name: f.name });

export function PrepareStep(p: Props) {
  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/")).map(toImage);
    p.setImages((prev) => [...prev, ...list]);
  };
  const move = (i: number, d: -1 | 1) =>
    p.setImages((prev) => {
      const next = [...prev];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  const remove = (id: string) =>
    p.setImages((prev) => {
      const hit = prev.find((x) => x.id === id);
      if (hit) URL.revokeObjectURL(hit.url);
      return prev.filter((x) => x.id !== id);
    });
  const replace = (id: string, f?: File) => {
    if (!f) return;
    p.setImages((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        URL.revokeObjectURL(x.url);
        return { ...toImage(f), id };
      }),
    );
  };

  const choice = (m: Exclude<InputMode, null>, Icon: typeof Upload, label: string) => (
    <button
      type="button"
      aria-pressed={p.mode === m}
      onClick={() => p.setMode(m)}
      className={`flex items-center gap-3 rounded-2xl border-[1.5px] p-4 text-left font-bold transition ${
        p.mode === m ? "border-primary bg-primary text-primary-foreground" : "border-peach-strong bg-peach hover:bg-accent"
      }`}
    >
      <Icon className="size-5 shrink-0" aria-hidden /> {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="card-soft p-5 sm:p-6">
        <label htmlFor="target" className="font-display text-xl font-bold">Today's reading target</label>
        <div className="mt-3 flex items-center gap-3">
          <input
            id="target"
            type="number"
            min={1}
            max={180}
            value={p.target}
            onChange={(e) => p.setTarget(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
            className="field w-28 text-lg font-bold"
          />
          <span className="text-muted-foreground">minutes ⏱️</span>
        </div>
      </section>

      <section className="card-soft p-5 sm:p-6">
        <h2 className="text-xl font-bold">What are you reading today?</h2>
        <p className="mt-1 text-muted-foreground">Pick one — you can switch any time without losing anything 📖</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {choice("paste", ClipboardPaste, "Paste your content")}
          {choice("upload", Upload, "Upload your content")}
        </div>

        {p.mode === "paste" && (
          <div className="mt-5">
            <label htmlFor="passage" className="text-sm font-bold">Paste the exact words you plan to read</label>
            <textarea
              id="passage"
              value={p.text}
              onChange={(e) => p.setText(e.target.value.slice(0, 10000))}
              rows={9}
              placeholder="Paste your passage here…"
              className="field reading-text mt-2 max-w-none"
            />
          </div>
        )}

        {p.mode === "upload" && (
          <div className="mt-5 space-y-4">
            <p className="rounded-2xl bg-accent/60 p-3 text-sm">
              You can read from your photo. Automatic text extraction isn't connected yet. 📝
              Pasted text will be needed later for word-by-word comparison.
            </p>
            {p.images.length > 0 && (
              <ol className="space-y-4">
                {p.images.map((img, i) => (
                  <li key={img.id} className="rounded-2xl bg-peach p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary px-3 py-0.5 text-sm font-bold text-primary-foreground">
                        Page {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{img.name}</span>
                    </div>
                    <img src={img.url} alt={`Page ${i + 1}: ${img.name}`} className="max-h-[60vh] w-full rounded-xl object-contain" />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="pill pill-ghost px-3 py-1.5 text-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move page ${i + 1} up`}>
                        <ArrowUp className="size-4" aria-hidden /> Up
                      </button>
                      <button className="pill pill-ghost px-3 py-1.5 text-sm" disabled={i === p.images.length - 1} onClick={() => move(i, 1)} aria-label={`Move page ${i + 1} down`}>
                        <ArrowDown className="size-4" aria-hidden /> Down
                      </button>
                      <label className="pill pill-ghost cursor-pointer px-3 py-1.5 text-sm">
                        <RefreshCw className="size-4" aria-hidden /> Replace
                        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { replace(img.id, e.target.files?.[0]); e.target.value = ""; }} />
                      </label>
                      <button className="pill pill-ghost px-3 py-1.5 text-sm" onClick={() => remove(img.id)}>
                        <Trash2 className="size-4" aria-hidden /> Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <label className="pill pill-ghost cursor-pointer">
              <ImagePlus className="size-5" aria-hidden /> {p.images.length ? "Add more pages" : "Add page photos or screenshots"}
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button className="pill pill-primary w-full sm:w-auto" disabled={!p.canContinue} onClick={p.onContinue}>
          Continue to reading <ArrowRight className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

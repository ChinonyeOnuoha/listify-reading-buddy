import { useCallback, useEffect, useRef, useState } from "react";
import { useRecorder, type AudioTake } from "@/components/reading/useRecorder";
import {
  deleteSession,
  loadSession,
  saveSession,
  type StoreKey,
  type StoredSession,
} from "@/lib/device-store";

/** One photographed page. `blob` is the original image file; `words` are the page's words, if someone has added them. */
export type PageImage = {
  id: string;
  url: string;
  name: string;
  blob: Blob;
  words?: string | undefined;
};
export type InputMode = "paste" | "upload" | null;
export type Source = { kind: "story"; slug: string } | { kind: "own" };

/** Only pages that actually decode are added, so "at least one page" always means a usable image. */
export async function loadPage(f: File): Promise<PageImage | null> {
  const url = URL.createObjectURL(f);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { id: crypto.randomUUID(), url, name: f.name, blob: f };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

/** Everything a session holds, for Undo: object URLs stay alive until the snapshot is released. */
export type Snapshot = {
  mode: InputMode;
  text: string;
  pages: PageImage[];
  take: AudioTake | null;
  source: Source | null;
  page: number;
};

/**
 * One corner's reading session (main practice or the children's corner): what is being read, the recorder, and the page
 * reached. Each corner has its own, so drafts, photos and recordings never cross between them.
 * The session is kept on this device and comes back on the next visit.
 */
export function useReadingSession(key: StoreKey, onRecorded: () => void) {
  const [mode, setMode] = useState<InputMode>(null);
  const [text, setText] = useState("");
  const [pages, setPages] = useState<PageImage[]>([]);
  const [source, setSource] = useState<Source | null>(null);
  const [page, setPage] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const rec = useRecorder(onRecorded);
  /** Bumped when the session is cleared, so uploads still decoding can't bring cleared pages back. */
  const gen = useRef(0);
  const isCurrent = useCallback((g: number) => g === gen.current, []);

  // Restore what was kept on this device.
  useEffect(() => {
    let cancelled = false;
    void loadSession(key).then((s) => {
      if (cancelled) return;
      if (s) {
        setMode(s.mode);
        setText(s.text);
        setPages(s.pages.map((p) => ({ ...p, url: URL.createObjectURL(p.blob) })));
        setSource(s.source ?? null);
        setPage(s.page ?? 0);
        if (s.recording)
          rec.restore({
            url: URL.createObjectURL(s.recording.blob),
            duration: s.recording.duration,
            source: s.recording.source,
            name: s.recording.name,
          });
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once, on mount
  }, [key]);

  const take = rec.take;
  const hasText = !!text.trim();
  const hasContent = (mode === "paste" && hasText) || (mode === "upload" && pages.length > 0);
  const isEmpty = !hasText && pages.length === 0 && !take && source === null;

  // Keep it on the device. Writes are coalesced so typing doesn't write on every key.
  const blobCache = useRef(new Map<string, Blob>());
  useEffect(() => {
    if (!loaded) return;
    const t = window.setTimeout(async () => {
      if (isEmpty) return void deleteSession(key);
      let recording: StoredSession["recording"] = null;
      if (take) {
        let blob = blobCache.current.get(take.url);
        if (!blob) {
          try {
            blob = await (await fetch(take.url)).blob();
            blobCache.current.set(take.url, blob);
          } catch {
            blob = undefined;
          }
        }
        if (blob)
          recording = { blob, duration: take.duration, source: take.source, name: take.name };
      }
      await saveSession(key, {
        mode,
        text,
        pages: pages.map(({ id, name, blob, words }) => ({ id, name, blob, words })),
        recording,
        source,
        page,
        savedAt: Date.now(),
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [key, loaded, isEmpty, mode, text, pages, take, source, page]);

  /** Take everything out of the session for Undo. Nothing is released until `release` is called. */
  const takeOut = (): Snapshot => {
    gen.current += 1;
    const snap: Snapshot = { mode, text, pages, take: rec.detach(), source, page };
    setMode(null);
    setText("");
    setPages([]);
    setSource(null);
    setPage(0);
    return snap;
  };
  const putBack = (s: Snapshot) => {
    setMode(s.mode);
    setText(s.text);
    setPages(s.pages);
    setSource(s.source);
    setPage(s.page);
    rec.restore(s.take);
  };
  const release = (s: Snapshot) => {
    s.pages.forEach((p) => URL.revokeObjectURL(p.url));
    if (s.take) URL.revokeObjectURL(s.take.url);
  };

  return {
    key,
    loaded,
    mode,
    setMode,
    text,
    setText,
    pages,
    setPages,
    source,
    setSource,
    page,
    setPage,
    rec,
    hasContent,
    isEmpty,
    generation: gen.current,
    isCurrent,
    takeOut,
    putBack,
    release,
  };
}

export type ReadingSession = ReturnType<typeof useReadingSession>;

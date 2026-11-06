/**
 * Reading content kept on this device: pasted text, page photos (as image files) and recordings (as audio files).
 * Stored in the browser's IndexedDB for this site only. Nothing is uploaded. Where IndexedDB is unavailable
 * (private windows in some browsers, blocked site data, tests), every call quietly does nothing and the session
 * lasts for this visit only.
 */

import type { Notes } from "@/lib/reading-feedback/feedback";

export type StoreKey = "main" | "children";

export type StoredPage = { id: string; name: string; blob: Blob; words?: string | undefined };
export type StoredRecording = {
  blob: Blob;
  duration: number;
  source: "recording" | "upload";
  name?: string | undefined;
  /** AI feedback notes made for this recording, kept and deleted with it. */
  notes?: Notes | undefined;
};
export type StoredSession = {
  mode: "paste" | "upload" | null;
  text: string;
  pages: StoredPage[];
  recording: StoredRecording | null;
  /** Children's corner only: what is being read (a built-in story or the child's own content). */
  source?: { kind: "story"; slug: string } | { kind: "own" } | null;
  /** Children's corner only: the page reached in the story. */
  page?: number;
  savedAt: number;
};

const DB = "reading-buddy";
const STORE = "sessions";

let opening: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (opening) return opening;
  opening = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return open().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const tx = db.transaction(STORE, mode);
          const req = fn(tx.objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

export const loadSession = (key: StoreKey) =>
  run<StoredSession | undefined>("readonly", (s) => s.get(key)).then((v) => v ?? null);

export const saveSession = (key: StoreKey, value: StoredSession) =>
  run("readwrite", (s) => s.put(value, key)).then(() => undefined);

export const deleteSession = (key: StoreKey) =>
  run("readwrite", (s) => s.delete(key)).then(() => undefined);

/** Bytes a stored session takes (files only; text is negligible). */
export const sessionBytes = (s: Pick<StoredSession, "pages" | "recording">) =>
  s.pages.reduce((n, p) => n + p.blob.size, 0) + (s.recording?.blob.size ?? 0);

/** The browser's own estimate of how much this site may store, when it offers one. */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    if (!e || e.quota === undefined || e.usage === undefined) return null;
    return { usage: e.usage, quota: e.quota };
  } catch {
    return null;
  }
}

/** Ask the browser not to clear this site's storage under pressure. Harmless when unsupported or declined. */
export function askToKeepStorage() {
  try {
    void navigator.storage?.persist?.();
  } catch {
    // not supported
  }
}

export const formatBytes = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;

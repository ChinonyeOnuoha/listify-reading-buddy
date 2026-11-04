import { useCallback, useEffect, useState } from "react";

/** The eight colours offered for the cushion and the beanbag, with the names shown under each swatch. */
export const COLOURS = [
  { hex: "#D7E259", name: "Ginkgo" },
  { hex: "#EFA94A", name: "Marigold" },
  { hex: "#C8664B", name: "Clay" },
  { hex: "#E3A69A", name: "Blossom" },
  { hex: "#9A6A9C", name: "Plum" },
  { hex: "#A9A6E8", name: "Lilac" },
  { hex: "#5AA6E9", name: "Sky" },
  { hex: "#EEE2CA", name: "Cream" },
] as const;

export const colourName = (hex: string | null) => COLOURS.find((c) => c.hex === hex)?.name ?? null;

/**
 * What the nook remembers between visits on this device: the choices that build it, never any reading content.
 * Reading content (text, page photos, recordings) is kept separately in the device store.
 */
export type NookMemory = {
  /** Main practice: minutes a day, or null before it has been chosen. */
  minutes: number | null;
  /** Main practice cushion colour; null when skipped or not chosen. */
  cushion: string | null;
  /** The cushion step has been answered (chosen or skipped), so returning visits don't ask again. */
  cushionAsked: boolean;
  /** Children's corner: the optional reading time a grown-up set, or null for none. */
  kidMinutes: number | null;
  /** The corner's time step has been answered (including "Off"). */
  kidTimeAsked: boolean;
  beanbag: string | null;
  /** Sound effects are off until switched on. */
  sound: boolean;
  /** The microphone explainer has been shown once on this device. */
  micExplained: boolean;
  /** The shared-device note has been shown after the first save. */
  savedNoteShown: boolean;
  /** Something has been set up before, so the home panel welcomes the reader back. */
  remembered: boolean;
};

export const EMPTY_NOOK: NookMemory = {
  minutes: null,
  cushion: null,
  cushionAsked: false,
  kidMinutes: null,
  kidTimeAsked: false,
  beanbag: null,
  sound: false,
  micExplained: false,
  savedNoteShown: false,
  remembered: false,
};

const KEY = "reading-buddy:nook:v1";

export function readNook(): NookMemory {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_NOOK;
    const parsed = JSON.parse(raw) as Partial<NookMemory>;
    return { ...EMPTY_NOOK, ...parsed };
  } catch {
    return EMPTY_NOOK;
  }
}

function writeNook(n: NookMemory) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(n));
  } catch {
    // Storage can be unavailable (private windows, blocked site data). The nook then lasts for this visit only.
  }
}

/** The nook's remembered choices, read once on the client and written back on every change. */
export function useNookMemory() {
  const [nook, setNook] = useState<NookMemory>(EMPTY_NOOK);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setNook(readNook());
    setLoaded(true);
  }, []);
  const update = useCallback((patch: Partial<NookMemory>) => {
    setNook((prev) => {
      const next = { ...prev, ...patch };
      writeNook(next);
      return next;
    });
  }, []);
  /** Forget the nook's choices. Sound and the one-time notes are device preferences and stay. */
  const forget = useCallback(() => {
    setNook((prev) => {
      const next = {
        ...EMPTY_NOOK,
        sound: prev.sound,
        micExplained: prev.micExplained,
        savedNoteShown: prev.savedNoteShown,
      };
      writeNook(next);
      return next;
    });
  }, []);
  return { nook, loaded, update, forget };
}

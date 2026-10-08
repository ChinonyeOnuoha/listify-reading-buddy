import { useCallback, useEffect, useRef, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/**
 * When may "A new version is ready" be shown? Only when reloading can't lose anything: not in the sample walkthrough,
 * not while a personal session exists (target, content or recording), and only on the welcome screens.
 * The update itself is never applied automatically — only by the person pressing "Update now".
 */
export function shouldOfferUpdate(s: { updateReady: boolean; sample: boolean; hasSession: boolean; view: "home" | "prepare" | "read" | "review" | "samples" }) {
  return s.updateReady && !s.sample && !s.hasSession && (s.view === "prepare" || s.view === "home");
}

/**
 * Installation, offline and update state.
 * - The service worker is registered in production builds only (the dev server doesn't use it).
 * - A new version never takes over by itself: `applyUpdate` is only offered by the UI at a safe point.
 */
export function usePwa() {
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [online, setOnline] = useState(true);
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const regRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    setStandalone(isStandalone());
    setIos(isIOS());
    setOnline(navigator.onLine);

    const onPrompt = (e: Event) => {
      e.preventDefault(); // show our own understated action instead of the browser's banner
      promptRef.current = e as InstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      promptRef.current = null;
      setCanInstall(false);
      setStandalone(true);
    };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const mq = window.matchMedia("(display-mode: standalone)");
    const onMode = () => setStandalone(isStandalone());
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    mq.addEventListener?.("change", onMode);

    let onVisible: (() => void) | null = null;
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" }) // always fetch sw.js fresh so a new build is noticed
        .then((reg) => {
          regRef.current = reg;
          const watch = (w: ServiceWorker | null) => {
            if (!w) return;
            w.addEventListener("statechange", () => {
              // "installed" while a controller exists = a newer version is waiting.
              if (w.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
            });
          };
          if (reg.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
          watch(reg.installing);
          reg.addEventListener("updatefound", () => watch(reg.installing));
          onVisible = () => {
            if (document.visibilityState === "visible") void reg.update().catch(() => {});
          };
          document.addEventListener("visibilitychange", onVisible);
        })
        .catch(() => {
          /* installation/offline support simply isn't available; the app works as before */
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      mq.removeEventListener?.("change", onMode);
      if (onVisible) document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const install = useCallback(async () => {
    const p = promptRef.current;
    if (!p) return;
    await p.prompt();
    await p.userChoice.catch(() => null);
    promptRef.current = null;
    setCanInstall(false);
  }, []);

  /** Reload into the new version. Only call when no session is open (the reload clears in-memory work). */
  const applyUpdate = useCallback(() => {
    const waiting = regRef.current?.waiting;
    if (!waiting) return window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    waiting.postMessage({ type: "SKIP_WAITING" });
  }, []);

  return { standalone, ios, canInstall, install, updateReady, applyUpdate, online };
}

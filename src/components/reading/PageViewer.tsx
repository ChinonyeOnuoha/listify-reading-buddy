import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import {
  DOUBLE_CLICK_ZOOM,
  FIT_VIEW,
  MAX_ZOOM,
  ZOOM_STEP,
  anchorAt,
  centreOf,
  fitSize,
  isFit,
  panBy,
  percent,
  translateFor,
  viewFromAnchor,
  zoomAbout,
  type Point,
  type Size,
  type View,
} from "@/lib/viewer-math";

type Props = {
  src: string;
  /** Accessible name of the page, e.g. "Page 2 of 5". */
  alt: string;
};

const NOT_MEASURED: Size = { w: 0, h: 0 };

/**
 * Zoom and pan for one uploaded page, contained in its own box.
 *
 * Only the image is transformed. The toolbar, the page navigation and the recording controls sit outside the transformed
 * layer, so zooming never changes their size. The box clips its contents and the image is absolutely positioned inside it,
 * so a large zoom cannot widen the document or push anything out of view.
 *
 * Gestures are handled on the box only: drag to pan (mouse, pen or one finger once zoomed), pinch with two fingers,
 * Ctrl/⌘ + wheel (a trackpad pinch), double-click. Normal page scrolling is untouched outside the box, and while the page is
 * fitted a one-finger vertical swipe over the box still scrolls the page. Browser zoom is not disabled anywhere.
 * Keyboard: the box is focusable; + and − zoom, 0 fits, and the arrow keys move around once zoomed.
 * The image itself is never resampled or cropped: it is the original file, scaled by a CSS transform.
 */
export function PageViewer({ src, alt }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [size, setSize] = useState<Size>(NOT_MEASURED);
  const [natural, setNatural] = useState<Size>(NOT_MEASURED);
  const [view, setViewState] = useState<View>(FIT_VIEW);
  const [announcement, setAnnouncement] = useState("");

  // Mirrors of state that gesture handlers read synchronously.
  const viewRef = useRef(view);
  const sizeRef = useRef(size);
  const fitRef = useRef<Size>(NOT_MEASURED);
  const setView = useCallback((v: View) => {
    viewRef.current = v;
    setViewState(v);
  }, []);

  const fit = fitSize(size, natural);
  fitRef.current = fit;
  sizeRef.current = size;

  // Measure the box, and follow it when the window resizes or a phone rotates.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Nothing to do when the viewer or image changes size (a rotated phone, a resized window): the view is stored as the part of
  // the page at the centre, and every reader of it (rendering, keys, drags) clamps it to the current sizes, so the same part
  // stays in view, nothing is ever out of reach, and rotating back returns to exactly where you were.

  const ready = fit.w > 0 && fit.h > 0;
  const { x, y } = ready ? translateFor(view, size, fit) : { x: 0, y: 0 };
  const zoomed = !isFit(view);

  // ---- toolbar and keyboard actions (announced, unlike continuous gestures) ---------------------------------------
  const announce = (v: View) => setAnnouncement(isFit(v) ? "Page fitted to the viewer" : `Zoom ${percent(v)} percent`);
  const apply = (next: View) => {
    setView(next);
    announce(next);
  };
  const zoomBy = (factor: number) => {
    if (!ready) return;
    apply(zoomAbout(viewRef.current, viewRef.current.k * factor, centreOf(size), size, fit));
  };
  const fitPage = () => apply(FIT_VIEW);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts (Ctrl +/−/0) alone
    const step = 0.2;
    const move = (dx: number, dy: number) => {
      if (!zoomed) return; // fitted: arrows keep scrolling the page as usual
      e.preventDefault();
      setView(panBy(viewRef.current, dx * size.w * step, dy * size.h * step, size, fit));
    };
    switch (e.key) {
      case "+":
      case "=":
        e.preventDefault();
        return zoomBy(ZOOM_STEP);
      case "-":
      case "_":
        e.preventDefault();
        return zoomBy(1 / ZOOM_STEP);
      case "0":
        e.preventDefault();
        return fitPage();
      case "ArrowLeft":
        return move(1, 0);
      case "ArrowRight":
        return move(-1, 0);
      case "ArrowUp":
        return move(0, 1);
      case "ArrowDown":
        return move(0, -1);
    }
  };

  // ---- pointer gestures --------------------------------------------------------------------------------------------
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<{ dist: number; k: number; anchor: { ix: number; iy: number } } | null>(null);

  const local = (e: { clientX: number; clientY: number }): Point => {
    const r = boxRef.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };
  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    pinch.current = {
      dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      k: viewRef.current.k,
      anchor: anchorAt(viewRef.current, mid, sizeRef.current, fitRef.current),
    };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!ready || (e.pointerType === "mouse" && e.button !== 0)) return;
    pointers.current.set(e.pointerId, local(e));
    // Keep receiving moves if a finger or the mouse leaves the box mid-gesture.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (pointers.current.size === 2) startPinch();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const now = local(e);
    pointers.current.set(e.pointerId, now);

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const ratio = Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist;
      // The page point first under the fingers' midpoint stays under it: zooming and two-finger panning in one.
      setView(viewFromAnchor(pinch.current.k * ratio, pinch.current.anchor, mid, sizeRef.current, fitRef.current));
    } else if (pointers.current.size === 1 && !isFit(viewRef.current)) {
      setView(panBy(viewRef.current, now.x - prev.x, now.y - prev.y, sizeRef.current, fitRef.current));
    }
  };

  const endPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    pinch.current = null;
    // One finger left after a pinch: carry on panning from where it is, without a jump.
    if (pointers.current.size === 2) startPinch();
  };

  // Ctrl/⌘ + wheel is how a trackpad pinch (and many mice) arrive. Plain wheel is left alone so the page keeps scrolling.
  // Registered by hand because React's wheel listener is passive and cannot cancel the browser's page zoom.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !fitRef.current.w) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const next = zoomAbout(
        viewRef.current,
        viewRef.current.k * Math.exp(-e.deltaY * 0.01),
        { x: e.clientX - r.left, y: e.clientY - r.top },
        sizeRef.current,
        fitRef.current,
      );
      setView(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setView]);

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ready) return;
    apply(zoomed ? FIT_VIEW : zoomAbout(viewRef.current, DOUBLE_CLICK_ZOOM, local(e), size, fit));
  };

  const atMax = view.k >= MAX_ZOOM - 1e-6;
  const toolButton =
    "btn-quiet min-h-11 min-w-11 justify-center px-2 sm:px-3 aria-disabled:pointer-events-none aria-disabled:opacity-45";

  return (
    <div>
      <div role="toolbar" aria-label="Zoom the page image" className="mb-2 flex items-center gap-1 sm:-ml-3">
        <button type="button" className={toolButton} title="Zoom out" aria-label="Zoom out" aria-disabled={!zoomed} onClick={() => zoomed && zoomBy(1 / ZOOM_STEP)}>
          <ZoomOut className="size-5" aria-hidden />
        </button>
        <button type="button" className={toolButton} title="Zoom in" aria-label="Zoom in" aria-disabled={atMax} onClick={() => !atMax && zoomBy(ZOOM_STEP)}>
          <ZoomIn className="size-5" aria-hidden />
        </button>
        <button type="button" className={toolButton} title="Fit page" aria-label="Fit page" aria-disabled={!zoomed} onClick={() => zoomed && fitPage()}>
          <Maximize2 className="size-[18px]" aria-hidden /> <span className="hidden sm:inline">Fit page</span>
        </button>
        <span className="ml-auto text-sm whitespace-nowrap text-muted-foreground tabular-nums" aria-hidden>
          {percent(view)}%
        </span>
      </div>
      <div
        ref={boxRef}
        role="group"
        aria-label={alt}
        aria-describedby={hintId}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onDoubleClick={onDoubleClick}
        data-zoomed={zoomed || undefined}
        // Fitted: a one-finger vertical swipe scrolls the page. Zoomed: the box owns one-finger drags. Pinch is always ours.
        style={{ touchAction: zoomed ? "none" : "pan-y" }}
        className={`relative h-[70vh] max-h-[52rem] min-h-80 overflow-hidden rounded-2xl border border-border bg-white select-none ${
          zoomed ? "cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          // Sized once to "fit" and then scaled by transform: the original file, never stretched, cropped or resampled.
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: ready ? fit.w : "100%",
            height: ready ? fit.h : "100%",
            maxWidth: "none",
            objectFit: ready ? "fill" : "contain",
            transformOrigin: "0 0",
            transform: `translate(${x}px, ${y}px) scale(${view.k})`,
            opacity: ready ? 1 : 0,
            willChange: zoomed ? "transform" : "auto",
          }}
        />
      </div>
      <p id={hintId} className="sr-only">
        Zoom with the buttons above, or press plus and minus. When zoomed, drag the page or use the arrow keys to move around it.
        Press zero to fit the page.
      </p>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

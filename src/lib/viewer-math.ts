/**
 * Geometry for the uploaded-page viewer. Kept free of React and the DOM so every rule can be tested.
 *
 * The image is laid out once at its "fit" size (the largest size that shows the whole image inside the viewer, never
 * stretched or cropped) and then scaled by `k` with a CSS transform, so the underlying image is never resampled or cropped.
 * A view is `{ k, u, v }`: the zoom (1 = fit) and the point of the image, as fractions 0–1 of its width and height, that sits
 * at the centre of the viewer. Storing the centre rather than pixel offsets keeps the same part of the page in view when the
 * viewer is resized (rotating a phone, resizing a window).
 */
export type Size = { w: number; h: number };
export type Point = { x: number; y: number };
export type View = { k: number; u: number; v: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;
/** One press of Zoom in / Zoom out. */
export const ZOOM_STEP = 1.5;
/** Zoom used by a double-click on a fitted page. */
export const DOUBLE_CLICK_ZOOM = 2.5;

export const FIT_VIEW: View = { k: MIN_ZOOM, u: 0.5, v: 0.5 };

export const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number.isFinite(k) ? k : MIN_ZOOM));

/** Largest size that shows the whole image inside the container, keeping its proportions. */
export function fitSize(container: Size, natural: Size): Size {
  if (container.w <= 0 || container.h <= 0 || natural.w <= 0 || natural.h <= 0) return { w: 0, h: 0 };
  const s = Math.min(container.w / natural.w, container.h / natural.h);
  return { w: natural.w * s, h: natural.h * s };
}

/** Keep an axis inside the container: centred when the scaled image is smaller, otherwise never showing empty space. */
function clampAxis(t: number, scaled: number, box: number) {
  return scaled <= box ? (box - scaled) / 2 : Math.min(0, Math.max(box - scaled, t));
}

/** Where the scaled image's top-left corner sits in the container for a given view (always clamped). */
export function translateFor(view: View, container: Size, fit: Size): Point {
  const W = fit.w * view.k;
  const H = fit.h * view.k;
  return {
    x: clampAxis(container.w / 2 - view.u * W, W, container.w),
    y: clampAxis(container.h / 2 - view.v * H, H, container.h),
  };
}

/** The view that puts the scaled image's top-left corner at (tx, ty), clamped so every part stays reachable. */
export function viewFromTranslate(k: number, tx: number, ty: number, container: Size, fit: Size): View {
  const z = clampZoom(k);
  const W = fit.w * z;
  const H = fit.h * z;
  if (W <= 0 || H <= 0) return FIT_VIEW;
  const x = clampAxis(tx, W, container.w);
  const y = clampAxis(ty, H, container.h);
  return { k: z, u: (container.w / 2 - x) / W, v: (container.h / 2 - y) / H };
}

/** The image point (fractions) currently under a container point. */
export function anchorAt(view: View, point: Point, container: Size, fit: Size) {
  const t = translateFor(view, container, fit);
  const W = fit.w * view.k;
  const H = fit.h * view.k;
  return { ix: W ? (point.x - t.x) / W : 0.5, iy: H ? (point.y - t.y) / H : 0.5 };
}

/** The view at zoom k with the image point `anchor` under the container point `point`. */
export function viewFromAnchor(k: number, anchor: { ix: number; iy: number }, point: Point, container: Size, fit: Size): View {
  const z = clampZoom(k);
  return viewFromTranslate(z, point.x - anchor.ix * fit.w * z, point.y - anchor.iy * fit.h * z, container, fit);
}

/** Zoom to k while keeping the image point under `point` still (used by buttons, wheel and double-click). */
export function zoomAbout(view: View, k: number, point: Point, container: Size, fit: Size): View {
  return viewFromAnchor(k, anchorAt(view, point, container, fit), point, container, fit);
}

export const centreOf = (container: Size): Point => ({ x: container.w / 2, y: container.h / 2 });

/** Move the image by (dx, dy) screen pixels (dragging, or arrow keys). */
export function panBy(view: View, dx: number, dy: number, container: Size, fit: Size): View {
  const t = translateFor(view, container, fit);
  return viewFromTranslate(view.k, t.x + dx, t.y + dy, container, fit);
}

export const isFit = (view: View) => view.k <= MIN_ZOOM + 1e-6;
export const percent = (view: View) => Math.round(view.k * 100);

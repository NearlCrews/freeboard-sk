import { signal } from '@angular/core';

/**
 * Phase 4a Batch 3: chart-tile night-mode filter.
 *
 * Replaces the old `.app-night` CSS filter that wrapped the entire app
 * frame. That filter forced compositing of the whole map canvas on every
 * frame and degraded pan/zoom perf. The new approach tints each chart
 * tile bitmap once at load time via OffscreenCanvas, so the GPU sees
 * already-red pixels and can composite the layer normally.
 *
 * Scope: raster tiles only. The vector tile path returns features rather
 * than bitmaps and is therefore not handled here. Vector chart usage is
 * rare in this app, and the Phase 3 tokens.css night-red palette already
 * tints all chrome around the chart. A follow-up can add a per-layer
 * `prerender`/`postrender` 2D filter to VectorTileLayer if vector chart
 * users report this gap.
 *
 * No CSS transition is used, so `prefers-reduced-motion` is respected by
 * construction: toggling night-mode flips tiles as they are re-fetched,
 * with no animated chrome.
 */

/**
 * Writable signal mirroring the app's effective night-mode flag. The
 * shell sets this from `stream.selfNightMode() || uiCtrl.forceNightMode`.
 * Tile loaders read the current value when transforming a blob.
 */
export const chartNightMode = signal<boolean>(false);

/**
 * True iff the runtime exposes both `OffscreenCanvas` and
 * `createImageBitmap`. When false, `applyChartNightFilter` is a no-op
 * and the original blob is returned unchanged.
 */
const OFFSCREEN_CANVAS_SUPPORTED: boolean =
  typeof OffscreenCanvas !== 'undefined' &&
  typeof createImageBitmap === 'function';

/**
 * Canvas 2D `filter` string used to tint chart tiles in night mode.
 * Chosen for deep red dominance to preserve scotopic vision at the helm:
 * heavy brightness drop, sepia warmth, then hue-rotate into red.
 */
const NIGHT_FILTER =
  'brightness(0.4) saturate(0.7) sepia(1) hue-rotate(-50deg)';

/**
 * Apply the night-mode color transform to `blob`, returning a tinted Blob.
 * Returns the original blob unchanged when night-mode is off, when the
 * runtime lacks OffscreenCanvas, or if the canvas 2D context cannot be
 * acquired.
 */
export async function applyChartNightFilter(blob: Blob): Promise<Blob> {
  if (!chartNightMode() || !OFFSCREEN_CANVAS_SUPPORTED) {
    return blob;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    return blob;
  }
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    // willReadFrequently hints Chrome to back the canvas with a CPU
    // buffer instead of the GPU, since convertToBlob() forces a
    // readback every tile. Without the hint Chrome logs a Canvas2D
    // perf warning on every tile when night-mode is on.
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return blob;
    }
    ctx.filter = NIGHT_FILTER;
    ctx.drawImage(bitmap, 0, 0);
    return await canvas.convertToBlob();
  } finally {
    bitmap.close();
  }
}

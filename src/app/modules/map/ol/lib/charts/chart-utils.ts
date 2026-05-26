import { Extent } from 'ol/extent';
import { transformExtent } from 'ol/proj';
import { applyChartNightFilter } from './night-mode-filter';

/**
 * Assign a Blob to an image element via a temporary object URL, then revoke
 * the URL once the image has either loaded or errored. Without the revoke,
 * the browser keeps the underlying Blob alive for the lifetime of the
 * document, which on tile-heavy maps quickly accumulates into hundreds of
 * megabytes of leaked memory.
 *
 * When chart night-mode is active and the runtime supports OffscreenCanvas,
 * the blob is first tinted via `applyChartNightFilter` so the GPU sees
 * already-red pixels. When night-mode is off the filter returns the original
 * blob immediately, so the only added per-tile cost is one microtask hop.
 */
export async function assignImageBlob(
  img: HTMLImageElement,
  blob: Blob
): Promise<void> {
  const tinted = await applyChartNightFilter(blob);
  const objectUrl = URL.createObjectURL(tinted);
  let revoked = false;
  function cleanup(): void {
    if (revoked) return;
    revoked = true;
    URL.revokeObjectURL(objectUrl);
  }
  img.addEventListener('load', cleanup, { once: true });
  img.addEventListener('error', cleanup, { once: true });
  img.src = objectUrl;
}

export function resolveLayerMaxZoom(
  chartMax?: number,
  mapMax?: number,
  overZoomTiles = false
): number | undefined {
  if (overZoomTiles && typeof mapMax === 'number') {
    return typeof chartMax === 'number' ? Math.max(chartMax, mapMax) : mapMax;
  }
  return chartMax;
}

/**
 * Convert bounds in chart metadata [minLon, minLat, maxLon, maxLat] to an EPSG:3857 extent.
 * @returns undefined if bounds are invalid or missing
 */
export function extentFromBounds(bounds?: number[]): Extent | undefined {
  if (!Array.isArray(bounds) || bounds.length < 4) return undefined;
  const [minLon, minLat, maxLon, maxLat] = bounds as [
    number,
    number,
    number,
    number
  ];
  if (minLon <= -180 || minLat <= -90 || maxLon >= 180 || maxLat >= 90) {
    return undefined;
  }
  return transformExtent(bounds, 'EPSG:4326', 'EPSG:3857');
}

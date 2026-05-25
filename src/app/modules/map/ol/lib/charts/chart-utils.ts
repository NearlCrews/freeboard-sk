import { Extent } from 'ol/extent';
import { transformExtent } from 'ol/proj';

/**
 * Assign a Blob to an image element via a temporary object URL, then revoke
 * the URL once the image has either loaded or errored. Without the revoke,
 * the browser keeps the underlying Blob alive for the lifetime of the
 * document, which on tile-heavy maps quickly accumulates into hundreds of
 * megabytes of leaked memory.
 */
export function assignImageBlob(img: HTMLImageElement, blob: Blob): string {
  const objectUrl = URL.createObjectURL(blob);
  let revoked = false;
  const cleanup = () => {
    if (revoked) return;
    revoked = true;
    URL.revokeObjectURL(objectUrl);
  };
  img.addEventListener('load', cleanup, { once: true });
  img.addEventListener('error', cleanup, { once: true });
  img.src = objectUrl;
  return objectUrl;
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
 * Convert bounds in  chart metadata [minLon, minLat, maxLon, maxLat] to an EPSG:3857 extent
 * @returns undefined if bounds are invalid or missing
 */
export function extentFromBounds(bounds?: number[]): Extent | undefined {
  if (!Array.isArray(bounds) || bounds.length < 4) return undefined;
  if (
    bounds[0] <= -180 ||
    bounds[1] <= -90 ||
    bounds[2] >= 180 ||
    bounds[3] >= 90
  ) {
    return undefined;
  }
  return transformExtent(bounds, 'EPSG:4326', 'EPSG:3857');
}

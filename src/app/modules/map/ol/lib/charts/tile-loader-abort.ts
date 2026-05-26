import TileState from 'ol/TileState';
import type ImageTile from 'ol/ImageTile';
import type Tile from 'ol/Tile';
import type { LoadFunction } from 'ol/Tile';
import type VectorTile from 'ol/VectorTile';
import type { FeatureLike } from 'ol/Feature';
import type { Extent } from 'ol/extent';
import type Projection from 'ol/proj/Projection';
import { assignImageBlob } from './chart-utils';

type PendingByZoom = Map<number, Set<AbortController>>;

/**
 * Abort and drop controllers held under zoom levels other than `z`, then
 * return (or create) the controller bucket for `z`. Shared between the
 * raster and vector loaders so the bookkeeping stays in lockstep.
 */
function bucketForZoom(
  pending: PendingByZoom,
  z: number
): Set<AbortController> {
  for (const [oldZ, controllers] of pending) {
    if (oldZ !== z) {
      for (const c of controllers) c.abort();
      pending.delete(oldZ);
    }
  }
  let set = pending.get(z);
  if (!set) {
    set = new Set();
    pending.set(z, set);
  }
  return set;
}

function releaseController(
  pending: PendingByZoom,
  z: number,
  controller: AbortController
): void {
  const s = pending.get(z);
  if (s) {
    s.delete(controller);
    if (s.size === 0) pending.delete(z);
  }
}

/**
 * Build an OL raster `tileLoadFunction` that aborts in-flight loads from
 * superseded zoom levels. When a new tile request arrives at zoom Z, any
 * outstanding controllers for zoom !== Z are aborted so they free up the
 * browser's connection pool for the now-visible level.
 */
export function createAbortableRasterTileLoader(): (
  tile: Tile,
  src: string
) => void {
  const pending: PendingByZoom = new Map();

  return function loader(tile: Tile, src: string) {
    const z = tile.getTileCoord()[0] ?? 0;
    const bucket = bucketForZoom(pending, z);

    const controller = new AbortController();
    bucket.add(controller);

    const img = (tile as ImageTile).getImage() as HTMLImageElement;
    tile.setState(TileState.LOADING);

    fetch(src, { signal: controller.signal })
      .then((r) => r.blob())
      .then((blob) => assignImageBlob(img, blob))
      .then(() => {
        tile.setState(TileState.LOADED);
      })
      .catch((err: unknown) => {
        // On AbortError the tile will be re-requested when its zoom
        // returns to view; setting ERROR would block that re-request.
        if (!(err instanceof Error) || err.name !== 'AbortError') {
          tile.setState(TileState.ERROR);
        }
      })
      .finally(() => {
        releaseController(pending, z, controller);
      });
  };
}

/**
 * Build an OL VectorTile `tileLoadFunction` with the same supersede-and-abort
 * semantic as the raster loader. The fetch is wrapped inside `tile.setLoader`
 * because OL's VectorTile contract has the tile own its decoded features.
 */
export function createAbortableVectorTileLoader(): LoadFunction {
  const pending: PendingByZoom = new Map();

  return function loader(tile: Tile, src: string) {
    const vectorTile = tile as VectorTile<FeatureLike>;
    const z = tile.getTileCoord()[0] ?? 0;
    const bucket = bucketForZoom(pending, z);

    vectorTile.setLoader(
      (extent: Extent, _resolution: number, projection: Projection) => {
        const controller = new AbortController();
        bucket.add(controller);

        tile.setState(TileState.LOADING);
        fetch(src, { signal: controller.signal })
          .then((r) => r.arrayBuffer())
          .then((data) => {
            const format = vectorTile.getFormat();
            const features = format.readFeatures(data, {
              extent,
              featureProjection: projection
            }) as FeatureLike[];
            vectorTile.setFeatures(features);
            tile.setState(TileState.LOADED);
          })
          .catch((err: unknown) => {
            if (!(err instanceof Error) || err.name !== 'AbortError') {
              tile.setState(TileState.ERROR);
            }
          })
          .finally(() => {
            releaseController(pending, z, controller);
          });
      }
    );
  };
}

/**
 * Shared tuning knobs for OL tile sources used by freeboard charts and
 * live layers. Centralized so a future revision is a one-line change
 * across every chart source instead of grepping for magic numbers.
 *
 * Raster cache: pixel data is shared with the browser image cache via
 * the held HTMLImageElement references, so the per-entry cost is small
 * and a larger working set survives common zoom-out and zoom-back-in
 * cycles without re-fetching. OL default is 512.
 *
 * Vector cache: decoded features live in JS memory at full per-entry
 * cost, so the cap is intentionally smaller to keep peak memory bounded
 * on dense charts (S57 ENC, MapBox-style city tiles).
 */
export const RASTER_TILE_CACHE_SIZE = 1024;
export const VECTOR_TILE_CACHE_SIZE = 256;

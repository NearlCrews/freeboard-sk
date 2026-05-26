import type WebGLTileLayer from 'ol/layer/WebGLTile';
import { NIGHT_MODE_COLOR_EXPRESSION } from './night-mode-shader';

/**
 * Apply the night-mode color transform to a `WebGLTileLayer` via OL's
 * style-expression DSL. The renderer compiles the expression into a
 * fragment shader at layer init time, so the per-pixel multiply happens
 * on the GPU rather than in an OffscreenCanvas 2D context.
 *
 * This is the WebGL counterpart to `applyChartNightFilter` from
 * Phase 4a. The OffscreenCanvas filter remains the default; this
 * function ships as an alternate for a follow-up that wires it to
 * `chartNightMode()` flips on raster chart layers.
 */
export function applyNightMode(layer: WebGLTileLayer | undefined): void {
  if (!layer) {
    return;
  }
  layer.setStyle({ color: NIGHT_MODE_COLOR_EXPRESSION });
}

/**
 * Remove the night-mode tint from a `WebGLTileLayer` by resetting the
 * style to an empty object. OL treats an empty style as identity, so
 * the source tile pixels render unchanged.
 */
export function removeNightMode(layer: WebGLTileLayer | undefined): void {
  if (!layer) {
    return;
  }
  layer.setStyle({});
}

/**
 * WebGL flat-style literal for AIS point rendering.
 *
 * OL `WebGLPointsLayer` consumes the flat-style format (kebab-case keys with
 * expression values such as `['get', 'propName', fallback]`). Per-feature
 * variation is sourced from feature properties set via `Feature.set(key, val)`:
 *   - color: shipType-bucketed fill color (string, e.g. '#33AAFF')
 *   - iconScale: per-feature radius multiplier (number, used as base radius)
 *   - opacity: per-feature opacity (0..1), reduced for stale targets
 *
 * Properties not set on a feature fall back to the literal defaults below.
 */

import type { FlatStyle } from 'ol/style/flat';

export const AIS_DEFAULT_COLOR = '#888888';
export const AIS_DEFAULT_RADIUS = 6;
export const AIS_DEFAULT_OPACITY = 0.9;
export const AIS_STALE_OPACITY = 0.4;
export const AIS_STROKE_COLOR = '#222222';
export const AIS_STROKE_WIDTH = 1;

/** Bucket a numeric AIS shipType id (0..99) to its decade (10, 20, ..., 90). */
export function shipTypeBucket(typeId: number | null | undefined): number {
  if (typeof typeId !== 'number' || isNaN(typeId)) {
    return 0;
  }
  return Math.floor(typeId / 10) * 10;
}

/**
 * Color per shipType decade. Source buckets mirror
 * `aislist.ts#shipTypes` (10/20/30/40/50/60/70/80/90).
 */
export const SHIP_TYPE_COLOR: Record<number, string> = {
  10: '#9E9E9E', // Unspecified, grey
  20: '#7E57C2', // Wing in Ground, purple
  30: '#26A69A', // Pleasure, teal
  40: '#FFB300', // High Speed, amber
  50: '#EF5350', // Special, red
  60: '#42A5F5', // Passenger, blue
  70: '#8D6E63', // Cargo, brown
  80: '#5C6BC0', // Tanker, indigo
  90: '#66BB6A' // Other, green
};

export function colorForShipType(typeId: number | null | undefined): string {
  const bucket = shipTypeBucket(typeId);
  return SHIP_TYPE_COLOR[bucket] ?? AIS_DEFAULT_COLOR;
}

/**
 * Build the flat-style literal. Returns a fresh object so each layer instance
 * owns its own style: WebGLPointsLayer parses the literal at construction.
 */
export function buildAisPointsStyle(): FlatStyle {
  return {
    'circle-radius': ['get', 'iconScale', AIS_DEFAULT_RADIUS],
    'circle-fill-color': ['get', 'color', AIS_DEFAULT_COLOR],
    'circle-stroke-color': AIS_STROKE_COLOR,
    'circle-stroke-width': AIS_STROKE_WIDTH,
    'circle-opacity': ['get', 'opacity', AIS_DEFAULT_OPACITY]
  };
}

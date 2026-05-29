import type { ExpressionValue } from 'ol/expr/expression';

/**
 * OL style-expression for chart-tile night-mode tinting.
 *
 * Bands are 1-indexed per OL's `band` operator: 1=R, 2=G, 3=B, 4=A.
 * `array` produces a vec4 that OL's WebGLTile renderer assigns to
 * `gl_FragColor`. The multipliers preserve red dominance and crush
 * green/blue, matching the OffscreenCanvas filter chain from Phase 4a
 * (brightness 0.4 + saturate 0.7 + sepia + hue-rotate -50deg lands in
 * the same red-tinted gamut).
 */
export const NIGHT_MODE_COLOR_EXPRESSION: ExpressionValue = [
  'array',
  ['*', ['band', 1], 0.8],
  ['*', ['band', 2], 0.2],
  ['*', ['band', 3], 0.2],
  ['band', 4]
];

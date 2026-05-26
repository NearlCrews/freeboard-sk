import type { ExpressionValue } from 'ol/expr/expression';

/**
 * GLSL fragment shader source for chart-tile night-mode tinting.
 *
 * Kept as a string constant so a follow-up that adopts OL's experimental
 * shader-injection API on `WebGLTileLayerRenderer` can pass it directly.
 * The active implementation in `night-mode-webgl.ts` uses OL's documented
 * style-expression DSL, which the OL renderer compiles into an equivalent
 * shader at layer init time. This source is the documentation of intent.
 */
export const NIGHT_MODE_FRAGMENT_SHADER_SOURCE = `
precision mediump float;
varying vec2 v_textureCoord;
uniform sampler2D u_tileTexture;

void main() {
  vec4 src = texture2D(u_tileTexture, v_textureCoord);
  vec3 tinted = vec3(
    src.r * 0.8,
    src.g * 0.2,
    src.b * 0.2
  );
  gl_FragColor = vec4(tinted, src.a);
}
`;

export function getNightModeShaderSource(): string {
  return NIGHT_MODE_FRAGMENT_SHADER_SOURCE;
}

/**
 * The OL style-expression equivalent of the fragment shader above.
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

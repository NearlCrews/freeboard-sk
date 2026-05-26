export {
  NIGHT_MODE_FRAGMENT_SHADER_SOURCE,
  NIGHT_MODE_COLOR_EXPRESSION,
  getNightModeShaderSource
} from './night-mode-shader';
export { applyNightMode, removeNightMode } from './night-mode-webgl';

export {
  AIS_DEFAULT_COLOR,
  AIS_DEFAULT_OPACITY,
  AIS_DEFAULT_RADIUS,
  AIS_STALE_OPACITY,
  AIS_STROKE_COLOR,
  AIS_STROKE_WIDTH,
  SHIP_TYPE_COLOR,
  buildAisPointsStyle,
  colorForShipType,
  shipTypeBucket
} from './ais-points-style';

export { WebGLAISLayerComponent } from './layer-ais-webglpoints.component';

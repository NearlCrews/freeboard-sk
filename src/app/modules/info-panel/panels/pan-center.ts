import type { Position } from 'src/app/types';

/**
 * Output payload emitted by info-panel `panTo` events. Consumed by the
 * map shell which centers the view on the target position, optionally
 * adjusting the zoom level. All four info-panel variants (vessel,
 * aircraft, AtoN, alarm) emit the same shape.
 */
export interface PanCenter {
  center: Position;
  zoomLevel?: number;
}

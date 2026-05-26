import { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Coordinate, Extent } from '../models';

export type InteractionName =
  | 'singleClick'
  | 'doubleClick'
  | 'dragRotate'
  | 'pinchZoom';

export interface MapPointerSample {
  coordinate: Coordinate;
  pixel: [number, number];
}

export interface MapMoveSample {
  center: Coordinate;
  zoom: number;
  extent: Extent;
}

export interface MapViewOptions {
  center: Coordinate;
  zoom: number;
  rotation?: number;
}

export interface MapAnimateOptions {
  duration?: number;
}

export interface MapLayerOptions {
  zIndex?: number;
}

/**
 * Thin facade over an underlying map engine. The OL implementation lives in
 * `ol-map-adapter.ts`; consumers should depend on this contract so that
 * `ol/Map`, `ol/View`, and the interaction zoo stay inside the adapter.
 *
 * Coordinates crossing this boundary are geographic (lon, lat). The adapter
 * converts to the engine's projection internally.
 */
export interface IMapAdapter {
  readonly ready: Signal<boolean>;

  initialize(target: HTMLElement): void;
  destroy(): void;

  setView(opts: MapViewOptions): void;
  getCenter(): Coordinate | null;
  getZoom(): number | null;
  getRotation(): number;
  getExtent(): Extent | null;
  panTo(center: Coordinate, opts?: MapAnimateOptions): void;
  zoomTo(zoom: number, opts?: MapAnimateOptions): void;

  addLayer(layer: unknown, opts?: MapLayerOptions): void;
  removeLayer(layer: unknown): void;
  getLayers(): unknown[];

  enableInteraction(name: InteractionName): void;
  disableInteraction(name: InteractionName): void;

  readonly mapClick$: Observable<MapPointerSample>;
  readonly mapMoveEnd$: Observable<MapMoveSample>;
  readonly pointerMove$: Observable<MapPointerSample>;
}

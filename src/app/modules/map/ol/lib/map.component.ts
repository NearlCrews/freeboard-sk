import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  ElementRef,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  output,
  signal,
  SimpleChanges,
  OnChanges
} from '@angular/core';
import { Map, MapBrowserEvent } from 'ol';
import MapEvent from 'ol/MapEvent';
import ObjectEvent from 'ol/Object';
import RenderEvent from 'ol/render/Event';
import TileSource from 'ol/source/Tile';
import type Layer from 'ol/layer/Layer';
import { MapService } from './map.service';
import { MapReadyEvent } from './models';
import { AsyncSubject } from 'rxjs';
import { toLonLat, transformExtent } from 'ol/proj';
import { Coordinate } from 'ol/coordinate';
import { FeatureLike } from 'ol/Feature';
import { Extent } from 'ol/extent';
import { chartNightMode } from './charts/night-mode-filter';

export interface FBMapEvent extends MapEvent {
  lonlat: Coordinate;
  zoom: number;
  zoomChanged: boolean;
  extent: Extent;
  projCode: string;
  /** Geographic coords of the viewport's top-centre pixel (rotation-aware) */
  topCenter: Coordinate;
  /** Geographic coords of the viewport's right-centre pixel (rotation-aware) */
  rightCenter: Coordinate;
  /** OL view rotation in radians (CCW positive) at the time of the event */
  rotation: number;
}

export interface FBClickEvent extends MapBrowserEvent<PointerEvent> {
  features: FeatureLike[];
  lonlat: Coordinate;
}

export interface FBPointerEvent extends MapBrowserEvent<PointerEvent> {
  lonlat: Coordinate;
}

// used for wind vector scaling
export const zoomOffsetLevel = [
  1, 1000000, 550000, 290000, 140000, 70000, 38000, 17000, 7600, 3900, 1900,
  950, 470, 250, 120, 60, 30, 15.5, 8.1, 4, 2, 1, 0.5, 0.25, 0.12, 0.06, 0.03,
  0.015, 0.008, 1
];

@Component({
  selector: 'ol-map',
  styleUrls: ['./map.component.scss'],
  template: `
    <div
      style="width: 100%; height: 100%; margin: 0; padding: 0; touch-action: none;"
      tabindex="-1"
    ></div>
    <ng-content></ng-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class MapComponent implements OnInit, OnDestroy, OnChanges {
  private map: Map | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | undefined;

  /**
   * This event is triggered after the map is initialized
   * Use this to have access to the maps and some helper functions
   */
  @Output() mapReady = new AsyncSubject<MapReadyEvent>(); // AsyncSubject will only store the last value, and only publish it when the sequence is completed

  /**
   * This event is triggered after the user clicks on the map.
   * A true single click with no dragging and no double click.
   * Note that this event is delayed by 250 ms to ensure that it is not a double click.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly mapClick = output<any>();
  readonly mapRightClick = output<{
    features: FeatureLike[];
    lonlat: Coordinate;
  }>();
  readonly mapContextMenu = output<FBPointerEvent>();
  readonly mapSingleClick = output<FBClickEvent>();
  readonly mapDblClick = output<FBClickEvent>();
  readonly mapMoveStart = output<MapEvent>();
  readonly mapMoveEnd = output<MapEvent>();
  readonly mapPointerDrag = output<FBPointerEvent>();
  readonly mapPointerMove = output<FBPointerEvent>();
  readonly mapPointerDown = output<FBPointerEvent>();
  readonly mapPostCompose = output<RenderEvent>();
  readonly mapPostRender = output<MapEvent>();
  readonly mapPreCompose = output<RenderEvent>();
  readonly mapPropertyChange = output<ObjectEvent>();

  @Input() pixelRatio?: number;
  @Input() keyboardEventTarget?: Element | string;
  @Input() logo?: string | boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Input() properties?: Record<string, any>;
  @Input() setFocus = '';
  @Input() hitTolerance = 5;

  private _pointerDown = signal<MouseEvent | undefined>(undefined);
  public pointerDownSignal = this._pointerDown.asReadonly();

  protected changeDetectorRef = inject(ChangeDetectorRef);
  protected element = inject(ElementRef);
  protected mapService = inject(MapService);

  constructor() {
    this.changeDetectorRef.detach();
    // When chart night-mode toggles, invalidate raster tile caches so
    // subsequent fetches run through the OffscreenCanvas filter in
    // `assignImageBlob`. The TileSource check avoids touching VectorSource
    // feature layers (which would clear vessel/AIS state).
    effect(() => {
      chartNightMode();
      if (!this.map) {
        return;
      }
      this.map.getLayers().forEach((layer) => {
        const tileLayer = layer as Layer<TileSource>;
        if (typeof tileLayer.getSource !== 'function') {
          return;
        }
        const source = tileLayer.getSource();
        if (source instanceof TileSource) {
          source.refresh();
        }
      });
    });
  }

  ngOnInit() {
    const target = this.element.nativeElement.firstElementChild;
    const map = new Map({
      // 2x OL default (16); keeps the browser HTTP/1.1 per-host connection
      // pool fully fed during zoom-out tile bursts.
      maxTilesLoading: 32
    });
    this.map = map;
    map.setTarget(target);
    if (this.properties) {
      map.setProperties(this.properties, true);
    }
    // register the map in the injectable mapService
    this.mapService.addMap(map);

    map.once('postrender', () => {
      this.afterMapReady();
    });
  }

  ngOnDestroy() {
    const map = this.map;
    if (!map) {
      return;
    }
    map.un('singleclick', this.emitSingleClickEvent);
    map.un('dblclick', this.emitDblClickEvent);
    map.un('click', this.emitClickEvent);
    map.un('movestart', this.emitMoveStartEvent);
    map.un('moveend', this.emitMoveEndEvent);
    map.un('pointerdrag', this.emitPointerDragEvent);
    map.un('pointermove', this.emitPointerMoveEvent);
    map.un('postcompose', this.emitPostComposeEvent);
    map.un('postrender', this.emitPostRenderEvent);
    map.un('precompose', this.emitPreComposeEvent);
    // right click handler
    map
      .getViewport()
      .removeEventListener('contextmenu', this.rightClickHandler);
    map
      .getViewport()
      .removeEventListener('pointerdown', this.pointerDownHandler);
    map.getViewport().removeEventListener('pointerup', this.pointerUpHandler);
    window.removeEventListener('resize', this.updateSizeThrottle);
    window.removeEventListener('orientationchange', this.updateSizeThrottle);

    map.setTarget(undefined);
    this.map = null;
  }

  ngOnChanges(changes: SimpleChanges) {
    const focusChange = changes['setFocus'];
    if (this.map && focusChange && focusChange.currentValue) {
      this.focusMap();
    }
  }

  afterMapReady() {
    const map = this.map;
    if (!map) return;
    map.on('singleclick', this.emitSingleClickEvent);
    map.on('dblclick', this.emitDblClickEvent);
    map.on('click', this.emitClickEvent);
    map.on('movestart', this.emitMoveStartEvent);
    map.on('moveend', this.emitMoveEndEvent);
    map.on('pointerdrag', this.emitPointerDragEvent);
    map.on('pointermove', this.emitPointerMoveEvent);
    map.on('postcompose', this.emitPostComposeEvent);
    map.on('postrender', this.emitPostRenderEvent);
    map.on('precompose', this.emitPreComposeEvent);

    // right click handler
    map.getViewport().addEventListener('contextmenu', this.rightClickHandler);
    map.getViewport().addEventListener('pointerdown', this.pointerDownHandler);
    map.getViewport().addEventListener('pointerup', this.pointerUpHandler);

    // react on window events
    window.addEventListener('resize', this.updateSizeThrottle, false);
    window.addEventListener(
      'orientationchange',
      this.updateSizeThrottle,
      false
    );

    this.updateSize();

    this.mapReady.next({ map: map, mapService: this.mapService });
    this.mapReady.complete();

    if (this.setFocus) {
      this.focusMap();
    }
  }

  // Only arrow function works with addEventListener

  // Long Press Detection (iOS & Android)
  private touchTimer: ReturnType<typeof setTimeout> | undefined;
  private evCache: Record<number, PointerEvent> = {};
  private clearTouchTimer = () => {
    clearTimeout(this.touchTimer);
    this.evCache = {};
  };
  private touchHold = () => {
    if (Object.keys(this.evCache).length === 1) {
      const first = Object.values(this.evCache)[0];
      if (!first) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.mapContextMenu.emit(first as any);
      this.rightClickHandler(first);
    }
  };
  private pointerDownHandler = (event: PointerEvent) => {
    this.evCache[event.pointerId] = event;
    this.touchTimer = setTimeout(this.touchHold, 500);
    if (!this.map) return;
    const c = toLonLat(this.map.getEventCoordinate(event));
    const e = Object.assign(event, { lonlat: c });
    this.mapService.clearFeatureUrls();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.mapPointerDown.emit(e as any);
    this._pointerDown.update(() => e);
  };
  private pointerUpHandler = () => {
    this.clearTouchTimer();
  };
  private rightClickHandler = (event: MouseEvent) => {
    this.clearTouchTimer();
    this.emitRightClickEvent(event);
  };

  private emitClickEvent = (event: MapBrowserEvent) => {
    this.mapClick.emit(this.augmentClickEvent(event));
  };

  private emitRightClickEvent = (event: MouseEvent) => {
    event.preventDefault();
    const map = this.map;
    if (!map) return;
    const c = map.getEventCoordinate(event);
    this.mapRightClick.emit({
      features: map.getFeaturesAtPixel(map.getPixelFromCoordinateInternal(c), {
        hitTolerance: this.hitTolerance
      }),
      lonlat: toLonLat(c)
    });
  };
  private emitSingleClickEvent = (event: MapBrowserEvent) => {
    this.mapSingleClick.emit(this.augmentClickEvent(event));
  };
  private emitDblClickEvent = (event: MapBrowserEvent) => {
    this.mapDblClick.emit(this.augmentClickEvent(event));
  };

  // ** add {lonlat, features}fields to event
  private augmentClickEvent(event: MapBrowserEvent) {
    return Object.assign(event, {
      features:
        this.map?.getFeaturesAtPixel(event.pixel, {
          hitTolerance: this.hitTolerance
        }) ?? [],
      lonlat: toLonLat(event.coordinate)
    }) as FBClickEvent;
  }

  private zoomAtStart: number | undefined;
  private emitMoveStartEvent = (event: MapEvent) => {
    this.zoomAtStart = this.map?.getView().getZoom();
    this.mapMoveStart.emit(this.augmentMoveEvent(event));
  };
  private emitMoveEndEvent = (event: MapEvent) => {
    this.mapMoveEnd.emit(this.augmentMoveEvent(event));
  };

  // ** add {lonlat, zoom, extent, projCode, topCenter, rightCenter, rotation} fields to event
  private augmentMoveEvent(event: MapEvent) {
    const view = this.map?.getView();
    const zoom = view?.getZoom();
    return Object.assign(event, {
      lonlat: this.getMapCenter(),
      zoom: zoom,
      zoomChanged: this.zoomAtStart !== zoom,
      extent: this.getMapExtent(),
      projCode: view?.getProjection().getCode() ?? '',
      topCenter: this.getMapViewTopCenter(),
      rightCenter: this.getMapViewRightCenter(),
      rotation: view?.getRotation() ?? 0
    });
  }

  private emitPointerDragEvent = (event: MapBrowserEvent) => {
    this.clearTouchTimer();
    this.mapPointerDrag.emit(this.augmentPointerEvent(event));
  };
  private emitPointerMoveEvent = (event: MapBrowserEvent) => {
    this.clearTouchTimer();
    this.mapPointerMove.emit(this.augmentPointerEvent(event));
  };

  // ** add {lonlat} field to event
  private augmentPointerEvent(event: MapBrowserEvent) {
    return Object.assign(event, {
      lonlat: toLonLat(event.coordinate)
    }) as FBPointerEvent;
  }

  private emitPostComposeEvent = (event: RenderEvent) =>
    this.mapPostCompose.emit(event);
  private emitPostRenderEvent = (event: MapEvent) =>
    this.mapPostRender.emit(event);
  private emitPreComposeEvent = (event: RenderEvent) =>
    this.mapPreCompose.emit(event);

  private updateSizeThrottle = () => {
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.map?.updateSize();
    }, 100);
  };

  focusMap() {
    this.element.nativeElement.firstElementChild.focus();
  }

  getMap() {
    return this.map;
  }

  updateSize() {
    this.updateSizeThrottle();
  }

  getMapCenter(): Coordinate {
    if (!this.map) {
      return [0, 0];
    }
    const center = this.map.getView().getCenter();
    if (!center) {
      return [0, 0];
    }
    return toLonLat(center);
  }

  getMapExtent() {
    if (!this.map) {
      return [0, 0, 0, 0];
    }
    const v = this.map.getView();
    const mrid = v.getProjection().getCode();

    return transformExtent(
      v.calculateExtent(this.map.getSize()),
      mrid,
      'EPSG:4326'
    );
  }

  /**
   * Returns the geographic coordinates [lon, lat] of the viewport's
   * top-centre pixel, correctly accounting for map rotation.
   * In OL, positive rotation is CCW. The projected-space unit vector
   * pointing "up" on screen is (-sin θ, cos θ).
   */
  getMapViewTopCenter(): Coordinate {
    if (!this.map) {
      return [0, 0];
    }
    const v = this.map.getView();
    const center = v.getCenter();
    const size = this.map.getSize();
    const resolution = v.getResolution();
    if (!center || !size || resolution === undefined) {
      return [0, 0];
    }
    const rot = v.getRotation();
    const hh = ((size[1] ?? 0) / 2) * resolution;
    return toLonLat(
      [
        (center[0] ?? 0) - hh * Math.sin(rot),
        (center[1] ?? 0) + hh * Math.cos(rot)
      ],
      v.getProjection()
    );
  }

  /**
   * Returns the geographic coordinates [lon, lat] of the viewport's
   * right-centre pixel, correctly accounting for map rotation.
   * In OL, positive rotation is CCW. The projected-space unit vector
   * pointing "right" on screen is (cos θ, sin θ).
   */
  getMapViewRightCenter(): Coordinate {
    if (!this.map) {
      return [0, 0];
    }
    const v = this.map.getView();
    const center = v.getCenter();
    const size = this.map.getSize();
    const resolution = v.getResolution();
    if (!center || !size || resolution === undefined) {
      return [0, 0];
    }
    const rot = v.getRotation();
    const hw = ((size[0] ?? 0) / 2) * resolution;
    return toLonLat(
      [
        (center[0] ?? 0) + hw * Math.cos(rot),
        (center[1] ?? 0) + hw * Math.sin(rot)
      ],
      v.getProjection()
    );
  }
}

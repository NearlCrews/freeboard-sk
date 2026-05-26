import { signal, Signal, WritableSignal } from '@angular/core';
import { Map as OLMap, MapBrowserEvent } from 'ol';
import MapEvent from 'ol/MapEvent';
import View from 'ol/View';
import BaseLayer from 'ol/layer/Base';
import {
  DoubleClickZoom,
  DragRotate,
  Interaction,
  PinchZoom
} from 'ol/interaction';
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj';
import { Observable, Subject } from 'rxjs';
import { Coordinate, Extent } from '../models';
import {
  IMapAdapter,
  InteractionName,
  MapAnimateOptions,
  MapLayerOptions,
  MapMoveSample,
  MapPointerSample,
  MapViewOptions
} from './imap-adapter';

const ZERO_EXTENT: Extent = [0, 0, 0, 0];

type InteractionCtor = new () => Interaction;

const INTERACTION_CTORS: Record<InteractionName, InteractionCtor> = {
  singleClick: DoubleClickZoom,
  doubleClick: DoubleClickZoom,
  dragRotate: DragRotate,
  pinchZoom: PinchZoom
};

export class OlMapAdapter implements IMapAdapter {
  private map: OLMap | null = null;
  private readonly _ready: WritableSignal<boolean> = signal(false);
  readonly ready: Signal<boolean> = this._ready.asReadonly();

  private readonly _mapClick = new Subject<MapPointerSample>();
  private readonly _mapMoveEnd = new Subject<MapMoveSample>();
  private readonly _pointerMove = new Subject<MapPointerSample>();

  readonly mapClick$: Observable<MapPointerSample> =
    this._mapClick.asObservable();
  readonly mapMoveEnd$: Observable<MapMoveSample> =
    this._mapMoveEnd.asObservable();
  readonly pointerMove$: Observable<MapPointerSample> =
    this._pointerMove.asObservable();

  private readonly interactions = new Map<InteractionName, Interaction>();

  initialize(target: HTMLElement): void {
    if (this.map) {
      return;
    }
    const map = new OLMap({
      view: new View({ center: fromLonLat([0, 0]), zoom: 2 }),
      maxTilesLoading: 32
    });
    this.map = map;
    map.setTarget(target);

    map.on('click', this.handleClick);
    map.on('moveend', this.handleMoveEnd);
    map.on('pointermove', this.handlePointerMove);
    map.once('postrender', this.handlePostRender);
  }

  destroy(): void {
    const map = this.map;
    if (!map) {
      return;
    }
    map.un('click', this.handleClick);
    map.un('moveend', this.handleMoveEnd);
    map.un('pointermove', this.handlePointerMove);
    map.setTarget(undefined);

    this.interactions.clear();
    this._mapClick.complete();
    this._mapMoveEnd.complete();
    this._pointerMove.complete();

    this._ready.set(false);
    this.map = null;
  }

  setView(opts: MapViewOptions): void {
    const map = this.map;
    if (!map) {
      return;
    }
    const view = new View({
      center: fromLonLat(opts.center),
      zoom: opts.zoom,
      rotation: opts.rotation ?? 0
    });
    map.setView(view);
  }

  getCenter(): Coordinate | null {
    const view = this.map?.getView();
    const center = view?.getCenter();
    if (!center) {
      return null;
    }
    return toLonLat(center);
  }

  getZoom(): number | null {
    const zoom = this.map?.getView().getZoom();
    return zoom ?? null;
  }

  getRotation(): number {
    return this.map?.getView().getRotation() ?? 0;
  }

  getExtent(): Extent | null {
    const map = this.map;
    if (!map) {
      return null;
    }
    const view = map.getView();
    const size = map.getSize();
    if (!size) {
      return null;
    }
    const projected = view.calculateExtent(size);
    return transformExtent(
      projected,
      view.getProjection().getCode(),
      'EPSG:4326'
    ) as Extent;
  }

  panTo(center: Coordinate, opts?: MapAnimateOptions): void {
    const view = this.map?.getView();
    if (!view) {
      return;
    }
    const projected = fromLonLat(center);
    if (opts?.duration && opts.duration > 0) {
      view.animate({ center: projected, duration: opts.duration });
      return;
    }
    view.setCenter(projected);
  }

  zoomTo(zoom: number, opts?: MapAnimateOptions): void {
    const view = this.map?.getView();
    if (!view) {
      return;
    }
    if (opts?.duration && opts.duration > 0) {
      view.animate({ zoom, duration: opts.duration });
      return;
    }
    view.setZoom(zoom);
  }

  addLayer(layer: unknown, opts?: MapLayerOptions): void {
    const map = this.map;
    if (!map || !(layer instanceof BaseLayer)) {
      return;
    }
    if (opts?.zIndex !== undefined) {
      layer.setZIndex(opts.zIndex);
    }
    map.addLayer(layer);
  }

  removeLayer(layer: unknown): void {
    const map = this.map;
    if (!map || !(layer instanceof BaseLayer)) {
      return;
    }
    map.removeLayer(layer);
  }

  getLayers(): unknown[] {
    const map = this.map;
    if (!map) {
      return [];
    }
    return map.getLayers().getArray().slice();
  }

  enableInteraction(name: InteractionName): void {
    const map = this.map;
    if (!map) {
      return;
    }
    const existing = this.interactions.get(name);
    if (existing) {
      existing.setActive(true);
      return;
    }
    const Ctor = INTERACTION_CTORS[name];
    const interaction = new Ctor();
    this.interactions.set(name, interaction);
    map.addInteraction(interaction);
  }

  disableInteraction(name: InteractionName): void {
    const existing = this.interactions.get(name);
    if (!existing) {
      return;
    }
    existing.setActive(false);
  }

  private readonly handlePostRender = (): void => {
    this._ready.set(true);
  };

  private readonly handleClick = (event: MapBrowserEvent): void => {
    this._mapClick.next(this.toPointerSample(event));
  };

  private readonly handlePointerMove = (event: MapBrowserEvent): void => {
    this._pointerMove.next(this.toPointerSample(event));
  };

  private readonly handleMoveEnd = (_event: MapEvent): void => {
    const center = this.getCenter();
    const zoom = this.getZoom();
    const extent = this.getExtent();
    if (center === null || zoom === null) {
      return;
    }
    this._mapMoveEnd.next({
      center,
      zoom,
      extent: extent ?? ZERO_EXTENT
    });
  };

  private toPointerSample(event: MapBrowserEvent): MapPointerSample {
    const pixel = event.pixel;
    return {
      coordinate: toLonLat(event.coordinate),
      pixel: [pixel[0] ?? 0, pixel[1] ?? 0]
    };
  }
}

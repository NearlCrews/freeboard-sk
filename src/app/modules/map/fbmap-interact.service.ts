/** Map interactions Service
 * ************************************/
import { inject, Injectable, signal } from '@angular/core';
import { Feature } from 'ol';
import { Coordinate } from 'ol/coordinate';
import { toLonLat } from 'ol/proj';
import { AppFacade } from 'src/app/app.facade';
import { GeoUtils } from 'src/app/lib/geoutils';

import { LineString, Position } from 'src/app/types';
import {
  SKAircraft,
  SKAtoN,
  SKMeteo,
  SKNote,
  SKRegion,
  SKResourceSet,
  SKRoute,
  SKVessel,
  SKWaypoint
} from '../skresources';
import type { ResourceSet } from 'src/app/types';
import { GeoJSONFeature } from 'ol/format/GeoJSON';
import { AlertData } from '../alarms';

export interface IPopover {
  id: string | null;
  type: string | null;
  icon?: string;
  position: Position;
  show: boolean;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any[];
  featureCount: number;
  resource:
    | [string, SKRoute | SKWaypoint | SKNote | SKRegion]
    | GeoJSONFeature
    | ResourceSet['values']['features'][number]
    | SKResourceSet
    | undefined;
  vessel?: SKVessel;
  isSelf?: boolean;
  aton?: SKAtoN;
  meteo?: SKMeteo;
  aircraft?: SKAircraft;
  alarm?: AlertData;
  s57Feature?: Record<string, string | number>;
  readOnly: boolean;
}

export interface MeasurementDef {
  coords?: Position[];
  index?: number;
  center?: Position | null;
  radius?: number;
}

export type SelectionModeDef = 'seedChart';

export interface SelectionResultDef {
  mode: SelectionModeDef | null;
  bbox?: Position[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

export type DrawFeatureType = 'waypoint' | 'route' | 'region' | 'note'; // feature type to draw

export interface DrawFeatureInfo {
  resourceType: DrawFeatureType | null;
  featureType: 'Point' | 'LineString' | 'Polygon' | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coordinates: any[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  features: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forSave: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style?: any; // feature draw style
}

@Injectable({ providedIn: 'root' })
export class FBMapInteractService {
  // signals
  readonly isMeasuring = signal<boolean>(false);
  readonly isDrawing = signal<boolean>(false);
  readonly isModifying = signal<boolean>(false);
  readonly isBoxSelecting = signal<boolean>(false);

  readonly measurement = signal<MeasurementDef>({
    coords: [],
    index: -1,
    center: null,
    radius: 0
  });

  readonly selection = signal<SelectionResultDef>({
    mode: null
  });

  private selectionResult: SelectionResultDef | null = null;
  public measureGeometryType: 'LineString' | 'Circle' = 'LineString';

  /** draw interaction data */
  public draw: DrawFeatureInfo = {
    resourceType: null,
    featureType: 'Point',
    coordinates: null,
    features: null,
    forSave: null,
    properties: {}
  };

  private app = inject(AppFacade);

  /** add start coordinate to box select */
  initBoxCoord(coord: Position) {
    if (!this.selectionResult) {
      this.selectionResult = { mode: null };
    }
    this.selectionResult.bbox = [coord];
  }

  /** set coordinates array in measurment data */
  set measurementCoords(value: LineString) {
    this.measurement.update((current) => {
      return Object.assign({}, current, { coords: value });
    });
  }

  /** set center position in measurment data */
  set measurementCenter(value: Position) {
    this.measurement.update((current) => {
      return Object.assign({}, current, { center: value });
    });
  }

  /** set radius in measurment data */
  set measurementRadius(value: number) {
    this.measurement.update((current) => {
      return Object.assign({}, current, { radius: value });
    });
  }

  /**
   * add coordinate to measurment data
   * @param pt location to add
   * @returns added distance in meters
   */
  addMeasurementCoord(pt: Position): number {
    const coords = this.measurement().coords ?? [];
    const last = coords[coords.length - 1];
    const d = last ? GeoUtils.distanceTo(last, pt) : 0;
    this.measurement.update((current) => {
      const c: Position[] = [...(current.coords ?? []), pt];
      return Object.assign({}, current, { coords: c });
    });
    return d;
  }

  /**
   * Returns distance to last point in measurment coords array
   * @param pt measure cursor location
   * @returns distance in meters
   */
  distanceFromLastPoint(pt: Position): number {
    if (!pt) {
      return 0;
    }
    const coords = this.measurement().coords ?? [];
    if (coords.length > 0) {
      // return distance between last point in array and pt
      const last = coords[coords.length - 1];
      return last ? GeoUtils.distanceTo(last, pt) : 0;
    } else {
      return 0;
    }
  }

  /**
   * Returns distance to measurment.center
   * @param pt measure cursor location
   * @returns distance in meters
   */
  distanceFromCenter(pt: Position): number {
    const center = this.measurement().center;
    if (!pt || !center) {
      return 0;
    }
    return GeoUtils.distanceTo(center, pt);
  }

  /**
   * Start measuring mode
   */
  startMeasuring(geometryType?: 'LineString' | 'Circle') {
    this.measureGeometryType = geometryType ?? 'LineString';
    this.app.debug(`startMeasuring()...`);
    this.isMeasuring.set(true);
    this.interactionStarted();
  }

  /** Exit measuring mode */
  stopMeasuring() {
    this.app.debug(`stopMeasuring()...`);
    this.isMeasuring.set(false);
    this.interactionEnded();
  }

  /** Start drawing mode */
  startDrawing(resType: DrawFeatureType) {
    this.app.debug(`startDrawing()...`);
    this.isDrawing.set(true);
    this.draw.resourceType = resType;
    this.draw.featureType =
      resType === 'route'
        ? 'LineString'
        : resType === 'region'
          ? 'Polygon'
          : 'Point';
    this.interactionStarted();
  }

  /** Stop drawing mode */
  stopDrawing(feature?: Feature) {
    this.app.debug(`stopDrawing()...`);
    this.isDrawing.set(false);
    if (feature) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geom = feature.getGeometry() as any;
      switch (this.draw.featureType) {
        case 'Point': // waypoint, note
          this.draw.coordinates = toLonLat(geom.getCoordinates());
          break;
        case 'LineString': {
          // route
          const rc: Coordinate[] = geom.getCoordinates();
          this.draw.coordinates = rc.map((i: Coordinate) => toLonLat(i));
          break;
        }
        case 'Polygon': {
          // region
          const p: Coordinate[][] = geom.getCoordinates();
          if (p.length === 0) {
            this.draw.coordinates = [];
          }
          const ring = p[0] ?? [];
          this.draw.coordinates = ring.map((i: Coordinate) => toLonLat(i));
          break;
        }
      }
    }
    this.interactionEnded();
  }

  /** Start modifying mode */
  startModifying(overlay: IPopover) {
    this.app.debug(`startModifying()...`);
    if (this.draw.features.getLength() === 0) {
      return;
    }
    this.isModifying.set(true);
    this.draw.resourceType = (overlay.type ?? null) as DrawFeatureType | null;
    this.draw.featureType = null;
    this.draw.forSave = { id: null, coords: null };
    this.draw.coordinates = null;
    this.draw.properties = {};
    this.interactionStarted();
  }

  /** Stop modifying mode */
  stopModifying() {
    this.app.debug(`stopModifying()...`);
    this.isModifying.set(false);
    this.draw.features = null;
    this.interactionEnded();
  }

  /**
   * Start box selection mode
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  startBoxSelection(mode: SelectionModeDef, data: any) {
    this.app.debug(`startBoxSelection()...`);
    this.selectionResult = {
      mode: mode,
      data: data,
      bbox: []
    };
    this.isBoxSelecting.set(true);
    this.interactionStarted();
  }

  /** Exit measuring mode */
  stopBoxSelection(coords?: Position) {
    this.app.debug(`stopBoxSelection()...`);
    if (coords && this.selectionResult) {
      const bbox = this.selectionResult.bbox ?? [];
      bbox.push(coords);
      this.selectionResult.bbox = bbox;
      this.formatBbox();
      const result = this.selectionResult;
      this.selection.update(() => result);
    }
    this.isBoxSelecting.set(false);
    this.interactionEnded();
  }

  private formatBbox() {
    const bbox = this.selectionResult?.bbox;
    if (!this.selectionResult || !bbox || bbox.length !== 2) {
      return;
    }
    const a = bbox[0] as Position;
    const b = bbox[1] as Position;
    this.selectionResult.bbox = [
      [a[0] < b[0] ? a[0] : b[0], a[1] < b[1] ? a[1] : b[1]],
      [a[0] > b[0] ? a[0] : b[0], a[1] > b[1] ? a[1] : b[1]]
    ];
  }

  /** Common interaction start tasks */
  private interactionStarted() {
    this.app.debug(`interactionStarted()...`);
    this.measurement.set({
      coords: [],
      index: -1,
      center: null,
      radius: 0
    });
    this.app.uiCtrl.update((current) => {
      return Object.assign({}, current, { suppressContextMenu: true });
    });
  }

  /** Interaction cleanup tasks */
  private interactionEnded() {
    this.app.debug(`interactionEnded()...`);
    this.app.uiCtrl.update((current) => {
      return Object.assign({}, current, { suppressContextMenu: false });
    });
    this.measurement.set({
      coords: [],
      index: -1,
      center: null,
      radius: 0
    });
  }
}

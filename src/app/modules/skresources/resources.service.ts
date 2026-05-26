import { inject, Injectable, signal } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import type { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';

import { SignalKClient } from 'src/lib/signalk-client';
import { AppFacade } from 'src/app/app.facade';
import { GeoUtils } from 'src/app/lib/geoutils';

import type { SKInfoLayer } from '.';
import {
  RegionDialog,
  RouteDialog,
  WaypointDialog,
  RelatedNotesDialog,
  TrackDialog,
  ChartPropertiesDialog
} from '.';
import { processUrlTokens } from 'src/app/app.config';

import {
  SKChart,
  SKRoute,
  SKWaypoint,
  SKRegion,
  SKNote,
  SKTrack,
  SKVessel
} from './resource-classes';
import type {
  Routes,
  Waypoints,
  Notes,
  NoteResource,
  Tracks,
  Charts,
  LineString,
  RouteResource,
  WaypointResource,
  RegionResource,
  TrackResource,
  Position,
  Regions,
  ChartResource,
  FBChart,
  FBCharts,
  FBRegion,
  FBNote,
  FBRoute,
  FBRoutes,
  FBWaypoints,
  FBRegions,
  FBNotes,
  FBWaypoint,
  FBTracks,
  FBTrack,
  FBVessels,
  FBVessel,
  ActionResult,
  PathValue
} from 'src/app/types';
import { SKWorkerService } from '../skstream/skstream.service';
import { ChartSeedJobDialog } from './components/charts/chart-seedjob-dialog';

export type SKResourceType =
  | 'routes'
  | 'waypoints'
  | 'regions'
  | 'notes'
  | 'charts'
  | 'tracks';

export type SKSelection = SKResourceType | 'aisTargets' | 'infolayers';

interface ReOpenState {
  key?: string;
  value?: string;
  readOnly?: boolean;
}

// Typed bracket access into IAppConfig.selections without losing the
// discriminated keys. selections.tracks is the only string[] | null entry;
// the others are string[]. Array.isArray() guards the null case. SKSelection
// includes 'notes' but IAppConfig.selections has no notes field (no caller
// passes 'notes' here), so the Record reuses the string[] shape.
type SelectionsRecord = Record<SKSelection, string[] | null>;

// Server response shape for the v1 /vessels endpoint, narrowed to the
// fields transformVessel reads. All nested values are best-effort; the
// SK delta model marks every leaf optional.
interface RawVesselValue<T> {
  value?: T | null;
}
interface RawVessel {
  mmsi?: string;
  name?: string;
  flag?: RawVesselValue<string>;
  port?: RawVesselValue<string>;
  navigation?: {
    position?: RawVesselValue<{ longitude: number; latitude: number }>;
    destination?: {
      commonName?: RawVesselValue<string>;
      eta?: RawVesselValue<string>;
    };
    state?: RawVesselValue<string>;
  };
  design?: {
    aisShipType?: RawVesselValue<{ id: number | null; name: string }>;
    length?: RawVesselValue<unknown>;
    beam?: RawVesselValue<unknown>;
    draft?: RawVesselValue<unknown>;
    airHeight?: RawVesselValue<unknown>;
  };
  communication?: {
    callsignVhf?: string;
    callsignHf?: string;
  };
  registrations?: Record<string, string>;
}
type RawVessels = Record<string, RawVessel>;

// Hoisted so `fromCache()` does not re-allocate a 6-element array
// per call (called on every per-feature interaction lookup).
const CACHED_COLLECTIONS: ReadonlySet<SKResourceType> = new Set([
  'routes',
  'waypoints',
  'notes',
  'regions',
  'charts',
  'tracks'
]);

// ** Signal K resource operations
@Injectable({ providedIn: 'root' })
export class SKResourceService {
  private reOpen: ReOpenState = {};

  private app = inject(AppFacade);
  private dialog = inject(MatDialog);
  private signalk = inject(SignalKClient);
  private worker = inject(SKWorkerService);

  // IAppConfig.selections is typed with discriminated property keys (no index
  // signature) so direct `selections[key]` reads trip TS4111 under
  // noPropertyAccessFromIndexSignature. Narrow it to a Record view here.
  private selections(): SelectionsRecord {
    return this.app.config.selections as unknown as SelectionsRecord;
  }

  constructor() {
    this.worker
      .resource$()
      .subscribe((msg: PathValue[]) => this.processResourceMessage(msg));
  }

  // ******** Resource selections management ********************

  /**
   * @description Returns boolean indicating if resource selection list is filtered.
   * @returns true: is filtered, false: not filtered.
   */
  public selectionIsFiltered(collection: SKSelection): boolean {
    return Array.isArray(this.selections()[collection]);
  }

  /**
   * @description Resource selection list contains the supplied identifier.
   * @param collection
   * @id Resource identifier.
   * @returns true if identifier is in the selection list.
   */
  public selectionHas(collection: SKSelection, id: string): boolean {
    const list = this.selections()[collection];
    if (!Array.isArray(list)) {
      return false;
    }
    return list.includes(id);
  }
  /**
   * @description Add resource ids to selection list
   * @param collection
   * @id Resource identifier or array of identifiers to add to selection list
   */
  public selectionAdd(collection: SKSelection, id: string | string[]): void {
    const sel = this.selections();
    const current = sel[collection];
    if (typeof current === 'undefined') {
      return;
    }
    if (Array.isArray(current)) {
      const ids = typeof id === 'string' ? [id] : id;
      const added = ids.filter((s) => !current.includes(s));
      sel[collection] = current.concat(added);
      this.app.saveConfig();
    }
  }

  /**
   * @description Remove resource ids from selection list
   * @param collection
   * @id Resource identifier or array of identifiers to remove from selection list
   */
  public selectionRemove(collection: SKSelection, id: string | string[]): void {
    const sel = this.selections();
    const current = sel[collection];
    if (typeof current === 'undefined') {
      return;
    }
    if (Array.isArray(current)) {
      const ids = typeof id === 'string' ? [id] : id;
      sel[collection] = current.filter((s: string) => !ids.includes(s));
      this.app.saveConfig();
    }
  }

  /**
   * @description Sets selection list to null to indicate list is unfiltered.
   * @param collection
   */
  public selectionUnfilter(collection: SKSelection): void {
    this.selections()[collection] = null;
    this.app.saveConfig();
  }

  /**
   * @description Empties the selection list.
   * @param collection
   */
  public selectionClear(collection: SKSelection): void {
    this.selections()[collection] = [];
    this.app.saveConfig();
  }

  /**
   * @description Cleans the selection list of entries that do not appear in fullList.
   * @param collection
   * @param fullList Array of resource identifiers
   */
  public selectionClean(collection: SKSelection, fullList: string[]): void {
    const sel = this.selections();
    const current = sel[collection];
    if (!Array.isArray(current)) {
      return;
    }
    sel[collection] = current.filter((i) => fullList.includes(i));
    this.app.saveConfig();
  }

  // ******** Resource cache operations ********************

  /**
   * @description Fetch relatated notes for the supplied resource identifier
   * @param collection Signal K resource type
   * @param id Resource identifier
   * @returns Promise containing an array of related notes
   */
  private async fetchRelatedNotes(
    collection: SKResourceType,
    id: string
  ): Promise<FBNotes> {
    try {
      return await this.listFromServer<FBNote>(
        'notes',
        `href=/resources/${collection}/${id}`
      );
    } catch {
      return [];
    }
  }

  /**
   * @description Return reference to cache for supplied resource type
   * @param collection
   * @returns Reference to resource cache
   */
  private getCacheRef(collection: SKResourceType) {
    switch (collection) {
      case 'routes':
        return this.routeCacheSignal;
      case 'waypoints':
        return this.waypointCacheSignal;
      case 'notes':
        return this.noteCacheSignal;
      case 'regions':
        return this.regionCacheSignal;
      case 'charts':
        return this.chartCacheSignal;
      case 'tracks':
        return this.trackCacheSignal;
    }
  }

  /**
   * @description Retrieve cached resource entry (app.data)
   * @params cache Resource cache to use (e.g. routes, etc.)
   * @params id Resource identifier
   * @returns resource entry
   */
  public fromCache(c: 'routes', id: string): FBRoute | undefined;
  public fromCache(c: 'waypoints', id: string): FBWaypoint | undefined;
  public fromCache(c: 'notes', id: string): FBNote | undefined;
  public fromCache(c: 'regions', id: string): FBRegion | undefined;
  public fromCache(c: 'tracks', id: string): FBTrack | undefined;
  public fromCache(c: 'charts', id: string): FBChart | undefined;
  public fromCache(
    collection: SKResourceType,
    id: string
  ): FBRoute | FBWaypoint | FBNote | FBRegion | FBTrack | FBChart | undefined;
  public fromCache(
    collection: SKResourceType,
    id: string
  ): FBRoute | FBWaypoint | FBNote | FBRegion | FBTrack | FBChart | undefined {
    if (CACHED_COLLECTIONS.has(collection)) {
      const cache = this.getCacheRef(collection);
      if (!cache) {
        this.app.showAlert('Error', 'Collection not found!');
        return undefined;
      }
      return cache().find((r) => r[0] === id) as
        | FBRoute
        | FBWaypoint
        | FBNote
        | FBRegion
        | FBTrack
        | FBChart
        | undefined;
    }
    return undefined;
  }

  // ******** SK Resource operations ********************

  /**
   * @description Fetch resources of supplied type from Signal K server.
   * @param collection The resource collection to which the resource belongs e.g. routes, waypoints, etc.
   * @param query  Filter criteria for resources to return
   * @returns Promise<T[]> (rejects with HTTPErrorResponse)
   */
  public listFromServer<T>(
    collection: SKResourceType,
    query?: string
  ): Promise<T[]> {
    if (query) {
      query = query.startsWith('?') ? query : `?${query}`;
    } else {
      query = '';
    }

    return new Promise((resolve, reject) => {
      const skf = this.signalk.api.get(
        this.app.skApiVersion,
        `/resources/${collection}${query}`
      );
      skf?.subscribe(
        (res: Routes | Waypoints | Regions | Notes | Charts | Tracks) => {
          const list: T[] = [];
          const bag = res as Record<
            string,
            | RouteResource
            | WaypointResource
            | RegionResource
            | NoteResource
            | ChartResource
            | TrackResource
          >;
          Object.keys(bag).forEach((id: string) => {
            const entry = bag[id];
            if (!entry) {
              return;
            }
            list.push([
              id,
              this.transform(collection, entry, id),
              !this.selectionIsFiltered(collection)
                ? true
                : this.selectionHas(collection, id)
            ] as unknown as T);
          });
          resolve(list);
        },
        (err: HttpErrorResponse) => reject(err)
      );
    });
  }

  /**
   * @description Fetch resource with specified identifier from Signal K server.
   * @param collection The resource collection to which the resource belongs e.g. routes, waypoints, etc.
   * @param id  Resource identifier
   * @returns Promise<SK resource class> (rejects with HTTPErrorResponse)
   */
  public fromServer(c: 'routes', id: string): Promise<SKRoute>;
  public fromServer(c: 'waypoints', id: string): Promise<SKWaypoint>;
  public fromServer(c: 'notes', id: string): Promise<SKNote>;
  public fromServer(c: 'regions', id: string): Promise<SKRegion>;
  public fromServer(c: 'tracks', id: string): Promise<SKTrack>;
  public fromServer(c: 'charts', id: string): Promise<SKChart>;
  public fromServer(
    collection: SKResourceType,
    id: string
  ): Promise<SKRoute | SKWaypoint | SKRegion | SKNote | SKChart | SKTrack>;
  public fromServer(
    collection: SKResourceType,
    id: string
  ): Promise<SKRoute | SKWaypoint | SKRegion | SKNote | SKChart | SKTrack> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/${collection}/${id}`)
        .subscribe(
          (
            res:
              | RouteResource
              | WaypointResource
              | RegionResource
              | NoteResource
              | ChartResource
              | TrackResource
          ) => resolve(this.transform(collection, res, id)),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  /**
   * @description Transform Resource response to instance of a Resource Class
   * @param collection
   * @param resource
   * @param id
   * @returns Transformed SK resource class
   */
  public transform(
    collection: SKResourceType,
    resource:
      | RouteResource
      | WaypointResource
      | RegionResource
      | NoteResource
      | ChartResource
      | TrackResource,
    id: string
  ): SKRoute | SKWaypoint | SKRegion | SKNote | SKChart | SKTrack {
    switch (collection) {
      case 'regions':
        return this.transformRegion(resource as RegionResource, id);
      case 'routes':
        return this.transformRoute(resource as RouteResource, id);
      case 'waypoints':
        return this.transformWaypoint(resource as WaypointResource, id);
      case 'notes':
        return this.transformNote(resource as NoteResource, id);
      case 'charts':
        return this.transformChart(resource as ChartResource, id);
      case 'tracks':
        return this.transformTrack(resource as TrackResource);
    }
  }

  /**
   * @description Delete resource from server
   * @param collection
   * @param id
   * @returns Promise<void> (rejects with HTTPErrorResponse)
   */
  public deleteFromServer(
    collection: SKResourceType | 'tracks' | 'infolayers',
    id: string,
    provider?: string
  ): Promise<void> {
    const p = provider ? `?provider=${provider}` : '';
    return new Promise((resolve, reject) => {
      this.signalk.api
        .delete(this.app.skApiVersion, `/resources/${collection}/${id}${p}`)
        .subscribe(
          () => resolve(),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  /**
   * @description Put resource to server
   * @param collection
   * @param id Resource identifier
   * @param data Resource data
   * @param provider Resource provider
   * @returns Promise<ActionResult> (rejects with HTTPErrorResponse)
   */
  public putToServer(
    collection: SKResourceType | 'tracks' | 'infolayers',
    id: string,
    data:
      | SKRoute
      | SKWaypoint
      | SKRegion
      | SKNote
      | SKChart
      | SKTrack
      | SKInfoLayer,
    provider?: string
  ): Promise<ActionResult> {
    const p = provider ? `?provider=${provider}` : '';
    return new Promise((resolve, reject) => {
      this.signalk.api
        .put(
          this.app.skApiVersion,
          `/resources/${collection}/${id}${provider ? p : ''}`,
          data
        )
        .subscribe(
          (res: ActionResult) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  /**
   * @description Post resource to server
   * @param collection
   * @param data Resource data
   * @returns Promise<ActionResult> (rejects with HTTPErrorResponse)
   */
  public postToServer(
    collection: SKResourceType | 'tracks' | 'infolayers',
    data:
      | SKRoute
      | SKWaypoint
      | SKRegion
      | SKNote
      | SKChart
      | SKTrack
      | SKInfoLayer
  ): Promise<ActionResult & { id?: string }> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .post(this.app.skApiVersion, `/resources/${collection}`, data)
        .subscribe(
          (res: ActionResult & { id?: string }) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  /**
   * @description Handle worker.resource$ message
   * @param msg Array of PathValue objects
   */
  private processResourceMessage(msg: PathValue[]): void {
    if (!Array.isArray(msg)) {
      return;
    }
    type ActionKey = 'routes' | 'waypoints' | 'notes' | 'regions' | 'charts';
    const action: Record<ActionKey, boolean> = {
      routes: false,
      waypoints: false,
      notes: false,
      regions: false,
      charts: false
    };
    const sel = this.selections();
    msg.forEach((item: PathValue) => {
      const p = item.path.split('.');
      if (p.length !== 3) {
        return;
      }
      const collection = p[1] as SKResourceType;
      const id = p[2];
      if (id === undefined) {
        return;
      }
      if (collection in action) {
        action[collection as ActionKey] = true;
      }
      if (this.selectionIsFiltered(collection) && !item.value) {
        // delete event from server: drop the id from the selection list
        const list = sel[collection];
        if (Array.isArray(list) && list.includes(id)) {
          list.splice(list.indexOf(id), 1);
          this.app.saveConfig();
        }
      }
    });

    if (action.routes) {
      this.refreshRoutes();
    }
    if (action.waypoints) {
      this.refreshWaypoints();
    }
    if (action.regions) {
      this.refreshRegions();
    }
    if (action.notes) {
      this.refreshNotes();
    }
    if (action.charts) {
      this.refreshCharts();
    }
  }

  // ******** UI methods ****************************

  // ** handle display resource properties **
  resourceProperties(r: { id: string; type: string }) {
    switch (r.type) {
      case 'waypoint':
        this.editWaypointInfo(r.id);
        break;
      case 'route':
        this.editRouteInfo(r.id);
        break;
      case 'note':
        this.showNoteDetails(r.id);
        break;
      case 'region':
        this.editRegionInfo(r.id);
        break;
      case 'chart':
        this.editChartInfo(r.id);
        break;
      case 'track':
        this.editTrackInfo(r.id);
        break;
    }
  }

  // **** CHARTS ****

  private chartCacheSignal = signal<FBCharts>([]);
  readonly charts = this.chartCacheSignal.asReadonly();

  /**
   * @description Add OSM charts to supplied chart list
   * @param chtList List of FBChart objects
   * @returns Updated FBChart array
   */
  public appendOSM(chtList: FBCharts): FBCharts {
    const isChartSelected = (id: string): boolean => {
      if (!this.app) {
        return true;
      }
      if (!this.selectionIsFiltered('charts')) {
        return true;
      }
      return this.selectionHas('charts', id);
    };
    const openStreetMap: FBChart = [
      'openstreetmap',
      new SKChart({
        name: 'World Map',
        description: 'Open Street Map'
      }),
      isChartSelected('openstreetmap')
    ];
    const openSeaMap: FBChart = [
      'openseamap',
      new SKChart({
        name: 'Sea Map',
        description: 'Open Sea Map',
        url: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
        minzoom: 1,
        maxzoom: 24,
        bounds: [-180, -90, 180, 90],
        type: 'tilelayer'
      }),
      isChartSelected('openseamap')
    ];
    chtList.push(openSeaMap);
    chtList.unshift(openStreetMap);
    return chtList;
  }

  /**
   * @description Refresh Chart cache with entries fetched from sk server
   * @param query Filter criteria for charts in placed in the cache
   */
  public async refreshCharts(query?: string) {
    if (query && !query.startsWith('?')) {
      query = '?' + query;
    }
    this.app.debug(`** refreshCharts(): ${query}`);
    try {
      const chts = await this.listFromServer<FBChart>('charts', query);
      this.appendOSM(chts);
      let flist = chts.filter((chart: FBChart) => chart[2]);
      flist = this.sortByScaleDesc(flist);
      flist = this.arrangeChartLayers(flist);
      // set map zoom extent
      this.setMapZoomRange();
      this.chartCacheSignal.set(flist);
    } catch (err) {
      this.app.debug('** refreshCharts:', err);
      const flist = this.appendOSM([]);
      this.setMapZoomRange();
      this.chartCacheSignal.set(flist);
    }
  }

  /**
   * @description Signal K v2 API transformation
   * @param chart Chart entry from server
   * @param id Chart resource identifier
   * @returns SKChart object
   */
  private transformChart(chart: ChartResource, id: string): SKChart {
    // v1->2 alignment
    if (chart.tilemapUrl) {
      chart.url = chart.tilemapUrl;
    }
    if (chart.chartLayers) {
      chart.layers = chart.chartLayers;
    }
    if (chart.serverType && !chart.type) {
      chart.type = chart.serverType;
    }
    if (chart.type) {
      // ensure host is in url
      if (
        chart.url &&
        (chart.url.startsWith('/') || !chart.url.startsWith('http'))
      ) {
        chart.url = (this.app.hostDef.url ?? '') + chart.url;
      }
    }
    // map local chart opacity (chartOpacity is a Record<string, number>)
    const localOpacity = this.app.config.selections.chartOpacity[id];
    if (typeof localOpacity === 'number') {
      chart.defaultOpacity = localOpacity;
    }
    return new SKChart(chart);
  }

  /**
   * @description Calculate the aggregated min / max zoom from the selected charts
   * @param useDefault Uses the default extent when true
   */
  public setMapZoomRange(useDefault?: boolean): void {
    const defaultExtent = {
      min: 2,
      max: 28
    };

    if (useDefault || !this.app.uiConfig().mapConstrainZoom) {
      this.app.MAP_ZOOM_EXTENT = defaultExtent;
    } else {
      const derivedExtent = {
        min: 1000,
        max: -1
      };
      this.chartCacheSignal().forEach((c: FBChart) => {
        if (c[2]) {
          // selected
          if (c[1].minZoom < derivedExtent.min) {
            derivedExtent.min = c[1].minZoom;
          }
          if (c[1].maxZoom > derivedExtent.max) {
            derivedExtent.max = c[1].maxZoom;
          }
        }
        this.app.MAP_ZOOM_EXTENT.min =
          derivedExtent.min === 1000 ? defaultExtent.min : derivedExtent.min;
        this.app.MAP_ZOOM_EXTENT.max =
          derivedExtent.max === -1 ? defaultExtent.max : derivedExtent.max;
      });
      this.app.debug('*** MAP_ZOOM_EXTENT', this.app.MAP_ZOOM_EXTENT);
    }
  }

  /**
   * @description Confirm Chart Deletion
   * @param id Chart identifier
   */
  public deleteChart(id: string) {
    if (!id) {
      return;
    }
    this.app
      .showConfirm(
        'Do you want to delete this Chart source?\n',
        'Delete Chart:',
        'YES',
        'NO'
      )
      .subscribe((result: { ok: boolean }) => {
        if (result && result.ok) {
          this.deleteFromServer('charts', id, 'resources-provider').catch(
            (err: HttpErrorResponse) => this.app.parseHttpErrorResponse(err)
          );
        }
      });
  }

  /**
   * @description Sort charts by scale (descending)
   * @param chartList FBChart array
   * @returns Sorted FBChart array
   */
  private sortByScaleDesc(chartList: FBCharts): FBCharts {
    return chartList.sort((a: FBChart, b: FBChart) => {
      return b[1].scale - a[1].scale;
    });
  }

  /**
   * @description Arrange chart layers in defined order (app.config.selections.chartOrder).
   * @param chartList FBChart array
   * @returns Ordered FBChart array
   */
  public arrangeChartLayers(chartList: FBCharts) {
    if (!Array.isArray(this.app.config.selections.chartOrder)) {
      this.app.config.selections.chartOrder = [];
    }
    const chartOrder = this.app.config.selections.chartOrder;
    // ensure chartList ids are included in chartOrder
    chartList.forEach((c: FBChart) => {
      if (!chartOrder.includes(c[0])) {
        chartOrder.push(c[0]);
      }
    });

    const chtIds = new Set(chartList.map((c: FBChart) => c[0]));
    const refList = chartOrder.filter((i: string) => chtIds.has(i));

    for (let destidx = 0; destidx < refList.length; destidx++) {
      const srcidx = chartList.findIndex(
        (c: FBChart) => c[0] === refList[destidx]
      );
      if (srcidx !== -1) {
        moveItemInArray(chartList, srcidx, destidx + 1);
      }
    }
    return chartList.slice();
  }

  /**
   * @description Trigger re-order of chart cache entries
   */
  public chartReorder() {
    this.chartCacheSignal.update((current: FBCharts) => {
      return this.arrangeChartLayers(current);
    });
  }

  /**
   * @description Add FBChart objects to the Chart Cache
   * @param ids Array of chart identifiers. If not supplied all charts will be added.
   */
  public chartAddFromServer(ids?: string[]) {
    if (!ids) {
      // add all charts retrieved from server
      this.selectionUnfilter('charts');
    } else {
      if (this.selectionIsFiltered('charts')) {
        this.selectionAdd('charts', ids);
      }
    }
    this.refreshCharts();
  }

  /**
   * @description Add FBChart objects to the Chart Cache
   * @param charts FBChart array
   */
  public chartAdd(charts: FBCharts) {
    this.chartCacheSignal.update((current: FBCharts) => {
      if (this.selectionIsFiltered('charts')) {
        this.selectionAdd(
          'charts',
          charts.map((c: FBChart) => c[0])
        );
      }
      return this.arrangeChartLayers(current.concat(charts));
    });
  }

  /**
   * @description Remove FBChart objects from the Chart Cache
   * @param ids Array of chart identifiers. If not supplied all charts are removed.
   */
  public chartRemove(ids?: string[]) {
    this.chartCacheSignal.update((current: FBCharts) => {
      if (!ids) {
        // remove all entries
        this.selectionClear('charts');
        this.app.saveConfig();
        return [];
      } else {
        this.selectionRemove('charts', ids);
        return current.filter((c) => !ids.includes(c[0]));
      }
    });
  }

  /**
   * @description Update opacity value of Chart object in the Chart Cache
   * @param id Chart identifier
   * @param value Opacity value to set (0-1)
   */
  public chartSetOpacity(id: string, value: number): void {
    if (!id || !Number.isFinite(value)) {
      return;
    }
    const idx = this.chartCacheSignal().findIndex((c: FBChart) => c[0] === id);
    if (idx !== -1) {
      this.chartCacheSignal.update((current: FBCharts) => {
        return current.map((c: FBChart): FBChart => {
          if (c[0] !== id) {
            return c;
          }
          const updated = new SKChart(c[1]);
          updated.defaultOpacity = value;
          return c[2] === undefined ? [c[0], updated] : [c[0], updated, c[2]];
        });
      });
    }
  }

  /**
   * @description Select the charts with the supplied ids for inclusion into the cache.
   * @param ids Array of chart identifiers
   */
  public chartSelected(ids: string | string[]) {
    ids = !Array.isArray(ids) ? [ids] : ids;
    ids.forEach((id: string) => {
      if (!this.selectionHas('charts', id)) {
        this.selectionAdd('charts', id);
      } else {
        this.selectionRemove('charts', id);
      }
    });
    this.refreshCharts();
  }

  /**
   * @description Create new Chart and save to server
   * @param chart
   */
  public newChart(chart: SKChart): void {
    if (!chart) {
      return;
    }
    this.dialog
      .open(ChartPropertiesDialog, {
        disableClose: true,
        data: chart
      })
      .afterClosed()
      .subscribe(async (r: { save: boolean; chart: SKChart }) => {
        if (r.save) {
          try {
            const cht = await this.postToServer('charts', r.chart);
            if (cht.id) {
              this.selectionAdd('charts', cht.id);
            }
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        }
      });
  }

  /**
   * @description Fetch Chart with supplied id and display edit dialog
   * @param id chart identifier
   */
  public async editChartInfo(id: string): Promise<void> {
    if (!id) {
      return;
    }
    let chart: SKChart;
    if (['openseamap', 'openstreetmap'].includes(id)) {
      const host =
        id === 'openseamap'
          ? 'tiles.openseamap.org/seamark'
          : 'tile.openstreetmap.org';
      chart = new SKChart({
        name: id === 'openseamap' ? 'Sea Map' : 'World Map',
        description: id === 'openseamap' ? 'Open Sea Map' : 'Open Street Map',
        url: `https://${host}/{z}/{x}/{y}.png`,
        minzoom: 1,
        maxzoom: 24,
        bounds: [-180, -90, 180, 90],
        type: 'tilelayer'
      });
    } else {
      try {
        this.app.sIsFetching.set(true);
        chart = await this.fromServer('charts', id);
        this.app.sIsFetching.set(false);
      } catch (err) {
        this.app.sIsFetching.set(false);
        this.app.parseHttpErrorResponse(err);
        return;
      }
    }
    this.dialog
      .open(ChartPropertiesDialog, {
        disableClose: true,
        data: chart
      })
      .afterClosed()
      .subscribe((r: { save: boolean; chart: SKChart }) => {
        if (r.save) {
          this.putToServer('charts', id, r.chart).catch((err) =>
            this.app.parseHttpErrorResponse(err)
          );
        }
      });
  }

  /**
   * @description Seed chart cache for the selected area (charts-plugin)
   * @param chart FBChart tuple [id, SKChart, selected]
   * @param bbox Bounding box [southwest, northeast]
   */
  public async seedChartCache(chart: FBChart, bbox: Position[]): Promise<void> {
    if (!chart || !Array.isArray(bbox)) {
      this.app.showAlert('Selection Error', 'Invalid selection data!');
      return;
    }
    if (bbox.length !== 2) {
      this.app.showAlert('Selection Error', 'Invalid selection!');
      return;
    }
    const sw = bbox[0];
    const ne = bbox[1];
    if (!sw || !ne) {
      this.app.showAlert('Selection Error', 'Invalid selection!');
      return;
    }
    const parsedBbox = {
      minLon: sw[0],
      minLat: sw[1],
      maxLon: ne[0],
      maxLat: ne[1]
    };
    // confirm cache seeding job submission
    this.dialog
      .open(ChartSeedJobDialog, {
        data: { chart: chart, bbox: bbox }
      })
      .afterClosed()
      .subscribe((maxZoom: number) => {
        if (maxZoom > 0) {
          const req = {
            bbox: parsedBbox,
            maxZoom: maxZoom
          };
          this.app.debug(
            `Submit chart seed job ${JSON.stringify(req)} for chart ${chart[0]}`
          );
          this.signalk
            .post(`/signalk/chart-tiles/cache/${chart[0]}`, req)
            .subscribe({
              next: () => {
                this.app.showAlert(
                  'Chart Cache',
                  `Tile cache seed job created successfully.`
                );
              },
              error: (err: HttpErrorResponse) => {
                this.app.parseHttpErrorResponse(err);
              }
            });
        }
      });
  }

  // **** ROUTES ****

  private routeCacheSignal = signal<FBRoutes>([]);
  readonly routes = this.routeCacheSignal.asReadonly();

  /**
   * @description Refresh Route cache with entries fetched from sk server
   * @param query Filter criteria for routes in placed in the cache
   */
  public async refreshRoutes(query?: string): Promise<void> {
    if (query && !query.startsWith('?')) {
      query = '?' + query;
    }
    this.app.debug(`** refreshRoutes(): ${query}`);
    try {
      if (this.app.data.activeRoute) {
        this.selectionAdd('routes', this.app.data.activeRoute);
      }
      const rtes = await this.listFromServer<FBRoute>('routes', query);
      const flist = rtes.filter((route: FBRoute) => route[2]);
      this.routeCacheSignal.set(flist);
    } catch (err) {
      this.app.debug('** refreshRoutes:', err);
      this.routeCacheSignal.set([]);
    }
  }

  /**
   * @description Signal K v2 API transformation
   * @param rte Route resource from server
   * @param id Route id
   * @returns SKRoute object
   */
  private transformRoute(rte: RouteResource, id: string): SKRoute {
    // parse as v2: legacy servers ship start/end at the top level
    const rteWithLegacy = rte as RouteResource &
      Partial<{ start: unknown; end: unknown }>;
    if (typeof rteWithLegacy.start !== 'undefined') {
      delete rteWithLegacy.start;
    }
    if (typeof rteWithLegacy.end !== 'undefined') {
      delete rteWithLegacy.end;
    }
    if (typeof rte.name === 'undefined') {
      rte.name = 'Rte-' + id.slice(-6);
    }
    if (rte.feature && !rte.feature.properties) {
      rte.feature.properties = {};
    }
    const props = rte.feature?.properties as
      | Record<string, unknown>
      | undefined;
    if (props && typeof props['points'] !== 'undefined') {
      // check for v2 array
      if (!Array.isArray(props['points'])) {
        // legacy format
        const legacyPoints = props['points'] as {
          names?: unknown;
        };
        if (Array.isArray(legacyPoints.names)) {
          const pts: { name: string }[] = [];
          (legacyPoints.names as string[]).forEach((pt: string) => {
            pts.push({ name: pt ?? '' });
          });
          props['coordinatesMeta'] = pts;
          delete props['points'];
        }
      }
    }
    // ensure coords & coordsMeta array lengths are aligned
    if (rte.feature && props) {
      const cm = props['coordinatesMeta'];
      if (
        Array.isArray(cm) &&
        cm.length !== rte.feature.geometry.coordinates.length
      ) {
        delete props['coordinatesMeta'];
      }
    }
    return new SKRoute(rte);
  }

  /**
   * @description Fetch routes from server and add to cache
   * @param ids Array of route identifiers. If not supplied all routes will be added.
   */
  public routeAddFromServer(ids?: string[]) {
    if (!ids) {
      // add all routes retrieved from server
      this.selectionUnfilter('routes');
    } else {
      if (this.selectionIsFiltered('routes')) {
        this.selectionAdd('routes', ids);
      }
    }
    this.refreshRoutes();
  }

  /**
   * @description Add FBRoute objects to the Route Cache
   * @param routes FBRoute array
   */
  public routeAdd(routes: FBRoutes) {
    this.routeCacheSignal.update((current: FBRoutes) => {
      if (this.selectionIsFiltered('routes')) {
        this.selectionAdd(
          'routes',
          routes.map((r: FBRoute) => r[0])
        );
      }
      return current.concat(routes);
    });
  }

  /**
   * @description Remove FBRoute objects from the Route Cache
   * @param ids Array of route identifiers. If not supplied all routes are removed.
   */
  public routeRemove(ids?: string[]) {
    this.routeCacheSignal.update((current: FBRoutes) => {
      if (!ids) {
        // remove all entries
        this.selectionClear('routes');
        return [];
      } else {
        this.selectionRemove('routes', ids);
        return current.filter((r: FBRoute) => !ids.includes(r[0]));
      }
    });
  }

  /**
   * @description Return a FBRoute object using the supplied coordinates.
   * @params coordinates - Route points
   */
  public buildRoute(coordinates: LineString): FBRoute {
    const rte = new SKRoute();
    const rteUuid = this.signalk.uuid;
    rte.feature.geometry.coordinates = GeoUtils.normaliseCoords(coordinates);
    rte.distance = GeoUtils.routeLength(rte.feature.geometry.coordinates);
    return [rteUuid, rte, true];
  }

  /** Create new Route with supplied coordinates and metadata and edit dialog
   * @param coordinates Route points
   * @param meta Route point metadata.
   */
  public newRouteAt(
    coordinates: LineString,
    meta?: { href?: string; name?: string }[]
  ): void {
    if (!coordinates) {
      return;
    }
    const rte = this.buildRoute(coordinates);
    if (meta && Array.isArray(meta)) {
      if (!rte[1].feature.properties) {
        rte[1].feature.properties = {};
      }
      rte[1].feature.properties['coordinatesMeta'] = meta;
    }
    this.newRoute(rte[1]);
  }

  /**
   * @description Create new Route and save to server
   * @param route
   */
  private newRoute(route: SKRoute): void {
    if (!route) {
      return;
    }
    this.dialog
      .open(RouteDialog, {
        disableClose: true,
        data: {
          title: 'New Route',
          route: route
        }
      })
      .afterClosed()
      .subscribe(async (r: { save: boolean; route: SKRoute }) => {
        if (r.save) {
          try {
            const rte = await this.postToServer('routes', r.route);
            if (rte.id) {
              this.selectionAdd('routes', rte.id);
            }
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        }
      });
  }

  /**
   * @description Fetch Route with supplied id and display edit dialog
   * @param id route identifier
   */
  public async editRouteInfo(id: string): Promise<void> {
    if (!id) {
      return;
    }
    let rte: SKRoute;
    try {
      this.app.sIsFetching.set(true);
      rte = await this.fromServer('routes', id);
      this.app.sIsFetching.set(false);
    } catch (err) {
      this.app.sIsFetching.set(false);
      this.app.parseHttpErrorResponse(err);
      return;
    }
    this.dialog
      .open(RouteDialog, {
        disableClose: true,
        data: {
          title: 'Route Details',
          addMode: false,
          route: rte
        }
      })
      .afterClosed()
      .subscribe((r: { save: boolean; route: SKRoute }) => {
        if (r.save) {
          this.putToServer('routes', id, r.route).catch((err) =>
            this.app.parseHttpErrorResponse(err)
          );
        }
      });
  }

  /**
   * @description Confirm deletion of Route with supplied id
   * @param id Route identifier
   */
  public async deleteRoute(id: string): Promise<void> {
    if (!id) {
      return;
    }
    // are there notes attached?
    const notes = await this.fetchRelatedNotes('routes', id);
    const checkText = notes?.length !== 0 ? 'Delete attached Notes.' : '';
    this.app
      .showConfirm(
        'Do you want to delete this Route from the server?\n',
        'Delete Route:',
        'YES',
        'NO',
        checkText
      )
      .subscribe(async (result: { ok: boolean; checked: boolean }) => {
        if (result && result.ok) {
          try {
            await this.deleteFromServer('routes', id);
            if (result.checked) {
              notes.forEach((note: FBNote) => {
                this.deleteFromServer('notes', note[0]);
              });
            }
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        }
      });
  }

  // Modify Route point coordinates & refresh course
  /**
   * @description Modify Route point coordinates and push to server
   * @param id Route identifier
   * @param coords Route points
   * @param coordsMeta Array of point metadata
   */
  public updateRouteCoords(
    id: string,
    coords: Position[],
    coordsMeta?: { name?: string; href?: string }[]
  ): void {
    const r = this.fromCache('routes', id);
    if (!r) {
      return;
    }
    const rte = r[1];
    rte.feature.geometry.coordinates = GeoUtils.normaliseCoords(coords);
    rte.distance = GeoUtils.routeLength(rte.feature.geometry.coordinates);

    if (coordsMeta) {
      if (!rte.feature.properties) {
        rte.feature.properties = {};
      }
      rte.feature.properties['coordinatesMeta'] = coordsMeta;
    }
    this.putToServer('routes', id, rte).catch((err) => {
      this.app.parseHttpErrorResponse(err);
    });
  }

  // **** WAYPOINTS ****

  private waypointCacheSignal = signal<FBWaypoints>([]);
  readonly waypoints = this.waypointCacheSignal.asReadonly();

  /**
   * @description Refresh Waypoint cache with entries fetched from sk server
   * @param query Filter criteria for wapoints in placed in the cache
   */
  public async refreshWaypoints(query?: string): Promise<void> {
    if (query && !query.startsWith('?')) {
      query = '?' + query;
    }
    this.app.debug(`** refreshWaypoints(): ${query}`);
    try {
      if (this.app.data.activeWaypoint) {
        this.selectionAdd('waypoints', this.app.data.activeWaypoint);
      }
      const wpts = await this.listFromServer<FBWaypoint>('waypoints', query);
      const flist = wpts.filter((waypoint: FBWaypoint) => waypoint[2]);
      this.waypointCacheSignal.set(flist);
    } catch (err) {
      this.app.debug('** refreshWaypoints:', err);
      this.waypointCacheSignal.set([]);
    }
  }

  /**
   * @description Signal K v2 API transformation
   * @param wpt Waypoint resource from server
   * @param id Waypoint id
   * @returns SKWaypoint object
   */
  private transformWaypoint(wpt: WaypointResource, id: string): SKWaypoint {
    // legacy servers ship a top-level `position` outside the GeoJSON feature
    const wptWithLegacy = wpt as WaypointResource &
      Partial<{ position: unknown }>;
    if (typeof wptWithLegacy.position !== 'undefined') {
      delete wptWithLegacy.position;
    }
    if (wpt.feature && !wpt.feature.properties) {
      wpt.feature.properties = {};
    }
    const props = wpt.feature?.properties as
      | Record<string, unknown>
      | undefined;
    if (!wpt.name) {
      if (props && typeof props['name'] === 'string') {
        wpt.name = props['name'] as string;
        delete props['name'];
      } else {
        wpt.name = 'Wpt-' + id.slice(-6);
      }
    }
    if (!wpt.description && props) {
      if (typeof props['description'] === 'string') {
        wpt.description = props['description'] as string;
        delete props['description'];
      } else if (typeof props['cmt'] === 'string') {
        wpt.description = props['cmt'] as string;
      }
    }
    if (props && typeof props['skType'] === 'string') {
      wpt.type = props['skType'] as string;
      delete props['skType'];
    }
    if (wpt.type) {
      wpt.type = wpt.type.toLowerCase();
    }
    return new SKWaypoint(wpt);
  }

  /**
   * @description Add FBWaypoint objects to the Waypoint Cache
   * @param ids Array of waypoint identifiers. If not supplied all waypoints will be added.
   */
  public waypointAddFromServer(ids?: string[]) {
    if (!ids) {
      // add all waypoints retrieved from server
      this.selectionUnfilter('waypoints');
    } else {
      if (this.selectionIsFiltered('waypoints')) {
        this.selectionAdd('waypoints', ids);
      }
    }
    this.refreshWaypoints();
  }

  /**
   * @description Add FBWaypoint objects to the Waypoint Cache
   * @param waypoints FBWaypoint array
   */
  public waypointAdd(waypoints: FBWaypoints) {
    this.waypointCacheSignal.update((current: FBWaypoints) => {
      if (this.selectionIsFiltered('waypoints')) {
        this.selectionAdd(
          'waypoints',
          waypoints.map((w: FBWaypoint) => w[0])
        );
      }
      return current.concat(waypoints);
    });
  }

  /**
   * @description Remove FBWaypoint objects from the Waypoint Cache
   * @param ids Array of waypoint identifiers. If not supplied all waypoints are removed.
   */
  public waypointRemove(ids?: string[]) {
    this.waypointCacheSignal.update((current: FBWaypoints) => {
      if (!ids) {
        // remove all entries
        this.selectionClear('waypoints');
        return [];
      } else {
        this.selectionRemove('waypoints', ids);
        return current.filter((w: FBWaypoint) => !ids.includes(w[0]));
      }
    });
  }

  /**
   * @description Build and return FBWaypoint object with supplied coordinates
   * @param coordinates Waypoint position
   */
  public buildWaypoint(coordinates: Position): FBWaypoint {
    const wpt = new SKWaypoint();
    const wptUuid = this.signalk.uuid;
    wpt.feature.geometry.coordinates = GeoUtils.normaliseCoords(coordinates);
    return [wptUuid, wpt, true];
  }

  /**
   * @description Create new Waypoint at supplied position and display edit dialog
   * @param posiiton Waypoint position
   */
  public newWaypointAt(position: Position, name?: string) {
    if (!position) {
      return;
    }
    const wpt = this.buildWaypoint(position);
    wpt[1].name = name ?? `Wpt-${Date.now().toString().slice(-5)}`;
    this.newWaypoint(wpt[1]);
  }

  /**
   * @description Create new Waypoint and save to server
   * @param waypoint
   */
  private newWaypoint(waypoint: SKWaypoint): void {
    if (!waypoint) {
      return;
    }
    this.dialog
      .open(WaypointDialog, {
        disableClose: true,
        data: {
          title: 'New Waypoint',
          waypoint: waypoint
        }
      })
      .afterClosed()
      .subscribe(async (r: { save: boolean; waypoint: SKWaypoint }) => {
        if (r.save) {
          try {
            const w = await this.postToServer('waypoints', r.waypoint);
            if (w.id) {
              this.selectionAdd('routes', w.id);
            }
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        }
      });
  }

  /**
   * @description Fetch Waypoint with supplied id and display edit dialog
   * @param id waypoint identifier
   */
  public async editWaypointInfo(id: string): Promise<void> {
    if (!id) {
      return;
    }
    let wpt: SKWaypoint;
    try {
      this.app.sIsFetching.set(true);
      wpt = await this.fromServer('waypoints', id);
      this.app.sIsFetching.set(false);
    } catch (err) {
      this.app.sIsFetching.set(false);
      this.app.parseHttpErrorResponse(err);
      return;
    }
    this.dialog
      .open(WaypointDialog, {
        disableClose: true,
        data: {
          title: 'Waypoint Details',
          addMode: false,
          waypoint: wpt
        }
      })
      .afterClosed()
      .subscribe((r: { save: boolean; waypoint: SKWaypoint }) => {
        if (r.save) {
          this.putToServer('waypoints', id, r.waypoint).catch((err) =>
            this.app.parseHttpErrorResponse(err)
          );
        }
      });
  }

  /**
   * @description Confirm deletion of Waypoint with supplied id
   * @param id Waypoint identifier
   */
  public async deleteWaypoint(id: string): Promise<void> {
    if (!id) {
      return;
    }
    // are there notes attached?
    const notes = await this.fetchRelatedNotes('waypoints', id);
    const checkText = notes?.length !== 0 ? 'Delete attached Notes.' : '';
    this.app
      .showConfirm(
        'Do you want to delete this Waypoint from the server?\n',
        'Delete Waypoint:',
        'YES',
        'NO',
        checkText
      )
      .subscribe(async (result: { ok: boolean; checked: boolean }) => {
        if (result && result.ok) {
          try {
            await this.deleteFromServer('waypoints', id);
            if (result.checked) {
              notes.forEach((note: FBNote) => {
                this.deleteFromServer('notes', note[0]);
              });
            }
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        }
      });
  }

  /**
   * @description Update Waypoint position and push to server
   * @param id Waypoint identifier
   * @param position Position to assign to waypoint
   */
  public updateWaypointPosition(id: string, position: Position): void {
    if (!id || !position) {
      return;
    }
    const w = this.fromCache('waypoints', id);
    if (!w) {
      return;
    }
    const wpt = w[1];
    wpt.feature.geometry.coordinates = GeoUtils.normaliseCoords(position);
    // SK v1 servers expect a sibling `position` block alongside the feature.
    // SKWaypoint does not declare it, so attach via a typed widening.
    const wptWithLegacyPos = wpt as SKWaypoint & {
      position?: { latitude: number; longitude: number };
    };
    wptWithLegacyPos.position = {
      latitude: wpt.feature.geometry.coordinates[1],
      longitude: wpt.feature.geometry.coordinates[0]
    };
    this.putToServer('waypoints', id, wpt).catch((err) => {
      this.app.parseHttpErrorResponse(err);
    });
  }

  // **** REGIONS ****

  private regionCacheSignal = signal<FBRegions>([]);
  readonly regions = this.regionCacheSignal.asReadonly();

  /**
   * @description Fill cache with regions fetched from sk server
   * @param query Filter criteria for regions placed in the cache
   */
  public async refreshRegions(query?: string): Promise<void> {
    if (query && !query.startsWith('?')) {
      query = '?' + query;
    }
    this.app.debug(`** refreshRegions->query: ${query}`);
    try {
      const regions = await this.listFromServer<FBRegion>('regions', query);
      const flist = regions.filter((region: FBRegion) => region[2]);
      this.regionCacheSignal.set(flist);
    } catch (err) {
      this.app.debug('** refreshRegions:', err);
    }
  }

  /**
   * @description Signal K v2 API transformation
   * @param region Region resource from server
   * @param id Resource id
   * @returns SKRegion object
   */
  private transformRegion(region: RegionResource, id: string): SKRegion {
    const legacy = region as RegionResource & { geohash?: unknown };
    if (typeof legacy.geohash === 'string') {
      const gh = GeoUtils.geohashDecodeBbox(legacy.geohash);
      const reg = new SKRegion();
      reg.name = 'Region-' + id.slice(-6);
      // Polygon: outer ring of [lon,lat] pairs, closed
      reg.feature.geometry.coordinates = [
        [
          [gh[1], gh[0]],
          [gh[3], gh[0]],
          [gh[3], gh[2]],
          [gh[1], gh[2]],
          [gh[1], gh[0]]
        ]
      ];
      return reg;
    }
    return new SKRegion(region);
  }

  /**
   * @description Create new Region and save to server
   * @param region
   */
  public newRegion(region: SKRegion): void {
    if (!region) {
      return;
    }
    this.dialog
      .open(RegionDialog, {
        disableClose: true,
        data: {
          region: region
        }
      })
      .afterClosed()
      .subscribe(async (r: { save: boolean; region: SKRegion }) => {
        if (r.save) {
          try {
            const reg = await this.postToServer('regions', r.region);
            if (reg.id) {
              this.selectionAdd('regions', reg.id);
            }
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        }
      });
  }

  /**
   * @description Fetch Region with supplied id and display edit dialog
   * @param id region identifier
   */
  public async editRegionInfo(id: string): Promise<void> {
    if (!id) {
      return;
    }
    let region: SKRegion;
    try {
      this.app.sIsFetching.set(true);
      region = await this.fromServer('regions', id);
      this.app.sIsFetching.set(false);
    } catch (err) {
      this.app.sIsFetching.set(false);
      this.app.parseHttpErrorResponse(err);
      return;
    }
    this.dialog
      .open(RegionDialog, {
        disableClose: true,
        data: {
          region: region
        }
      })
      .afterClosed()
      .subscribe((r: { save: boolean; region: SKRegion }) => {
        if (r.save) {
          this.putToServer('regions', id, r.region).catch((err) =>
            this.app.parseHttpErrorResponse(err)
          );
        }
      });
  }

  /**
   * @description Confirm deletion of Region with supplied id
   * @param id Region identifier
   */
  public async deleteRegion(id: string): Promise<void> {
    if (!id) {
      return;
    }
    // are there notes attached?
    const notes = await this.fetchRelatedNotes('regions', id);
    const checkText = notes?.length !== 0 ? 'Delete attached Notes.' : '';
    this.app
      .showConfirm(
        'Do you want to delete this Region from the server?\n',
        'Delete Region:',
        'YES',
        'NO',
        checkText
      )
      .subscribe((result: { ok: boolean; checked: boolean }) => {
        if (result && result.ok) {
          this.deleteFromServer('regions', id)
            .then(() => {
              this.refreshRegions();
              if (result.checked) {
                // remove linked notes
                notes.forEach((note: FBNote) => {
                  this.deleteFromServer('notes', note[0]);
                });
              }
            })
            .catch((err: HttpErrorResponse) =>
              this.app.parseHttpErrorResponse(err)
            );
        }
      });
  }

  /**
   * @description Update Region coordinates and push to server
   * @param id Region identifier
   * @param coords Coordinates to assign to region
   */
  public updateRegionCoords(id: string, coords: Position[][]): void {
    if (!id || !coords) {
      return;
    }
    const r = this.fromCache('regions', id);
    if (!r) {
      return;
    }
    const region = r[1];
    const normalised = GeoUtils.normaliseCoords(coords);
    // SKRegion.feature is Polygon | MultiPolygon; updateRegionCoords callers
    // always feed Polygon-shape coords. Widen the field for assignment.
    const feature = region.feature as { geometry: { coordinates: unknown } };
    feature.geometry.coordinates = normalised;
    this.putToServer('regions', id, region).catch((err) => {
      this.app.parseHttpErrorResponse(err);
    });
  }

  /**
   * @description Add FBRegion objects to the Region Cache
   * @param ids Array of region identifiers. If not supplied all regions will be added.
   */
  public regionAddFromServer(ids?: string[]) {
    if (!ids) {
      // add all regions retrieved from server
      this.selectionUnfilter('regions');
    } else {
      if (this.selectionIsFiltered('regions')) {
        this.selectionAdd('regions', ids);
      }
    }
    this.refreshRegions();
  }

  /**
   * @description Add FBRegion objects to the Region Cache
   * @param regions FBRegion array
   */
  public regionAdd(regions: FBRegions) {
    this.regionCacheSignal.update((current: FBRegions) => {
      if (this.selectionIsFiltered('regions')) {
        this.selectionAdd(
          'regions',
          regions.map((c: FBRegion) => c[0])
        );
      }
      return current.concat(regions);
    });
  }

  /**
   * @description Remove FBRegion objects from the Region Cache
   * @param ids Array of region identifiers. If not supplied all regions are removed.
   */
  public regionRemove(ids?: string[]) {
    this.regionCacheSignal.update((current: FBRegions) => {
      if (!ids) {
        // remove all entries
        this.selectionClear('regions');
        this.app.saveConfig();
        return [];
      } else {
        this.selectionRemove('regions', ids);
        return current.filter((c) => !ids.includes(c[0]));
      }
    });
  }

  /**
   * @description Select the regions with the supplied ids for inclusion into the cache.
   * @param ids Array of region identifiers
   */
  public regionSelected(ids: string | string[]) {
    ids = !Array.isArray(ids) ? [ids] : ids;
    ids.forEach((id: string) => {
      if (!this.selectionHas('regions', id)) {
        this.selectionAdd('regions', id);
      } else {
        this.selectionRemove('regions', id);
      }
    });
    this.refreshRegions();
  }

  // **** NOTES ****

  private noteCacheSignal = signal<FBNotes>([]);
  readonly notes = this.noteCacheSignal.asReadonly();

  /**
   * @description Fill cache with notes fetched from sk server
   * @param query Filter criteria for notes placed in the cache
   */
  public async refreshNotes(query?: string): Promise<void> {
    query =
      query ??
      processUrlTokens(
        this.app.config.resources.notes.rootFilter,
        this.app.config
      );
    if (query && !query.startsWith('?')) {
      query = '?' + query;
    }
    this.app.debug(`** refreshNotes->query: ${query}`);
    try {
      const notes = await this.listFromServer<FBNote>('notes', query);
      const flist = notes.filter((note: FBNote) => note[2]);
      this.noteCacheSignal.set(flist);
    } catch (err) {
      this.app.debug('** refreshNotes:', err);
    }
  }

  /**
   * @description Signal K v2 API transformation
   * @param note Note resource from server
   * @param id Note id
   * @returns SKNote object
   */
  private transformNote(note: NoteResource, id: string): SKNote {
    // replace title with name
    if (!note.name) {
      note.name = note.title ?? 'Note-' + id.slice(-6);
      if (note.title) {
        delete note.title;
      }
    }
    if (!note.href) {
      note.href = note.region ?? '';
      if (note.region) {
        delete note.region;
      }
      if (note.href && note.href.includes('resources/')) {
        const a = note.href.split('/');
        const last = a[a.length - 1];
        if (typeof last === 'string') {
          const segments = last.split(':');
          const h = segments[segments.length - 1];
          if (typeof h === 'string') {
            a[a.length - 1] = h;
            note.href = a.join('/');
          }
        }
      }
    }
    if (typeof note.properties === 'undefined') {
      note.properties = {};
    }
    if (typeof note.position === 'undefined') {
      if (typeof note.geohash !== 'undefined') {
        // replace geohash with position
        const gh = GeoUtils.geohashDecode(note.geohash);
        note.position = { latitude: gh.latitude, longitude: gh.longitude };
        delete note.geohash;
      }
    }
    return new SKNote(note);
  }

  /**
   * @description Handle note selection
   * @param id Note identifier
   * @param showRelated true = show related notes dialog, false = show Note information
   * @returns SKNote object
   */
  public noteSelected(id: string, showRelated: boolean): void {
    if (showRelated) {
      this.showRelatedNotes(id, 'group');
    } else {
      this.showNoteDetails(id);
    }
  }

  /**
   * @description Create note resource on the server
   * @param note SKNote object
   */
  private async createNote(note: SKNote): Promise<void> {
    try {
      await this.postToServer('notes', note);
      this.reopenRelatedDialog();
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
    }
  }

  /**
   * @description Open Note editing dialog. `data` carries the dialog inputs
   *   that NoteDialog reads (noteId is used by the caller to dispatch to
   *   create vs update, and is not passed to the dialog itself).
   */
  private async openNoteForEdit(e: {
    noteId: string | null;
    note: SKNote | null;
    editable: boolean;
    addNote: boolean;
    title: string | null;
    region?: { id: string; exists: boolean } | null;
    createRegion?: boolean | null;
  }): Promise<void> {
    const { NoteDialog } =
      await import('src/app/modules/skresources/components/notes/note-dialog');
    this.dialog
      .open(NoteDialog, {
        disableClose: true,
        minWidth: '50vw',
        maxWidth: '400px',
        data: {
          note: e.note,
          editable: e.editable,
          addNote: e.addNote,
          title: e.title
        }
      })
      .afterClosed()
      .subscribe(async (r: { result?: boolean; data?: SKNote } | undefined) => {
        if (r?.result && r.data) {
          // ** save / update **
          const note = r.data;
          if (!e.noteId) {
            // add note
            this.createNote(note);
          } else {
            // update note
            if (typeof note.href !== 'undefined' && !note.href) {
              delete (note as Partial<SKNote>).href;
            }
            try {
              await this.putToServer('notes', e.noteId, note);
              this.reopenRelatedDialog();
            } catch (err) {
              this.app.parseHttpErrorResponse(err);
            }
          }
        } else {
          // cancel
          this.reopenRelatedDialog();
        }
      });
  }

  /**
   * @description Reopen last related notes dialog
   * @param noReset true = does not reset reOpen object
   */
  private reopenRelatedDialog(noReset = false): void {
    if (this.reOpen.key && this.reOpen.value) {
      this.showRelatedNotes(
        this.reOpen.value,
        this.reOpen.key,
        this.reOpen.readOnly
      );
      if (noReset) {
        return;
      }
      this.reOpen = {};
    }
  }

  /**
   * Fetch a list of related notes for the supplied resource identifier
   * @param collection - Type of resource
   * @param id - Resource identifier
   */
  public async getRelatedNotes(
    collection: SKResourceType,
    id: string
  ): Promise<FBNotes> {
    try {
      return await this.listFromServer<FBNote>(
        'notes',
        `href=/resources/${collection}/${id}`
      );
    } catch {
      return [];
    }
  }

  /**
   * @description Fetch and display related Notes list
   * @param id Parent resource identifier
   * @param relatedBy How the notes to fetch are related to the parent
   * 'group' | destination | 'region' | 'waypoint' | 'route' | 'note'
   * @readonly true disables edit controls.
   */
  public async showRelatedNotes(
    id: string,
    relatedBy = 'region',
    readOnly = false
  ): Promise<void> {
    let paramName: string;
    if (!['group', 'destination'].includes(relatedBy)) {
      id = !id.includes(relatedBy) ? `/resources/${relatedBy}s/${id}` : id;
      paramName = 'href';
    } else {
      paramName = relatedBy;
    }
    this.app.sIsFetching.set(true);
    try {
      const notes = await this.listFromServer<FBNote>(
        'notes',
        `${paramName}=${id}`
      );
      this.app.sIsFetching.set(false);
      this.dialog
        .open(RelatedNotesDialog, {
          disableClose: true,
          data: { notes: notes, relatedBy: relatedBy, readOnly: readOnly }
        })
        .afterClosed()
        .subscribe(
          (r: { result?: boolean; data?: string; id?: string } | undefined) => {
            if (!r?.result) {
              return;
            }
            if (relatedBy) {
              this.reOpen = {
                key: relatedBy,
                value: id,
                readOnly: readOnly
              };
            } else {
              this.reOpen = {};
            }
            switch (r.data) {
              case 'edit':
                if (r.id) {
                  this.showNoteEditor({ id: r.id });
                }
                break;
              case 'add':
                if (relatedBy === 'group') {
                  /** @deprecated legacy notes group*/
                } else {
                  this.showNoteEditor({
                    type: relatedBy,
                    href: { id: id, exists: true }
                  });
                }
                break;
              case 'delete':
                if (r.id) {
                  this.deleteNote(r.id);
                }
                break;
            }
          }
        );
    } catch (err) {
      this.app.sIsFetching.set(false);
      void err;
      this.app.showAlert(
        'ERROR',
        `Unable to retrieve Notes for specified ${relatedBy}!`
      );
    }
  }

  /**
   * @description Display Add / Update Note Dialog
   */
  public async showNoteEditor(
    e: {
      id?: string;
      position?: Position;
      group?: string;
      type?: string;
      href?: { id: string; exists: boolean };
    } | null = null
  ): Promise<void> {
    let note: SKNote;
    const data: {
      noteId: string | null;
      note: SKNote | null;
      editable: boolean;
      addNote: boolean;
      title: string | null;
      region: { id: string; exists: boolean } | null;
      createRegion: boolean | null;
    } = {
      noteId: null,
      note: null,
      editable: true,
      addNote: true,
      title: null,
      region: null,
      createRegion: null
    };

    if (!e) {
      return;
    }
    if (!e.id && e.position) {
      // add note at provided position
      data.title = 'Add Note';
      note = new SKNote();
      if (e.group) {
        note.group = e.group;
      }
      const pos = GeoUtils.normaliseCoords(e.position);
      note.position = { latitude: pos[1], longitude: pos[0] };
      note.name = '';
      note.description = '';
      data.note = note;
      this.openNoteForEdit(data);
    } else if (!e.id && !e.position && e.group) {
      // add note in provided group with no position
      data.title = 'Add Note to Group';
      note = new SKNote();
      note.group = e.group;
      note.name = '';
      note.description = '';
      data.note = note;
      this.openNoteForEdit(data);
    } else if (!e.id && e.href && e.type) {
      // add note to existing resource or new/existing region
      note = new SKNote();
      note.href = !e.href.id.includes(e.type)
        ? `/resources/${e.type}s/${e.href.id}`
        : e.href.id;
      note.name = '';
      note.description = '';

      data.title = `Add Note to ${e.type}`;
      data.region = e.href;
      data.note = note;
      data.createRegion = e.href.exists ? false : e.type === 'region';
      this.openNoteForEdit(data);
    } else if (e.id) {
      // edit selected note details
      this.app.sIsFetching.set(true);
      try {
        const res = await this.fromServer('notes', e.id);
        this.app.sIsFetching.set(false);
        data.noteId = e.id;
        data.title = 'Edit Note';
        data.note = res;
        data.addNote = false;
        this.openNoteForEdit(data);
      } catch (err) {
        this.app.sIsFetching.set(false);
        void err;
        this.app.showAlert('ERROR', 'Unable to retrieve Note!');
      }
    }
  }

  /**
   * @description Fetch note with supplied id and display details dialog
   * @param id note identifier
   */
  public async showNoteDetails(id: string): Promise<void> {
    if (!id) {
      return;
    }
    let note: SKNote;
    try {
      this.app.sIsFetching.set(true);
      note = await this.fromServer('notes', id);
      this.app.sIsFetching.set(false);
    } catch (err) {
      this.app.sIsFetching.set(false);
      void err;
      this.app.showAlert('ERROR', 'Unable to retrieve Note!');
      return;
    }
    const { NoteDialog } =
      await import('src/app/modules/skresources/components/notes/note-dialog');
    this.dialog
      .open(NoteDialog, {
        disableClose: true,
        data: { note: note, editable: false }
      })
      .afterClosed()
      .subscribe(
        (
          r: { result?: boolean; data?: string; value?: string } | undefined
        ) => {
          if (!r?.result) {
            return;
          }
          if (r.data === 'url') {
            // ** open url in new tab **
            window.open(note.url, 'note');
          }
          if (r.data === 'edit') {
            this.showNoteEditor({ id: id });
          }
          if (r.data === 'delete') {
            this.deleteNote(id);
          }
          if (r.data === 'group' && r.value) {
            this.showRelatedNotes(r.value, r.data);
          }
        }
      );
  }

  /**
   * @description Confirm Note Deletion
   * @param id Note identifier
   */
  public deleteNote(id: string): void {
    if (!id) {
      return;
    }
    this.app
      .showConfirm(
        'Do you want to delete this Note from the server?\n',
        'Delete Note:',
        'YES',
        'NO'
      )
      .subscribe(async (ok: { ok: boolean } | boolean | undefined) => {
        const confirmed = typeof ok === 'boolean' ? ok : Boolean(ok && ok.ok);
        if (confirmed) {
          try {
            await this.deleteFromServer('notes', id);
            this.reopenRelatedDialog();
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        } else {
          this.reopenRelatedDialog();
        }
      });
  }

  /** modify Note position
   * @description Update the position of the specified note
   * @param id Note identifier
   * @param position New note position coordinates
   */
  public async updateNotePosition(
    id: string,
    position: Position
  ): Promise<void> {
    if (!id) {
      return;
    }
    const t = this.fromCache('notes', id);
    if (!t) {
      return;
    }
    const note = t[1];
    position = GeoUtils.normaliseCoords(position);
    note.position = { latitude: position[1], longitude: position[0] };
    try {
      await this.putToServer('notes', id, note);
      this.reopenRelatedDialog();
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
    }
  }

  // **** TRACKS ****

  private trackCacheSignal = signal<FBTracks>([]);
  readonly tracks = this.trackCacheSignal.asReadonly();

  /**
   * @description Refresh Track cache with entries fetched from sk server
   * @param query Filter criteria for tracks in placed in the cache
   */
  public async refreshTracks(query?: string): Promise<void> {
    if (query && !query.startsWith('?')) {
      query = '?' + query;
    }
    this.app.debug(`** refreshTracks(): ${query}`);
    try {
      const trks = await this.listFromServer<FBTrack>('tracks', query);
      const flist = trks.filter((track: FBTrack) => track[2]);
      this.trackCacheSignal.set(flist);
    } catch (err) {
      this.app.debug('** refreshTracks:', err);
      this.trackCacheSignal.set([]);
    }
  }

  /**
   * @description Signal K v2 API transformation
   * @param trk Track resource from server
   * @returns SKTrack object
   */
  private transformTrack(trk: TrackResource): SKTrack {
    return new SKTrack(trk);
  }

  /**
   * @description Fetch tracks from server and add to cache
   * @param ids Array of track identifiers. If not supplied all tracks will be added.
   */
  public trackAddFromServer(ids?: string[]) {
    if (!ids) {
      // add all tracks retrieved from server
      this.selectionUnfilter('tracks');
    } else {
      if (this.selectionIsFiltered('tracks')) {
        this.selectionAdd('tracks', ids);
      }
    }
    this.refreshTracks();
  }

  /**
   * @description Add FBTrack objects to the Track Cache
   * @param tracks FBTrack array
   */
  public trackAdd(tracks: FBTracks) {
    this.trackCacheSignal.update((current: FBTracks) => {
      if (this.selectionIsFiltered('tracks')) {
        this.selectionAdd(
          'tracks',
          tracks.map((r: FBTrack) => r[0])
        );
      }
      return current.concat(tracks);
    });
  }

  /**
   * @description Remove FBTrack objects from the Track Cache
   * @param ids Array of track identifiers. If not supplied all tracks are removed.
   */
  public trackRemove(ids?: string[]) {
    this.trackCacheSignal.update((current: FBTracks) => {
      if (!ids) {
        // remove all entries
        this.selectionClear('tracks');
        return [];
      } else {
        this.selectionRemove('tracks', ids);
        return current.filter((t: FBTrack) => !ids.includes(t[0]));
      }
    });
  }

  /**
   * @description Fetch Track with supplied id and display edit dialog
   * @param id track identifier
   */
  public async editTrackInfo(id: string): Promise<void> {
    if (!id) {
      return;
    }
    let trk: SKTrack;
    try {
      this.app.sIsFetching.set(true);
      trk = await this.fromServer('tracks', id);
      this.app.sIsFetching.set(false);
    } catch (err) {
      this.app.sIsFetching.set(false);
      this.app.parseHttpErrorResponse(err);
      return;
    }
    this.dialog
      .open(TrackDialog, {
        disableClose: true,
        data: {
          track: trk
        }
      })
      .afterClosed()
      .subscribe((r: { save: boolean; track: SKTrack }) => {
        if (r.save) {
          this.putToServer('tracks', id, r.track);
        }
      });
  }

  /**
   * @description Confirm deletion of Track with supplied id
   * @param id Track identifier
   */
  public async deleteTrack(id: string): Promise<void> {
    if (!id) {
      return;
    }
    this.app
      .showConfirm(
        'Do you want to delete this Track from the server?\n',
        'Delete Track:',
        'YES',
        'NO'
      )
      .subscribe(async (result: { ok: boolean; checked: boolean }) => {
        if (result && result.ok) {
          try {
            await this.deleteFromServer('tracks', id);
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        }
      });
  }

  // *** Vessels ****
  /**
   * @description Fetch vessels from server
   * @param query  Filter criteria for vessels to return
   * @returns Promise<FBVessels> (rejects with HTTPErrorResponse)
   */
  public listVessels(query?: string): Promise<FBVessels> {
    if (query) {
      query = query.startsWith('?') ? query : `?${query}`;
    } else {
      query = '';
    }
    return new Promise((resolve, reject) => {
      const skf = this.signalk.api.get(`/vessels${query}`);
      skf?.subscribe(
        (res: RawVessels) => {
          const list: FBVessels = [];
          Object.keys(res).forEach((id: string) => {
            const raw = res[id];
            if (!raw) {
              return;
            }
            const entry: FBVessel = [
              id,
              this.transformVessel(raw, id),
              !this.selectionIsFiltered('aisTargets')
                ? true
                : this.selectionHas('aisTargets', id)
            ];
            list.push(entry);
          });
          resolve(list);
        },
        (err: HttpErrorResponse) => reject(err)
      );
    });
  }

  /** Transform response to SKVessel
   * @param vessel server vessel response object
   * @returns SKVessel object
   */
  private transformVessel(vessel: RawVessel, _id: string): SKVessel {
    const v = new SKVessel();
    v.mmsi = vessel.mmsi ?? '';
    v.name = vessel.name ?? '';
    const posValue = vessel.navigation?.position?.value;
    v.position = posValue ? [posValue.longitude, posValue.latitude] : [0, 0];
    v.flag = vessel.flag?.value ?? '';
    v.port = vessel.port?.value ?? '';
    v.type = vessel.design?.aisShipType?.value ?? { id: -1, name: '' };
    // design.length / beam / draft / airHeight ship as { value: ... } leaves
    // on the wire; the SKVessel.design Record<string, any> is permissive.
    v.design['length'] = vessel.design?.length?.value ?? null;
    v.design['beam'] = vessel.design?.beam?.value ?? null;
    v.design['draft'] = vessel.design?.draft?.value ?? null;
    v.design['airHeight'] = vessel.design?.airHeight?.value ?? null;
    v.callsignVhf = vessel.communication?.callsignVhf ?? '';
    v.callsignHf = vessel.communication?.callsignHf ?? '';
    v.destination.name =
      vessel.navigation?.destination?.commonName?.value ?? null;
    v.destination.eta = null;
    const etaValue = vessel.navigation?.destination?.eta?.value;
    if (etaValue) {
      v.destination.eta = new Date(etaValue).toUTCString();
    }
    v.state = vessel.navigation?.state?.value ?? '';
    v.registrations = vessel.registrations ?? {};

    return v;
  }

  /**
   * @description Fetch vessel with specified identifier from Signal K server.
   * @returns Promise<SKVessel> (rejects with HTTPErrorResponse)
   */
  public vesselFromServer(id: string): Promise<SKVessel> {
    return new Promise((resolve, reject) => {
      this.signalk.api.get(`/vessels/${id}`).subscribe(
        (res: RawVessel) => resolve(this.transformVessel(res, id)),
        (err: HttpErrorResponse) => reject(err)
      );
    });
  }
}

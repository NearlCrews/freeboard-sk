import { inject, Injectable, signal } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import type { HttpErrorResponse } from '@angular/common/http';

import { FbDialogService } from 'src/app/design-system/primitives';
import { SignalKClient } from 'src/lib/signalk-client';
import { AppFacade } from 'src/app/app.facade';
import { GeoUtils } from 'src/app/lib/geoutils';

import type { SKInfoLayer } from '.';
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
import { SelectionsManager } from './selections-manager';
import { ChartsCollection } from './charts.collection';
import { NotesCollection } from './notes.collection';
import { RegionsCollection } from './regions.collection';
import { RoutesCollection } from './routes.collection';
import { TracksCollection } from './tracks.collection';
import { WaypointsCollection } from './waypoints.collection';

// Single source of truth for SKResourceType. The tuple drives the
// compile-time union AND the runtime guard so a string can't be
// silently mis-cast: the featurelist click path previously passed
// 'note' to open('note', id) because TS could not tell the singular
// form apart from the plural SKResourceType literal.
export const SK_RESOURCE_TYPES = [
  'routes',
  'waypoints',
  'regions',
  'notes',
  'charts',
  'tracks'
] as const;

export type SKResourceType = (typeof SK_RESOURCE_TYPES)[number];

export const isSKResourceType = (v: unknown): v is SKResourceType =>
  typeof v === 'string' && (SK_RESOURCE_TYPES as readonly string[]).includes(v);

export type SKSelection = SKResourceType | 'aisTargets' | 'infolayers';

interface ReOpenState {
  key?: string;
  value?: string;
  readOnly?: boolean;
}

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

// ** Signal K resource operations
@Injectable({ providedIn: 'root' })
export class SKResourceService {
  private reOpen: ReOpenState = {};

  private app = inject(AppFacade);
  private dialog = inject(FbDialogService);
  private signalk = inject(SignalKClient);
  private worker = inject(SKWorkerService);

  private readonly selectionsManager = inject(SelectionsManager);
  private readonly chartsCollection = inject(ChartsCollection);
  private readonly notesCollection = inject(NotesCollection);
  private readonly regionsCollection = inject(RegionsCollection);
  private readonly routesCollection = inject(RoutesCollection);
  private readonly tracksCollection = inject(TracksCollection);
  private readonly waypointsCollection = inject(WaypointsCollection);

  constructor() {
    this.worker
      .resource$()
      .subscribe((msg: PathValue[]) => this.processResourceMessage(msg));
  }

  // ******** Resource selections management (delegated) ********************

  public selectionIsFiltered(collection: SKSelection): boolean {
    return this.selectionsManager.isFiltered(collection);
  }

  public selectionHas(collection: SKSelection, id: string): boolean {
    return this.selectionsManager.has(collection, id);
  }

  public selectionAdd(collection: SKSelection, id: string | string[]): void {
    this.selectionsManager.add(collection, id);
  }

  public selectionRemove(collection: SKSelection, id: string | string[]): void {
    this.selectionsManager.remove(collection, id);
  }

  public selectionUnfilter(collection: SKSelection): void {
    this.selectionsManager.unfilter(collection);
  }

  public selectionClear(collection: SKSelection): void {
    this.selectionsManager.clear(collection);
  }

  public selectionClean(collection: SKSelection, fullList: string[]): void {
    this.selectionsManager.clean(collection, fullList);
  }

  // ******** Resource cache operations ********************

  /**
   * @description Retrieve cached resource entry. The dispatcher routes
   *   each collection to its per-type collection service.
   * @params collection Resource collection name
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
    switch (collection) {
      case 'tracks':
        return this.tracksCollection.fromCache(id);
      case 'regions':
        return this.regionsCollection.fromCache(id);
      case 'waypoints':
        return this.waypointsCollection.fromCache(id);
      case 'routes':
        return this.routesCollection.fromCache(id);
      case 'charts':
        return this.chartsCollection.fromCache(id);
      case 'notes':
        return this.notesCollection.fromCache(id);
    }
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
        return this.regionsCollection.transform(resource as RegionResource, id);
      case 'routes':
        return this.routesCollection.transform(resource as RouteResource, id);
      case 'waypoints':
        return this.waypointsCollection.transform(
          resource as WaypointResource,
          id
        );
      case 'notes':
        return this.notesCollection.transform(resource as NoteResource, id);
      case 'charts':
        return this.chartsCollection.transform(resource as ChartResource, id);
      case 'tracks':
        return this.tracksCollection.transform(resource as TrackResource);
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
        if (this.selectionsManager.has(collection, id)) {
          this.selectionsManager.remove(collection, id);
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

  // **** CHARTS (delegated to ChartsCollection) ****

  readonly charts = this.chartsCollection.charts;

  public appendOSM(chtList: FBCharts): FBCharts {
    return this.chartsCollection.appendOSM(chtList);
  }

  public refreshCharts(query?: string): Promise<void> {
    return this.chartsCollection.refresh(query);
  }

  public setMapZoomRange(useDefault?: boolean): void {
    this.chartsCollection.setMapZoomRange(useDefault);
  }

  public deleteChart(id: string): void {
    this.chartsCollection.delete(id);
  }

  public arrangeChartLayers(chartList: FBCharts): FBCharts {
    return this.chartsCollection.arrangeLayers(chartList);
  }

  public chartReorder(): void {
    this.chartsCollection.reorder();
  }

  public chartAddFromServer(ids?: string[]): void {
    this.chartsCollection.addFromServer(ids);
  }

  public chartAdd(charts: FBCharts): void {
    this.chartsCollection.add(charts);
  }

  public chartRemove(ids?: string[]): void {
    this.chartsCollection.remove(ids);
  }

  public chartSetOpacity(id: string, value: number): void {
    this.chartsCollection.setOpacity(id, value);
  }

  public chartSelected(ids: string | string[]): void {
    this.chartsCollection.toggleSelection(ids);
  }

  public newChart(chart: SKChart): Promise<void> {
    return this.chartsCollection.create(chart);
  }

  public editChartInfo(id: string): Promise<void> {
    return this.chartsCollection.editInfo(id);
  }

  public seedChartCache(chart: FBChart, bbox: Position[]): Promise<void> {
    return this.chartsCollection.seedCache(chart, bbox);
  }

  // **** ROUTES (delegated to RoutesCollection) ****

  readonly routes = this.routesCollection.routes;

  public refreshRoutes(query?: string): Promise<void> {
    return this.routesCollection.refresh(query);
  }

  public routeAddFromServer(ids?: string[]): void {
    this.routesCollection.addFromServer(ids);
  }

  public routeAdd(routes: FBRoutes): void {
    this.routesCollection.add(routes);
  }

  public routeRemove(ids?: string[]): void {
    this.routesCollection.remove(ids);
  }

  public buildRoute(coordinates: LineString): FBRoute {
    return this.routesCollection.build(coordinates);
  }

  public newRouteAt(
    coordinates: LineString,
    meta?: { href?: string; name?: string }[]
  ): void {
    this.routesCollection.newAt(coordinates, meta);
  }

  public editRouteInfo(id: string): Promise<void> {
    return this.routesCollection.editInfo(id);
  }

  public deleteRoute(id: string): Promise<void> {
    return this.routesCollection.delete(id);
  }

  public updateRouteCoords(
    id: string,
    coords: Position[],
    coordsMeta?: { name?: string; href?: string }[]
  ): void {
    this.routesCollection.updateCoords(id, coords, coordsMeta);
  }

  // **** WAYPOINTS (delegated to WaypointsCollection) ****

  readonly waypoints = this.waypointsCollection.waypoints;

  public refreshWaypoints(query?: string): Promise<void> {
    return this.waypointsCollection.refresh(query);
  }

  public waypointAddFromServer(ids?: string[]): void {
    this.waypointsCollection.addFromServer(ids);
  }

  public waypointAdd(waypoints: FBWaypoints): void {
    this.waypointsCollection.add(waypoints);
  }

  public waypointRemove(ids?: string[]): void {
    this.waypointsCollection.remove(ids);
  }

  public buildWaypoint(coordinates: Position): FBWaypoint {
    return this.waypointsCollection.build(coordinates);
  }

  public newWaypointAt(position: Position, name?: string): void {
    this.waypointsCollection.newAt(position, name);
  }

  public editWaypointInfo(id: string): Promise<void> {
    return this.waypointsCollection.editInfo(id);
  }

  public deleteWaypoint(id: string): Promise<void> {
    return this.waypointsCollection.delete(id);
  }

  public updateWaypointPosition(id: string, position: Position): void {
    this.waypointsCollection.updatePosition(id, position);
  }

  // **** REGIONS (delegated to RegionsCollection) ****

  readonly regions = this.regionsCollection.regions;

  public refreshRegions(query?: string): Promise<void> {
    return this.regionsCollection.refresh(query);
  }

  public newRegion(region: SKRegion): Promise<void> {
    return this.regionsCollection.create(region);
  }

  public editRegionInfo(id: string): Promise<void> {
    return this.regionsCollection.editInfo(id);
  }

  public deleteRegion(id: string): Promise<void> {
    return this.regionsCollection.delete(id);
  }

  public updateRegionCoords(id: string, coords: Position[][]): void {
    this.regionsCollection.updateCoords(id, coords);
  }

  public regionAddFromServer(ids?: string[]): void {
    this.regionsCollection.addFromServer(ids);
  }

  public regionAdd(regions: FBRegions): void {
    this.regionsCollection.add(regions);
  }

  public regionRemove(ids?: string[]): void {
    this.regionsCollection.remove(ids);
  }

  public regionSelected(ids: string | string[]): void {
    this.regionsCollection.toggleSelection(ids);
  }

  // **** NOTES (delegated to NotesCollection) ****

  readonly notes = this.notesCollection.notes;

  public refreshNotes(query?: string): Promise<void> {
    return this.notesCollection.refresh(query);
  }

  public noteSelected(id: string, showRelated: boolean): void {
    this.notesCollection.selected(id, showRelated);
  }

  public getRelatedNotes(
    collection: SKResourceType,
    id: string
  ): Promise<FBNotes> {
    return this.notesCollection.getRelated(collection, id);
  }

  public showRelatedNotes(
    id: string,
    relatedBy = 'region',
    readOnly = false
  ): Promise<void> {
    return this.notesCollection.showRelated(id, relatedBy, readOnly);
  }

  public showNoteEditor(
    e: {
      id?: string;
      position?: Position;
      group?: string;
      type?: string;
      href?: { id: string; exists: boolean };
    } | null = null
  ): Promise<void> {
    return this.notesCollection.showEditor(e);
  }

  public showNoteDetails(id: string): Promise<void> {
    return this.notesCollection.showDetails(id);
  }

  public deleteNote(id: string): void {
    this.notesCollection.delete(id);
  }

  public updateNotePosition(id: string, position: Position): Promise<void> {
    return this.notesCollection.updatePosition(id, position);
  }

  // **** TRACKS (delegated to TracksCollection) ****

  readonly tracks = this.tracksCollection.tracks;

  public refreshTracks(query?: string): Promise<void> {
    return this.tracksCollection.refresh(query);
  }

  public trackAddFromServer(ids?: string[]): void {
    this.tracksCollection.addFromServer(ids);
  }

  public trackAdd(tracks: FBTracks): void {
    this.tracksCollection.add(tracks);
  }

  public trackRemove(ids?: string[]): void {
    this.tracksCollection.remove(ids);
  }

  public editTrackInfo(id: string): Promise<void> {
    return this.tracksCollection.editInfo(id);
  }

  public deleteTrack(id: string): Promise<void> {
    return this.tracksCollection.delete(id);
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

import { Injectable, inject, signal } from '@angular/core';
import type { HttpErrorResponse } from '@angular/common/http';

import { FbDialogService } from 'src/app/design-system/primitives';
import { SignalKClient } from 'src/lib/signalk-client';
import { AppFacade } from 'src/app/app.facade';
import { GeoUtils } from 'src/app/lib/geoutils';
import type {
  ActionResult,
  FBNote,
  FBNotes,
  FBRoute,
  FBRoutes,
  LineString,
  Position,
  RouteResource,
  Routes
} from 'src/app/types';

import { SKRoute } from './resource-classes';
import { SelectionsManager } from './selections-manager';

/**
 * Routes collection: owns the route cache, /resources/routes HTTP
 * fetch/put/post/delete, the legacy start/end + legacy points-names
 * transform, the build/new-at helpers, and the new / edit / delete /
 * update-coords dialog flows. Extracted from SKResourceService so the
 * route code path lives in one file.
 *
 * Cross-collection related-notes lookup / delete on route delete is
 * inlined as direct /resources/notes HTTP calls to avoid a circular
 * dependency with SKResourceService.
 */
@Injectable({ providedIn: 'root' })
export class RoutesCollection {
  private readonly app = inject(AppFacade);
  private readonly signalk = inject(SignalKClient);
  private readonly selections = inject(SelectionsManager);
  private readonly dialog = inject(FbDialogService);

  private readonly cache = signal<FBRoutes>([]);
  readonly routes = this.cache.asReadonly();

  listFromServer(query?: string): Promise<FBRoute[]> {
    const q = query ? (query.startsWith('?') ? query : `?${query}`) : '';
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/routes${q}`)
        .subscribe(
          (res: Routes) => {
            const list: FBRoute[] = [];
            const bag = res as Record<string, RouteResource>;
            Object.keys(bag).forEach((id) => {
              const entry = bag[id];
              if (!entry) return;
              list.push([
                id,
                this.transform(entry, id),
                !this.selections.isFiltered('routes')
                  ? true
                  : this.selections.has('routes', id)
              ] as unknown as FBRoute);
            });
            resolve(list);
          },
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  fromServer(id: string): Promise<SKRoute> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/routes/${id}`)
        .subscribe(
          (res: RouteResource) => resolve(this.transform(res, id)),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  fromCache(id: string): FBRoute | undefined {
    return this.cache().find((r) => r[0] === id);
  }

  deleteOnServer(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .delete(this.app.skApiVersion, `/resources/routes/${id}`)
        .subscribe(
          () => resolve(),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  putOnServer(id: string, data: SKRoute): Promise<ActionResult> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .put(this.app.skApiVersion, `/resources/routes/${id}`, data)
        .subscribe(
          (res: ActionResult) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  postOnServer(data: SKRoute): Promise<ActionResult & { id?: string }> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .post(this.app.skApiVersion, `/resources/routes`, data)
        .subscribe(
          (res: ActionResult & { id?: string }) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  async refresh(query?: string): Promise<void> {
    this.app.debug(`** refreshRoutes(): ${query}`);
    try {
      if (this.app.data.activeRoute) {
        this.selections.add('routes', this.app.data.activeRoute);
      }
      const rtes = await this.listFromServer(query);
      const flist = rtes.filter((r) => r[2]);
      this.cache.set(flist);
    } catch (err) {
      this.app.debug('** refreshRoutes:', err);
      this.cache.set([]);
    }
  }

  addFromServer(ids?: string[]): void {
    if (!ids) {
      this.selections.unfilter('routes');
    } else if (this.selections.isFiltered('routes')) {
      this.selections.add('routes', ids);
    }
    this.refresh();
  }

  add(routes: FBRoutes): void {
    this.cache.update((current) => {
      if (this.selections.isFiltered('routes')) {
        this.selections.add(
          'routes',
          routes.map((r) => r[0])
        );
      }
      return current.concat(routes);
    });
  }

  remove(ids?: string[]): void {
    this.cache.update((current) => {
      if (!ids) {
        this.selections.clear('routes');
        return [];
      }
      this.selections.remove('routes', ids);
      return current.filter((r) => !ids.includes(r[0]));
    });
  }

  build(coordinates: LineString): FBRoute {
    const rte = new SKRoute();
    const rteUuid = this.signalk.uuid;
    rte.feature.geometry.coordinates = GeoUtils.normaliseCoords(coordinates);
    rte.distance = GeoUtils.routeLength(rte.feature.geometry.coordinates);
    return [rteUuid, rte, true];
  }

  newAt(
    coordinates: LineString,
    meta?: { href?: string; name?: string }[]
  ): void {
    if (!coordinates) return;
    const rte = this.build(coordinates);
    if (meta && Array.isArray(meta)) {
      if (!rte[1].feature.properties) {
        rte[1].feature.properties = {};
      }
      rte[1].feature.properties['coordinatesMeta'] = meta;
    }
    this.openNewDialog(rte[1]);
  }

  async openNewDialog(route: SKRoute): Promise<void> {
    if (!route) return;
    const { RouteDialog } = await import('./components/routes/route-dialog');
    this.dialog
      .open(RouteDialog, {
        disableClose: true,
        data: {
          title: 'New Route',
          route
        }
      })
      .closed.subscribe(async (res) => {
        const r = res as { save: boolean; route: SKRoute } | undefined;
        if (r?.save) {
          try {
            const rte = await this.postOnServer(r.route);
            if (rte.id) this.selections.add('routes', rte.id);
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        }
      });
  }

  async editInfo(id: string): Promise<void> {
    if (!id) return;
    let rte: SKRoute;
    try {
      this.app.sIsFetching.set(true);
      rte = await this.fromServer(id);
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
      return;
    } finally {
      this.app.sIsFetching.set(false);
    }
    const { RouteDialog } = await import('./components/routes/route-dialog');
    this.dialog
      .open(RouteDialog, {
        disableClose: true,
        data: {
          title: 'Route Details',
          addMode: false,
          route: rte
        }
      })
      .closed.subscribe((res) => {
        const r = res as { save: boolean; route: SKRoute } | undefined;
        if (r?.save) {
          this.putOnServer(id, r.route).catch((err) =>
            this.app.parseHttpErrorResponse(err)
          );
        }
      });
  }

  async delete(id: string): Promise<void> {
    if (!id) return;
    const notes = await this.fetchRelatedNotes(id);
    const checkText = notes.length !== 0 ? 'Delete attached Notes.' : '';
    this.app
      .showConfirm(
        'Do you want to delete this Route from the server?\n',
        'Delete Route:',
        'YES',
        'NO',
        checkText
      )
      .subscribe(async (res) => {
        const result = res as { ok: boolean; checked: boolean } | undefined;
        if (result?.ok) {
          try {
            await this.deleteOnServer(id);
            if (result.checked) {
              notes.forEach((note: FBNote) => this.deleteNoteOnServer(note[0]));
            }
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        }
      });
  }

  updateCoords(
    id: string,
    coords: Position[],
    coordsMeta?: { name?: string; href?: string }[]
  ): void {
    const r = this.fromCache(id);
    if (!r) return;
    const rte = r[1];
    rte.feature.geometry.coordinates = GeoUtils.normaliseCoords(coords);
    rte.distance = GeoUtils.routeLength(rte.feature.geometry.coordinates);
    if (coordsMeta) {
      if (!rte.feature.properties) {
        rte.feature.properties = {};
      }
      rte.feature.properties['coordinatesMeta'] = coordsMeta;
    }
    this.putOnServer(id, rte).catch((err) =>
      this.app.parseHttpErrorResponse(err)
    );
  }

  // ---- cross-collection helpers ----

  private fetchRelatedNotes(id: string): Promise<FBNotes> {
    return new Promise((resolve) => {
      this.signalk.api
        .get(
          this.app.skApiVersion,
          `/resources/notes?href=/resources/routes/${id}`
        )
        .subscribe(
          (res: Record<string, { name?: string }>) => {
            const list: FBNotes = [];
            Object.keys(res ?? {}).forEach((noteId) => {
              const entry = res[noteId];
              if (entry) list.push([noteId, entry, true] as unknown as FBNote);
            });
            resolve(list);
          },
          () => resolve([])
        );
    });
  }

  private deleteNoteOnServer(noteId: string): void {
    this.signalk.api
      .delete(this.app.skApiVersion, `/resources/notes/${noteId}`)
      .subscribe();
  }

  /** Server-shape to SKRoute. Public so the central transform dispatcher
   *  can route the 'routes' case here. */
  transform(rte: RouteResource, id: string): SKRoute {
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
      if (!Array.isArray(props['points'])) {
        const legacyPoints = props['points'] as { names?: unknown };
        if (Array.isArray(legacyPoints.names)) {
          const pts: { name: string }[] = [];
          (legacyPoints.names as string[]).forEach((pt) => {
            pts.push({ name: pt ?? '' });
          });
          props['coordinatesMeta'] = pts;
          delete props['points'];
        }
      }
    }
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
}

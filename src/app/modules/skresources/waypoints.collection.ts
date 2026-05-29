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
  FBWaypoint,
  FBWaypoints,
  Position,
  Waypoints,
  WaypointResource
} from 'src/app/types';

import { SKWaypoint } from './resource-classes';
import { SelectionsManager } from './selections-manager';

/**
 * Waypoints collection: owns the waypoint cache, /resources/waypoints
 * HTTP fetch/put/post/delete, the new/edit/delete dialog flows, the
 * legacy-position to feature-geometry transform, and the build/update
 * coordinate helpers. Extracted from SKResourceService so the waypoint
 * code path lives in one file.
 *
 * Cross-collection effects (related notes lookup / delete on waypoint
 * delete) are inlined as direct /resources/notes HTTP calls to avoid a
 * circular dependency with SKResourceService.
 */
@Injectable({ providedIn: 'root' })
export class WaypointsCollection {
  private readonly app = inject(AppFacade);
  private readonly signalk = inject(SignalKClient);
  private readonly selections = inject(SelectionsManager);
  private readonly dialog = inject(FbDialogService);

  private readonly cache = signal<FBWaypoints>([]);
  readonly waypoints = this.cache.asReadonly();

  listFromServer(query?: string): Promise<FBWaypoint[]> {
    const q = query ? (query.startsWith('?') ? query : `?${query}`) : '';
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/waypoints${q}`)
        .subscribe(
          (res: Waypoints) => {
            const list: FBWaypoint[] = [];
            const bag = res as Record<string, WaypointResource>;
            Object.keys(bag).forEach((id) => {
              const entry = bag[id];
              if (!entry) return;
              list.push([
                id,
                this.transform(entry, id),
                !this.selections.isFiltered('waypoints')
                  ? true
                  : this.selections.has('waypoints', id)
              ] as unknown as FBWaypoint);
            });
            resolve(list);
          },
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  fromServer(id: string): Promise<SKWaypoint> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/waypoints/${id}`)
        .subscribe(
          (res: WaypointResource) => resolve(this.transform(res, id)),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  fromCache(id: string): FBWaypoint | undefined {
    return this.cache().find((w) => w[0] === id);
  }

  deleteOnServer(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .delete(this.app.skApiVersion, `/resources/waypoints/${id}`)
        .subscribe(
          () => resolve(),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  putOnServer(id: string, data: SKWaypoint): Promise<ActionResult> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .put(this.app.skApiVersion, `/resources/waypoints/${id}`, data)
        .subscribe(
          (res: ActionResult) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  postOnServer(data: SKWaypoint): Promise<ActionResult & { id?: string }> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .post(this.app.skApiVersion, `/resources/waypoints`, data)
        .subscribe(
          (res: ActionResult & { id?: string }) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  async refresh(query?: string): Promise<void> {
    this.app.debug(`** refreshWaypoints(): ${query}`);
    try {
      if (this.app.data.activeWaypoint) {
        this.selections.add('waypoints', this.app.data.activeWaypoint);
      }
      const wpts = await this.listFromServer(query);
      const flist = wpts.filter((wpt) => wpt[2]);
      this.cache.set(flist);
    } catch (err) {
      this.app.debug('** refreshWaypoints:', err);
      this.cache.set([]);
    }
  }

  addFromServer(ids?: string[]): void {
    if (!ids) {
      this.selections.unfilter('waypoints');
    } else if (this.selections.isFiltered('waypoints')) {
      this.selections.add('waypoints', ids);
    }
    this.refresh();
  }

  add(waypoints: FBWaypoints): void {
    this.cache.update((current) => {
      if (this.selections.isFiltered('waypoints')) {
        this.selections.add(
          'waypoints',
          waypoints.map((w) => w[0])
        );
      }
      return current.concat(waypoints);
    });
  }

  remove(ids?: string[]): void {
    this.cache.update((current) => {
      if (!ids) {
        this.selections.clear('waypoints');
        return [];
      }
      this.selections.remove('waypoints', ids);
      return current.filter((w) => !ids.includes(w[0]));
    });
  }

  build(coordinates: Position): FBWaypoint {
    const wpt = new SKWaypoint();
    const wptUuid = this.signalk.uuid;
    wpt.feature.geometry.coordinates = GeoUtils.normaliseCoords(coordinates);
    return [wptUuid, wpt, true];
  }

  newAt(position: Position, name?: string): void {
    if (!position) return;
    const wpt = this.build(position);
    wpt[1].name = name ?? `Wpt-${Date.now().toString().slice(-5)}`;
    this.openNewDialog(wpt[1]);
  }

  async openNewDialog(waypoint: SKWaypoint): Promise<void> {
    if (!waypoint) return;
    const { WaypointDialog } =
      await import('./components/waypoints/waypoint-dialog');
    this.dialog
      .open(WaypointDialog, {
        disableClose: true,
        data: {
          title: 'New Waypoint',
          waypoint
        }
      })
      .closed.subscribe(async (res) => {
        const r = res as { save: boolean; waypoint: SKWaypoint } | undefined;
        if (r?.save) {
          try {
            const w = await this.postOnServer(r.waypoint);
            if (w.id) this.selections.add('waypoints', w.id);
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        }
      });
  }

  async editInfo(id: string): Promise<void> {
    if (!id) return;
    let wpt: SKWaypoint;
    try {
      this.app.sIsFetching.set(true);
      wpt = await this.fromServer(id);
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
      return;
    } finally {
      this.app.sIsFetching.set(false);
    }
    const { WaypointDialog } =
      await import('./components/waypoints/waypoint-dialog');
    this.dialog
      .open(WaypointDialog, {
        disableClose: true,
        data: {
          title: 'Waypoint Details',
          addMode: false,
          waypoint: wpt
        }
      })
      .closed.subscribe((res) => {
        const r = res as { save: boolean; waypoint: SKWaypoint } | undefined;
        if (r?.save) {
          this.putOnServer(id, r.waypoint).catch((err) =>
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
        'Do you want to delete this Waypoint from the server?\n',
        'Delete Waypoint:',
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

  updatePosition(id: string, position: Position): void {
    if (!id || !position) return;
    const w = this.fromCache(id);
    if (!w) return;
    const wpt = w[1];
    wpt.feature.geometry.coordinates = GeoUtils.normaliseCoords(position);
    const wptWithLegacyPos = wpt as SKWaypoint & {
      position?: { latitude: number; longitude: number };
    };
    wptWithLegacyPos.position = {
      latitude: wpt.feature.geometry.coordinates[1],
      longitude: wpt.feature.geometry.coordinates[0]
    };
    this.putOnServer(id, wpt).catch((err) =>
      this.app.parseHttpErrorResponse(err)
    );
  }

  // ---- cross-collection helpers (inlined to avoid circular dep) ----

  private fetchRelatedNotes(id: string): Promise<FBNotes> {
    return new Promise((resolve) => {
      this.signalk.api
        .get(
          this.app.skApiVersion,
          `/resources/notes?href=/resources/waypoints/${id}`
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

  /** Server-shape to SKWaypoint. Public so the central transform
   *  dispatcher can route the 'waypoints' case here. */
  transform(wpt: WaypointResource, id: string): SKWaypoint {
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
        wpt.name = props['name'];
        delete props['name'];
      } else {
        wpt.name = 'Wpt-' + id.slice(-6);
      }
    }
    if (!wpt.description && props) {
      if (typeof props['description'] === 'string') {
        wpt.description = props['description'];
        delete props['description'];
      } else if (typeof props['cmt'] === 'string') {
        wpt.description = props['cmt'];
      }
    }
    if (props && typeof props['skType'] === 'string') {
      wpt.type = props['skType'];
      delete props['skType'];
    }
    if (wpt.type) {
      wpt.type = wpt.type.toLowerCase();
    }
    return new SKWaypoint(wpt);
  }
}

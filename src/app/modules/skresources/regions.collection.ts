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
  FBRegion,
  FBRegions,
  Position,
  RegionResource,
  Regions
} from 'src/app/types';

import { SKRegion } from './resource-classes';
import { SelectionsManager } from './selections-manager';

/**
 * Regions collection: owns the region cache, /resources/regions HTTP
 * fetch/put/post/delete, the create/edit/delete dialogs, and the
 * legacy-geohash -> Polygon transform. Extracted from SKResourceService
 * so the regions code path lives in one file.
 *
 * Cross-collection effects (deleting related notes when a region is
 * deleted, looking up related notes) are inlined as direct
 * signalk.api.delete / .get calls against `/resources/notes` to avoid
 * a circular dependency with SKResourceService.
 */
@Injectable({ providedIn: 'root' })
export class RegionsCollection {
  private readonly app = inject(AppFacade);
  private readonly signalk = inject(SignalKClient);
  private readonly selections = inject(SelectionsManager);
  private readonly dialog = inject(FbDialogService);

  private readonly cache = signal<FBRegions>([]);
  readonly regions = this.cache.asReadonly();

  listFromServer(query?: string): Promise<FBRegion[]> {
    const q = query ? (query.startsWith('?') ? query : `?${query}`) : '';
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/regions${q}`)
        .subscribe(
          (res: Regions) => {
            const list: FBRegion[] = [];
            const bag = res as Record<string, RegionResource>;
            Object.keys(bag).forEach((id) => {
              const entry = bag[id];
              if (!entry) return;
              list.push([
                id,
                this.transform(entry, id),
                !this.selections.isFiltered('regions')
                  ? true
                  : this.selections.has('regions', id)
              ] as unknown as FBRegion);
            });
            resolve(list);
          },
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  fromServer(id: string): Promise<SKRegion> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/regions/${id}`)
        .subscribe(
          (res: RegionResource) => resolve(this.transform(res, id)),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  fromCache(id: string): FBRegion | undefined {
    return this.cache().find((r) => r[0] === id);
  }

  deleteOnServer(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .delete(this.app.skApiVersion, `/resources/regions/${id}`)
        .subscribe(
          () => resolve(),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  putOnServer(id: string, data: SKRegion): Promise<ActionResult> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .put(this.app.skApiVersion, `/resources/regions/${id}`, data)
        .subscribe(
          (res: ActionResult) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  postOnServer(data: SKRegion): Promise<ActionResult & { id?: string }> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .post(this.app.skApiVersion, `/resources/regions`, data)
        .subscribe(
          (res: ActionResult & { id?: string }) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  async refresh(query?: string): Promise<void> {
    this.app.debug(`** refreshRegions->query: ${query}`);
    try {
      const regions = await this.listFromServer(query);
      const flist = regions.filter((region) => region[2]);
      this.cache.set(flist);
    } catch (err) {
      this.app.debug('** refreshRegions:', err);
    }
  }

  addFromServer(ids?: string[]): void {
    if (!ids) {
      this.selections.unfilter('regions');
    } else if (this.selections.isFiltered('regions')) {
      this.selections.add('regions', ids);
    }
    this.refresh();
  }

  add(regions: FBRegions): void {
    this.cache.update((current) => {
      if (this.selections.isFiltered('regions')) {
        this.selections.add(
          'regions',
          regions.map((c) => c[0])
        );
      }
      return current.concat(regions);
    });
  }

  remove(ids?: string[]): void {
    this.cache.update((current) => {
      if (!ids) {
        this.selections.clear('regions');
        this.app.saveConfig();
        return [];
      }
      this.selections.remove('regions', ids);
      return current.filter((c) => !ids.includes(c[0]));
    });
  }

  toggleSelection(ids: string | string[]): void {
    const list = !Array.isArray(ids) ? [ids] : ids;
    list.forEach((id) => {
      if (!this.selections.has('regions', id)) {
        this.selections.add('regions', id);
      } else {
        this.selections.remove('regions', id);
      }
    });
    this.refresh();
  }

  updateCoords(id: string, coords: Position[][]): void {
    if (!id || !coords) return;
    const r = this.fromCache(id);
    if (!r) return;
    const region = r[1];
    const normalised = GeoUtils.normaliseCoords(coords);
    const feature = region.feature as { geometry: { coordinates: unknown } };
    feature.geometry.coordinates = normalised;
    this.putOnServer(id, region).catch((err) =>
      this.app.parseHttpErrorResponse(err)
    );
  }

  async create(region: SKRegion): Promise<void> {
    if (!region) return;
    const { RegionDialog } = await import('./components/regions/region-dialog');
    this.dialog
      .open(RegionDialog, {
        disableClose: true,
        data: { region }
      })
      .closed.subscribe(async (res) => {
        const r = res as { save: boolean; region: SKRegion } | undefined;
        if (r?.save) {
          try {
            const reg = await this.postOnServer(r.region);
            if (reg.id) this.selections.add('regions', reg.id);
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        }
      });
  }

  async editInfo(id: string): Promise<void> {
    if (!id) return;
    let region: SKRegion;
    try {
      this.app.sIsFetching.set(true);
      region = await this.fromServer(id);
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
      return;
    } finally {
      this.app.sIsFetching.set(false);
    }
    const { RegionDialog } = await import('./components/regions/region-dialog');
    this.dialog
      .open(RegionDialog, {
        disableClose: true,
        data: { region }
      })
      .closed.subscribe((res) => {
        const r = res as { save: boolean; region: SKRegion } | undefined;
        if (r?.save) {
          this.putOnServer(id, r.region).catch((err) =>
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
        'Do you want to delete this Region from the server?\n',
        'Delete Region:',
        'YES',
        'NO',
        checkText
      )
      .subscribe((res) => {
        const result = res as { ok: boolean; checked: boolean } | undefined;
        if (result?.ok) {
          this.deleteOnServer(id)
            .then(() => {
              this.refresh();
              if (result.checked) {
                notes.forEach((note: FBNote) =>
                  this.deleteNoteOnServer(note[0])
                );
              }
            })
            .catch((err: HttpErrorResponse) =>
              this.app.parseHttpErrorResponse(err)
            );
        }
      });
  }

  // ---- cross-collection helpers (inlined to avoid circular dep on SKResourceService) ----

  private fetchRelatedNotes(id: string): Promise<FBNotes> {
    return new Promise((resolve) => {
      this.signalk.api
        .get(
          this.app.skApiVersion,
          `/resources/notes?href=/resources/regions/${id}`
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

  /** Server-shape to SKRegion. Public so SKResourceService's generic
   *  transform dispatcher can route the 'regions' case here. */
  transform(region: RegionResource, id: string): SKRegion {
    const legacy = region as RegionResource & { geohash?: unknown };
    if (typeof legacy.geohash === 'string') {
      const gh = GeoUtils.geohashDecodeBbox(legacy.geohash);
      const reg = new SKRegion();
      reg.name = 'Region-' + id.slice(-6);
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
}

import { Injectable, inject, signal } from '@angular/core';
import type { HttpErrorResponse } from '@angular/common/http';

import { FbDialogService } from 'src/app/design-system/primitives';
import { SignalKClient } from 'src/lib/signalk-client';
import { AppFacade } from 'src/app/app.facade';
import type {
  ActionResult,
  FBTrack,
  FBTracks,
  TrackResource,
  Tracks
} from 'src/app/types';

import { SKTrack } from './resource-classes';
import { SelectionsManager } from './selections-manager';

/**
 * Tracks collection: owns the per-vessel track cache, the server-side
 * fetch/put/delete plumbing for the `/resources/tracks` endpoint, and
 * the track-editor / delete-confirmation dialogs. Extracted from
 * SKResourceService so the tracks code path lives in one place.
 *
 * SKResourceService still owns its generic dispatchers (fromCache,
 * fromServer, listFromServer, etc.) for cross-collection callers; the
 * tracks-specific bodies of those dispatchers delegate here.
 */
@Injectable({ providedIn: 'root' })
export class TracksCollection {
  private readonly app = inject(AppFacade);
  private readonly signalk = inject(SignalKClient);
  private readonly selections = inject(SelectionsManager);
  private readonly dialog = inject(FbDialogService);

  private readonly cache = signal<FBTracks>([]);
  readonly tracks = this.cache.asReadonly();

  /** Server-side list fetch, scoped to `/resources/tracks`. */
  listFromServer(query?: string): Promise<FBTrack[]> {
    const q = query ? (query.startsWith('?') ? query : `?${query}`) : '';
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/tracks${q}`)
        .subscribe(
          (res: Tracks) => {
            const list: FBTrack[] = [];
            const bag = res as Record<string, TrackResource>;
            Object.keys(bag).forEach((id) => {
              const entry = bag[id];
              if (!entry) return;
              list.push([
                id,
                this.transform(entry),
                !this.selections.isFiltered('tracks')
                  ? true
                  : this.selections.has('tracks', id)
              ] as unknown as FBTrack);
            });
            resolve(list);
          },
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  fromServer(id: string): Promise<SKTrack> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .get(this.app.skApiVersion, `/resources/tracks/${id}`)
        .subscribe(
          (res: TrackResource) => resolve(this.transform(res)),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  fromCache(id: string): FBTrack | undefined {
    return this.cache().find((t) => t[0] === id);
  }

  deleteOnServer(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .delete(this.app.skApiVersion, `/resources/tracks/${id}`)
        .subscribe(
          () => resolve(),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  putOnServer(id: string, data: SKTrack): Promise<ActionResult> {
    return new Promise((resolve, reject) => {
      this.signalk.api
        .put(this.app.skApiVersion, `/resources/tracks/${id}`, data)
        .subscribe(
          (res: ActionResult) => resolve(res),
          (err: HttpErrorResponse) => reject(err)
        );
    });
  }

  /** Refresh the track cache from server. Filter applied through SelectionsManager. */
  async refresh(query?: string): Promise<void> {
    this.app.debug(`** refreshTracks(): ${query}`);
    try {
      const trks = await this.listFromServer(query);
      const flist = trks.filter((track) => track[2]);
      this.cache.set(flist);
    } catch (err) {
      this.app.debug('** refreshTracks:', err);
      this.cache.set([]);
    }
  }

  addFromServer(ids?: string[]): void {
    if (!ids) {
      this.selections.unfilter('tracks');
    } else if (this.selections.isFiltered('tracks')) {
      this.selections.add('tracks', ids);
    }
    this.refresh();
  }

  add(tracks: FBTracks): void {
    this.cache.update((current) => {
      if (this.selections.isFiltered('tracks')) {
        this.selections.add(
          'tracks',
          tracks.map((r) => r[0])
        );
      }
      return current.concat(tracks);
    });
  }

  remove(ids?: string[]): void {
    this.cache.update((current) => {
      if (!ids) {
        this.selections.clear('tracks');
        return [];
      }
      this.selections.remove('tracks', ids);
      return current.filter((t) => !ids.includes(t[0]));
    });
  }

  async editInfo(id: string): Promise<void> {
    if (!id) return;
    let trk: SKTrack;
    try {
      this.app.sIsFetching.set(true);
      trk = await this.fromServer(id);
    } catch (err) {
      this.app.parseHttpErrorResponse(err);
      return;
    } finally {
      this.app.sIsFetching.set(false);
    }
    const { TrackDialog } = await import('./components/tracks/track-dialog');
    this.dialog
      .open(TrackDialog, {
        disableClose: true,
        data: { track: trk }
      })
      .closed.subscribe((res) => {
        const r = res as { save: boolean; track: SKTrack } | undefined;
        if (r?.save) {
          this.putOnServer(id, r.track);
        }
      });
  }

  async delete(id: string): Promise<void> {
    if (!id) return;
    this.app
      .showConfirm(
        'Do you want to delete this Track from the server?\n',
        'Delete Track:',
        'YES',
        'NO'
      )
      .subscribe(async (res) => {
        const result = res as { ok: boolean; checked: boolean } | undefined;
        if (result?.ok) {
          try {
            await this.deleteOnServer(id);
          } catch (err) {
            this.app.parseHttpErrorResponse(err);
          }
        }
      });
  }

  private transform(trk: TrackResource): SKTrack {
    return new SKTrack(trk);
  }
}

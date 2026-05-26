import { effect, inject, Injectable, signal } from '@angular/core';
import { SKResourceService, SKResourceType } from '../skresources';
import {
  SKChart,
  SKNote,
  SKRegion,
  SKRoute,
  SKTrack,
  SKWaypoint
} from '../skresources/resource-classes';
import type {
  ChartResource,
  FBNote,
  FBRegion,
  FBRoute,
  FBWaypoint,
  NoteResource,
  RegionResource,
  RouteResource,
  TrackResource,
  WaypointResource
} from 'src/app/types';
import { SKWorkerService } from '../skstream/skstream.service';

type InfoPanelResource =
  | SKRoute
  | SKWaypoint
  | SKRegion
  | SKNote
  | SKChart
  | SKTrack;

export interface InfoPanelItem {
  type: SKResourceType;
  id: string;
  resource: InfoPanelResource;
}

@Injectable({ providedIn: 'root' })
export class InfoPanelFacade {
  private _opened = signal<boolean>(false);
  readonly opened = this._opened.asReadonly();

  private _item = signal<InfoPanelItem | undefined>(undefined);
  readonly item = this._item.asReadonly();

  private _related = signal<string | undefined>(undefined);
  readonly related = this._related.asReadonly();

  private worker = inject(SKWorkerService);
  private skres = inject(SKResourceService);

  constructor() {
    effect(() => {
      const update = this.worker.resourceUpdate();
      const np = update.path.split('.');
      if (np.length !== 3) {
        return;
      }
      const collection = np[1];
      const itemId = np[2];
      const current = this._item();
      if (current && collection === current.type && itemId === current.id) {
        if (!update.value) {
          this.close();
        } else {
          this._item.set({
            type: current.type,
            id: current.id,
            resource: this.skres.transform(
              current.type,
              update.value as
                | RouteResource
                | WaypointResource
                | RegionResource
                | NoteResource
                | ChartResource
                | TrackResource,
              current.id
            )
          });
        }
      }
      if (
        collection === 'groups' ||
        (collection === 'notes' && current?.type !== 'notes')
      ) {
        this._related.set(`${collection}.${Date.now()}`);
      }
    });
  }

  /**
   * @description Fetch resource with supplied id and open InfoPanel
   * @param id note identifier
   */
  public async open(resourceType: SKResourceType, id: string) {
    if (!id) {
      return;
    }
    try {
      const r = await this.skres.fromServer(resourceType, id);
      if (r) {
        this._item.set({ type: resourceType, id, resource: r });
        this._opened.set(true);
        return;
      }
    } catch {
      return;
    }
  }

  /**
   * @description Open InfoPanel with the supplied resource
   * @param resource
   */
  public openWith(
    resourceType: SKResourceType,
    resource: FBNote | FBRegion | FBWaypoint | FBRoute
  ) {
    if (!resourceType || !resource) {
      return;
    }
    this._item.set({
      type: resourceType,
      id: resource[0],
      resource: resource[1]
    });
    this._opened.set(true);
  }

  public close() {
    this._item.set(undefined);
    this._opened.set(false);
  }
}

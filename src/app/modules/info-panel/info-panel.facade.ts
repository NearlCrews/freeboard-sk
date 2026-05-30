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
  ResourceSet,
  RouteResource,
  TrackResource,
  WaypointResource
} from 'src/app/types';
import type { SKAircraft, SKAtoN, SKMeteo, SKVessel } from '../skresources';
import type { AlertData } from '../alarms';
import { SKWorkerService } from '../skstream/skstream.service';

type SKResourceItem =
  | SKRoute
  | SKWaypoint
  | SKRegion
  | SKNote
  | SKChart
  | SKTrack;

/**
 * Discriminated union of every type the left info-panel can display.
 * Replaces the on-map popover overlay; the map click handler now opens
 * the side panel with one of these payloads instead of mounting an
 * `<ol-overlay>` popover.
 */
export type InfoPanelItem =
  | {
      kind: 'resource';
      type: SKResourceType;
      id: string;
      resource: SKResourceItem;
    }
  | {
      kind: 'vessel';
      id: string;
      vessel: SKVessel;
      isSelf: boolean;
    }
  | {
      kind: 'aircraft';
      id: string;
      target: SKAircraft;
    }
  | {
      kind: 'aton';
      id: string;
      target: SKAtoN | SKMeteo;
    }
  | {
      kind: 'alarm';
      id: string;
      alarm: AlertData;
    }
  | {
      kind: 's57';
      id: string;
      title: string;
      properties: Record<string, unknown>;
    }
  | {
      kind: 'resourceset';
      id: string;
      title: string;
      resource: ResourceSet;
      readOnly: boolean;
    }
  | {
      kind: 'featurelist';
      title: string;
      features: readonly {
        id: string;
        label: string;
        icon?: string;
        type?: SKResourceType;
      }[];
    }
  | {
      kind: 'chartlist';
      features: readonly { id: string; label: string }[];
    };

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
      if (
        current?.kind === 'resource' &&
        collection === current.type &&
        itemId === current.id
      ) {
        if (!update.value) {
          this.close();
        } else {
          this._item.set({
            kind: 'resource',
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
        (collection === 'notes' &&
          current?.kind === 'resource' &&
          current.type !== 'notes')
      ) {
        this._related.set(`${collection}.${Date.now()}`);
      }
    });
  }

  public async open(resourceType: SKResourceType, id: string) {
    if (!id) {
      return;
    }
    try {
      const r = await this.skres.fromServer(resourceType, id);
      if (r) {
        this._item.set({
          kind: 'resource',
          type: resourceType,
          id,
          resource: r
        });
        this._opened.set(true);
        return;
      }
    } catch (err) {
      // Surface fetch failures so the next 'silent no-op' bug is visible
      // in DevTools instead of vanishing into a catch{}. Callers have no
      // error UI today; a warn beats swallowing.
      console.warn(`InfoPanel.open(${resourceType}, ${id}) failed:`, err);
    }
  }

  public openWith(
    resourceType: SKResourceType,
    resource: FBNote | FBRegion | FBWaypoint | FBRoute
  ) {
    if (!resourceType || !resource) {
      return;
    }
    this._item.set({
      kind: 'resource',
      type: resourceType,
      id: resource[0],
      resource: resource[1]
    });
    this._opened.set(true);
  }

  public openVessel(id: string, vessel: SKVessel, isSelf: boolean): void {
    this._item.set({ kind: 'vessel', id, vessel, isSelf });
    this._opened.set(true);
  }

  public openAircraft(id: string, target: SKAircraft): void {
    this._item.set({ kind: 'aircraft', id, target });
    this._opened.set(true);
  }

  public openAton(id: string, target: SKAtoN | SKMeteo): void {
    this._item.set({ kind: 'aton', id, target });
    this._opened.set(true);
  }

  public openAlarm(id: string, alarm: AlertData): void {
    this._item.set({ kind: 'alarm', id, alarm });
    this._opened.set(true);
  }

  public openS57(
    id: string,
    title: string,
    properties: Record<string, unknown>
  ): void {
    this._item.set({ kind: 's57', id, title, properties });
    this._opened.set(true);
  }

  public openResourceSet(
    id: string,
    title: string,
    resource: ResourceSet,
    readOnly: boolean
  ): void {
    this._item.set({ kind: 'resourceset', id, title, resource, readOnly });
    this._opened.set(true);
  }

  public openFeatureList(
    title: string,
    features: readonly {
      id: string;
      label: string;
      icon?: string;
      type?: SKResourceType;
    }[]
  ): void {
    this._item.set({ kind: 'featurelist', title, features });
    this._opened.set(true);
  }

  public openChartList(
    features: readonly { id: string; label: string }[]
  ): void {
    this._item.set({ kind: 'chartlist', features });
    this._opened.set(true);
  }

  public close() {
    this._item.set(undefined);
    this._opened.set(false);
  }
}

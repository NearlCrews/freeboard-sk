import { Injectable, inject } from '@angular/core';

import { SignalKClient } from 'src/lib/signalk-client';
import type { IAppConfig } from 'src/app/types';

export interface CustomResourceDef {
  name: string;
  description: string;
  featureKey: string;
}

/**
 * Phase 3 Batch 3: owns the resource-path tables and the server-alignment
 * pass that prunes user-selected custom paths down to the set the server
 * actually serves. Resource cache fetch / mutation lives in
 * SKResourceService and FBCustomResourceService; this store just holds the
 * naming taxonomy and the alignment side effect.
 */
@Injectable({ providedIn: 'root' })
export class ResourceStore {
  private readonly signalk = inject(SignalKClient);

  readonly STANDARD_RESOURCES: readonly string[] = [
    'routes',
    'waypoints',
    'regions',
    'notes',
    'charts'
  ];

  readonly CUSTOM_RESOURCES: readonly CustomResourceDef[] = [
    {
      name: 'tracks',
      description: 'Freeboard GPX track imports.',
      featureKey: 'resourceTracks'
    },
    {
      name: 'infolayers',
      description: 'Freeboard map overlays.',
      featureKey: 'infoLayers'
    },
    {
      name: 'groups',
      description: 'Freeboard resource groups.',
      featureKey: 'resourceGroups'
    }
  ];

  /** Resources Freeboard owns the UI for and therefore filters out of the
   * "custom paths" picker. */
  get IGNORE_RESOURCES(): string[] {
    return this.STANDARD_RESOURCES.concat(
      this.CUSTOM_RESOURCES.map((i) => i.name),
      ['buddies']
    );
  }

  /**
   * Align selected custom resource paths with those enabled on the server:
   * any path the user selected but the server no longer serves is dropped.
   */
  alignCustomResourcesPaths(config: IAppConfig, skApiVersion: number): void {
    this.signalk.api
      .get(skApiVersion, '/resources')
      .subscribe((res: Record<string, { description: string }>) => {
        const paths = new Set(
          Object.keys(res).filter((i) => !this.IGNORE_RESOURCES.includes(i))
        );
        config.resources.paths = config.resources.paths.filter((k) =>
          paths.has(k)
        );
      });
  }
}

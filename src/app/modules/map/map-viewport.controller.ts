import { Injectable, WritableSignal, inject } from '@angular/core';
import type Map from 'ol/Map';
import { ScaleLine } from 'ol/control';
import type { Units } from 'ol/control/ScaleLine';

import { AppFacade } from 'src/app/app.facade';
import type { FBMapEvent } from './ol/lib/map.component';
import type { Position } from 'src/app/types';

/**
 * Owns the imperative map-viewport side effects that fb-map.component
 * used to inline: writing the current zoom / extent / center / rotation
 * back to the AppFacade, rotating the map view to North-Up or
 * heading-up, centering on the active vessel, and applying the
 * scale-bar unit choice to the OL ScaleLine control. The component
 * still owns the template-bound signals; the controller mutates them
 * through the writable-signal parameters so the OnPush change detection
 * keeps tracking the same source of truth.
 */
@Injectable({ providedIn: 'root' })
export class MapViewportController {
  private readonly app = inject(AppFacade);

  /** Apply the latest move event back to AppFacade state. The component
   *  follows up with drawVesselLines + renderMapContents because those
   *  also touch component-local feature state. */
  applyMoveEnd(e: FBMapEvent): void {
    this.app.config.map.zoomLevel = e.zoom;
    this.app.mapExtent.update(() => e.extent);
    this.app.mapViewTopCenter.update(() => e.topCenter as Position);
    this.app.mapViewRightCenter.update(() => e.rightCenter as Position);
    this.app.mapViewRotation.update(() => e.rotation);
    this.app.config.map.center = e.lonlat as Position;
  }

  rotateMap(
    northUp: boolean,
    orientation: number,
    rotationSignal: WritableSignal<number>
  ): void {
    if (northUp) {
      rotationSignal.set(0);
    } else {
      rotationSignal.update(() => 0 - orientation);
    }
  }

  centerVessel(centerSignal: WritableSignal<Position>): void {
    const pos = this.app.calcMapCenter();
    centerSignal.update(() => pos);
  }

  setScaleUnits(olMap: Map | null | undefined, scaleUnits: string): void {
    try {
      const u: Units = ['kilometer', 'm'].includes(scaleUnits)
        ? 'metric'
        : 'nautical';
      const controls = olMap?.getControls().getArray();
      (controls?.[0] as ScaleLine | undefined)?.setUnits(u);
    } catch {
      // no map or scale control yet
    }
  }
}

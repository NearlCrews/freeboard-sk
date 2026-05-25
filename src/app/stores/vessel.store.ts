import { Injectable, Signal, signal } from '@angular/core';
import { Extent } from 'ol/extent';

import type { IAppConfig, LineString, Position } from 'src/app/types';
import { GeoUtils } from 'src/app/lib/geoutils';
import type { LineStyleDef } from 'src/app/modules/settings/components/linestyle-select.component';

/**
 * Subset of FBAppData.vessels.active needed by calcMapCenter so the store
 * stays independent of the broader app data model.
 */
export interface VesselActiveSnapshot {
  position: Position;
  orientation?: number;
  cogTrue?: number | null;
  headingTrue?: number | null;
}

/**
 * Phase 3 Batch 3: owns self-vessel render state (trail, COG / heading line
 * styles), map viewport observables, and the map-zoom extent constant. The
 * full SignalK delta-driven vessel state migration (AIS targets, position
 * pipeline) is Phase 5+ scope: see MODERNIZATION_ROADMAP.md.
 */
@Injectable({ providedIn: 'root' })
export class VesselStore {
  /** Map zoom limits enforced by the chart layer. */
  readonly MAP_ZOOM_EXTENT = signal<{ min: number; max: number }>({
    min: 2,
    max: 28
  });

  private readonly _selfLines = signal<{
    cog: LineStyleDef;
    heading: LineStyleDef;
  }>({
    cog: {
      fill: { color: 'rgba(204, 12, 225, 0.7)' },
      stroke: {
        color: 'rgba(204, 12, 225, 0.7)',
        width: 1,
        lineDash: null
      }
    },
    heading: {
      fill: { color: 'rgba(221, 99, 0, 0.5)' },
      stroke: {
        color: 'rgba(221, 99, 0, 0.5)',
        width: 4,
        lineDash: null
      }
    }
  });
  readonly selfLines = this._selfLines;

  private readonly _selfTrail = signal<LineString>([]);
  readonly selfTrail = this._selfTrail;

  private readonly _selfTrailFromServer = signal<LineString>([]);
  readonly selfTrailFromServer = this._selfTrailFromServer;

  readonly mapExtent = signal<Extent>([]);
  readonly mapViewTopCenter = signal<Position>([0, 0]);
  readonly mapViewRightCenter = signal<Position>([0, 0]);
  readonly mapViewRotation = signal<number>(0);

  /** Read-only views useful for templates that should not mutate state. */
  readonly selfTrailReadonly: Signal<LineString> = this._selfTrail.asReadonly();
  readonly selfTrailFromServerReadonly: Signal<LineString> =
    this._selfTrailFromServer.asReadonly();

  /** Append a point to the self trail; no-ops on duplicate of last point. */
  addToSelfTrail(pt: Position): void {
    this._selfTrail.update((current) => {
      if (current.length === 0) {
        return current;
      }
      const lastPoint = current.slice(-1)[0];
      if (pt[0] === lastPoint[0] && pt[1] === lastPoint[1]) {
        return current;
      }
      return [...current, pt];
    });
  }

  /**
   * Compute the position to recenter the map on, accounting for centerOffset
   * and current rotation. CoG-aware: a configured offset slides the vessel
   * away from the screen edge in the direction of travel.
   *
   * See the in-file derivation: in OL, a CW bearing β has projected-space
   * direction (sin β, cos β). With OL view rotation rot (CCW), the
   * screen-space components are sx = sin(β + rot) and sy = cos(β + rot).
   * The viewport edge in that direction lies at min(hw / |sx|, hh / |sy|)
   * where hw and hh are geodetic half-width and half-height.
   */
  calcMapCenter(config: IAppConfig, vessel: VesselActiveSnapshot): Position {
    const cog = vessel.cogTrue ?? vessel.headingTrue;
    if (cog === null || cog === undefined) {
      return vessel.position;
    }
    const center = config.map.center as Position;
    const hh = GeoUtils.distanceTo(center, this.mapViewTopCenter());
    const hw = GeoUtils.distanceTo(center, this.mapViewRightCenter());
    const rot = this.mapViewRotation();
    const sx = Math.abs(Math.sin(cog + rot));
    const sy = Math.abs(Math.cos(cog + rot));
    const edgeDistance = Math.min(
      sx > 1e-10 ? hw / sx : Infinity,
      sy > 1e-10 ? hh / sy : Infinity
    );
    const offsetDistance = edgeDistance * (config.map.centerOffset ?? 0.5);
    return GeoUtils.destCoordinate(vessel.position, cog, offsetDistance);
  }

  /** Replace the local self trail buffer (e.g., from IndexedDB hydration). */
  setSelfTrail(trail: LineString): void {
    this._selfTrail.set(trail ?? []);
  }

  /** Replace the server-fetched trail buffer. */
  setSelfTrailFromServer(trail: LineString): void {
    this._selfTrailFromServer.set(trail ?? []);
  }
}

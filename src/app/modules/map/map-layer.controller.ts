import { Injectable, WritableSignal, inject } from '@angular/core';

import { AppFacade } from 'src/app/app.facade';
import { Convert } from 'src/app/lib/convert';
import { GeoUtils } from 'src/app/lib/geoutils';

import { FBCustomResourceService } from 'src/app/modules/skresources/custom-resources-service';
import { SKResourceService } from 'src/app/modules/skresources/resources.service';

/**
 * Layer-fetch policy controller for fb-map.component. Owns the
 * decision logic for when to refresh the Notes and ResourceSets
 * layers on map move/zoom, and the shared "has the center moved more
 * than half the fetch radius" threshold check.
 *
 * `refreshOnViewChange` is the entry point onMapMoveEnd calls. The
 * component still owns `showNoteslayer` (template-bound) so
 * `refreshOnViewChange` takes that signal as a parameter to flip its
 * visibility alongside the Notes-fetch decision.
 */
@Injectable({ providedIn: 'root' })
export class MapLayerController {
  private readonly app = inject(AppFacade);
  private readonly skres = inject(SKResourceService);
  private readonly skresOther = inject(FBCustomResourceService);

  /** Called from fb-map.onMapMoveEnd. Decides whether to refresh the
   *  Notes and ResourceSets layers based on the current map view.
   *  `mapZoomLevel` is the component's authoritative zoom signal value
   *  (kept separate from app.config.map.zoomLevel because the input
   *  binding refreshes that one independently). */
  refreshOnViewChange(
    zoomChanged: boolean,
    mapZoomLevel: number,
    showNoteslayer: WritableSignal<boolean>
  ): void {
    if (this.shouldFetchNotes(zoomChanged, mapZoomLevel, showNoteslayer)) {
      void this.skres.refreshNotes();
      this.app.debug(`fetching Notes...`);
    }
    if (this.shouldFetchResourceSets(zoomChanged)) {
      this.app.debug(`fetching ResourceSets...`);
      void this.skresOther.refreshResourceSetsInBounds();
    }
  }

  /** Returns true when the map center has moved more than half the
   *  supplied threshold (in distance units honoring config.units). */
  mapMoveThresholdExceeded(threshold: number): boolean {
    if (!this.app.data.lastGet) {
      this.app.data.lastGet = this.app.config.map.center;
      return true;
    }
    const d = GeoUtils.distanceTo(
      this.app.data.lastGet,
      this.app.config.map.center
    );
    this.app.debug(`distance map moved: ${d}`);
    const cr =
      this.app.config.units.distance === 'kilometer'
        ? threshold * 1000
        : Convert.nauticalMilesToKm(threshold) * 1000;
    this.app.debug(`mapMoveThresholdExceeded: ${d >= cr / 2}`);
    if (d >= cr / 2) {
      this.app.data.lastGet = this.app.config.map.center;
      return true;
    }
    return false;
  }

  private shouldFetchResourceSets(zoomChanged: boolean): boolean {
    if (
      this.app.config.resources.fetchRadius !== 0 &&
      this.app.config.resources.fetchFilter
    ) {
      if (!this.skresOther.anyResourceSetSelection()) return false;
      if (zoomChanged) return true;
      return this.mapMoveThresholdExceeded(50);
    }
    return false;
  }

  private shouldFetchNotes(
    zoomChanged: boolean,
    mapZoomLevel: number,
    showNoteslayer: WritableSignal<boolean>
  ): boolean {
    showNoteslayer.update(
      () =>
        this.app.config.ui.showNotes &&
        this.app.config.map.zoomLevel >= this.app.config.resources.notes.minZoom
    );

    this.app.debug(`lastGet: ${JSON.stringify(this.app.data.lastGet)}`);
    this.app.debug(`getRadius: ${this.app.config.resources.notes.getRadius}`);

    if (zoomChanged) {
      return mapZoomLevel >= this.app.config.resources.notes.minZoom;
    }
    return this.mapMoveThresholdExceeded(
      this.app.config.resources.notes.getRadius
    );
  }
}

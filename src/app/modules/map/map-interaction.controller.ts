import { Injectable, WritableSignal, inject } from '@angular/core';
import type Feature from 'ol/Feature';
import type { DragBoxEvent } from 'ol/interaction/DragBox';
import type { DrawEvent } from 'ol/interaction/Draw';
import { LineString as OlLineString, Circle as OlCircle } from 'ol/geom';
import { toLonLat } from 'ol/proj';

import { AppFacade } from 'src/app/app.facade';
import { GeoUtils } from 'src/app/lib/geoutils';
import type { Position } from 'src/app/types';

import { FBMapInteractService, IPopover } from './fbmap-interact.service';

/**
 * Owns the imperative measure / drag-box / draw interaction handlers
 * that fb-map.component used to inline. The component still owns the
 * overlay signal (template-bound) and forwards each event to the
 * matching controller method along with that signal so the controller
 * can mutate the overlay without taking a circular dependency on the
 * component itself.
 *
 * Pointer/click/right-click handlers stay in the component because
 * they touch broader feature state (formatPopover dispatching to
 * vessel/aton/aircraft InfoPanels). parseClickInMeasureMode lives
 * here because it is purely a measure-mode helper.
 */
@Injectable({ providedIn: 'root' })
export class MapInteractionController {
  private readonly app = inject(AppFacade);
  private readonly mapInteract = inject(FBMapInteractService);

  // ----- measure -----

  handleMeasureStart(e: DrawEvent, overlay: WritableSignal<IPopover>): void {
    this.app.debug(`onMeasureStart()...`, this.mapInteract.measureGeometryType);
    let ovPosition: Position;
    if (this.mapInteract.measureGeometryType === 'LineString') {
      const geom = e.feature.getGeometry() as OlLineString;
      let c: Position[] = geom
        .getCoordinates()
        .map((p) => toLonLat(p as [number, number]) as Position);
      c = c.slice(0, c.length - 1);
      this.mapInteract.measurementCoords = c;
      ovPosition = (c[0] ?? [0, 0]) as Position;
    } else {
      const g = e.feature.getGeometry() as OlCircle;
      const center = toLonLat(g.getCenter());
      const radius: number = g.getRadius();
      this.mapInteract.measurementCenter = center as Position;
      this.mapInteract.measurementRadius = radius;
      ovPosition = center as Position;
      this.app.debug(this.mapInteract.measurement);
    }
    // hide any prior popover before showing the measure overlay
    overlay.update((current) => ({ ...current, show: false }));
    overlay.update((current) => ({
      ...current,
      position: ovPosition,
      title: '0',
      show: true,
      type: 'measure'
    }));
  }

  handleMeasureClick(pt: Position, overlay: WritableSignal<IPopover>): void {
    this.app.debug(`onMeasureClick()...`);
    if (!Array.isArray(pt)) return;
    const coords = this.mapInteract.measurement().coords ?? [];
    const lastPt = coords[coords.length - 1];
    if (lastPt && pt[0] === lastPt[0] && pt[1] === lastPt[1]) {
      return;
    }
    const lm = this.mapInteract.addMeasurementCoord(pt);
    const newCoords = this.mapInteract.measurement().coords ?? [];
    const tail = newCoords.slice(-2);
    const t0 = tail[0];
    const t1 = tail[1];
    const b = t0 && t1 ? GeoUtils.greatCircleBearing(t0, t1) : 0;
    overlay.update((current) => ({
      ...current,
      position: pt,
      title: `${this.app.formatValueForDisplay(
        lm,
        'm'
      )} ${this.app.formatValueForDisplay(b, 'deg')}`
    }));
  }

  handleMeasureEnd(overlay: WritableSignal<IPopover>): void {
    this.app.debug(`onMeasureEnd()...`);
    overlay.update((current) => ({ ...current, show: false }));
    this.mapInteract.stopMeasuring();
  }

  parseClickInMeasureMode(
    pos: Position,
    overlay: WritableSignal<IPopover>
  ): void {
    const measurement = this.mapInteract.measurement();
    if (
      this.mapInteract.measureGeometryType === 'LineString' &&
      measurement &&
      (measurement.coords?.length ?? 0) !== 0
    ) {
      this.handleMeasureClick(pos, overlay);
    }
  }

  // ----- drag-box select -----

  handleDragBoxStart(e: DragBoxEvent): void {
    const c = toLonLat(e.coordinate);
    this.mapInteract.initBoxCoord(c as Position);
  }

  handleDragBoxEnd(e: DragBoxEvent): void {
    const c = toLonLat(e.coordinate);
    this.mapInteract.stopBoxSelection(c as Position);
  }

  handleDragBoxCancel(): void {
    this.app.debug(`onDragBoxCancel()...`);
    this.mapInteract.stopBoxSelection();
  }

  // ----- draw -----

  handleDrawClick(fa: Feature[]): void {
    if (!Array.isArray(fa)) return;
    if (this.mapInteract.draw.resourceType === 'route') {
      let rteCoords: Position[] = [];
      fa.forEach((f: Feature) => {
        const geom = f.getGeometry();
        if (geom?.getType() === 'LineString') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rteCoords = (geom as any)
            .getCoordinates()
            .map((c: Position) => toLonLat(c as [number, number]) as Position);
          rteCoords = rteCoords.slice(0, rteCoords.length - 1);
        }
      });
      this.mapInteract.measurementCoords = rteCoords;
    }
  }
}

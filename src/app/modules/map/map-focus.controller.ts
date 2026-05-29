import { Injectable, WritableSignal, inject } from '@angular/core';

import { AppFacade } from 'src/app/app.facade';
import { Convert } from 'src/app/lib/convert';
import { Angle, GeoUtils } from 'src/app/lib/geoutils';
import { CourseService } from 'src/app/modules/course/course.service';
import type { LineString, MultiLineString, Position } from 'src/app/types';

import type { IFeatureData } from './fb-map.component';
import { zoomOffsetLevel } from './ol/lib/map.component';

interface PerfLaylines {
  port: MultiLineString;
  starboard: MultiLineString;
}

interface VesselLines {
  cog: LineString;
  heading: LineString;
}

/**
 * Focus-vessel render controller: owns the imperative math that turns
 * the focused vessel's cog/heading/sog state and the active course leg
 * into the line geometry rendered on the map. Extracted from fb-map so
 * `drawVesselLines` and `buildLaylines` (together ~180 LOC) live apart
 * from the component's event surface.
 *
 * The component owns the template-bound signals (vesselLines,
 * perfTargetAngle, perfLaylines) and forwards them to the controller
 * methods along with the feature-state container `dfeat`, so OnPush
 * change detection keeps tracking the same source of truth.
 */
@Injectable({ providedIn: 'root' })
export class MapFocusController {
  private readonly app = inject(AppFacade);
  private readonly course = inject(CourseService);

  drawVesselLines(opts: {
    mapZoomLevel: number;
    vesselUpdate: boolean;
    dfeat: IFeatureData;
    vesselLines: WritableSignal<VesselLines>;
    perfTargetAngle: WritableSignal<LineString>;
    perfLaylines: WritableSignal<PerfLaylines>;
  }): void {
    const { mapZoomLevel, vesselUpdate, dfeat, vesselLines } = opts;
    const z = mapZoomLevel;
    const offset = z < 29 ? (zoomOffsetLevel[Math.floor(z)] ?? 60) : 60;
    const wMax = 10;

    if (vesselUpdate && dfeat.self.position) {
      this.app.addToSelfTrail(dfeat.self.position);
    }

    this.buildLaylines(dfeat, opts.perfTargetAngle, opts.perfLaylines);

    const active = dfeat.active;
    const cog = active.vectors.cog ?? [];
    const sog = active.sog || 0;
    const headingLen = this.app.config.vessels.selfLines.heading.length;
    const hl =
      headingLen === -1
        ? (sog > wMax ? wMax : sog) * offset
        : Convert.nauticalMilesToKm(headingLen) * 1000;
    const activePos = active.position;
    const heading: LineString = activePos
      ? [
          activePos,
          GeoUtils.rhumbDestination(activePos, active.orientation, hl)
        ]
      : [];
    vesselLines.set({ cog, heading });
  }

  private buildLaylines(
    dfeat: IFeatureData,
    perfTargetAngle: WritableSignal<LineString>,
    perfLaylines: WritableSignal<PerfLaylines>
  ): void {
    const navPos = dfeat.navData.position;
    if (
      !this.app.config.vessels.laylines ||
      !Array.isArray(navPos) ||
      typeof navPos[0] !== 'number' ||
      typeof this.app.data.vessels.active.heading !== 'number'
    ) {
      return;
    }
    const twd_deg = Convert.radiansToDegrees(
      this.app.data.vessels.self.wind.direction ?? 0
    );
    const twd_inv = Angle.add(twd_deg, 180);
    const destUpwind =
      Math.abs(
        Angle.difference(this.course.courseData().bearing.value, twd_deg)
      ) < 90;

    const ba_deg = Convert.radiansToDegrees(
      this.app.data.vessels.self.performance.beatAngle ?? Math.PI / 4
    );

    let ga_deg: number | undefined;
    let ga_diff: number | undefined;
    if (typeof this.app.data.vessels.self.performance.gybeAngle === 'number') {
      ga_deg = Convert.radiansToDegrees(
        this.app.data.vessels.self.performance.gybeAngle
      );
      ga_diff = 180 - Math.abs(ga_deg);
    }

    const destInTarget = destUpwind
      ? Math.abs(
          Angle.difference(this.course.courseData().bearing.value, twd_deg)
        ) < ba_deg
      : Math.abs(
          Angle.difference(this.course.courseData().bearing.value, twd_inv)
        ) < (ga_diff ?? 0);

    const dtg =
      this.app.config.units.distance === 'kilometer'
        ? this.course.courseData().dtg * 1000
        : Convert.nauticalMilesToKm(this.course.courseData().dtg * 1000);

    let markLines: Position[] = [];
    if (destUpwind) {
      const bapt1 = GeoUtils.destCoordinate(
        navPos,
        Convert.degreesToRadians(Angle.add(twd_inv, ba_deg)),
        dtg
      );
      const bapt2 = GeoUtils.destCoordinate(
        navPos,
        Convert.degreesToRadians(Angle.add(twd_inv, 0 - ba_deg)),
        dtg
      );
      markLines = [bapt1, navPos, bapt2];
    } else if (typeof ga_deg === 'number') {
      const gapt1 = GeoUtils.destCoordinate(
        navPos,
        Convert.degreesToRadians(Angle.add(twd_inv, ga_deg)),
        dtg
      );
      const gapt2 = GeoUtils.destCoordinate(
        navPos,
        Convert.degreesToRadians(Angle.add(twd_inv, 0 - ga_deg)),
        dtg
      );
      markLines = [gapt1, navPos, gapt2];
    }

    perfTargetAngle.update(() => markLines);

    if (!destInTarget) return;

    const hbd_deg = Angle.difference(
      twd_deg,
      this.course.courseData().bearing.value
    );
    let ipts: Position | undefined;
    let iptp: Position | undefined;
    const activePos = this.app.data.vessels.active.position;

    if (destUpwind && activePos) {
      const C_RAD = Convert.degreesToRadians(ba_deg - hbd_deg);
      const B_RAD = Convert.degreesToRadians(ba_deg + hbd_deg);
      const A_RAD = Math.PI - (B_RAD + C_RAD);
      const b = (dtg * Math.sin(B_RAD)) / Math.sin(A_RAD);
      const c = (dtg * Math.sin(C_RAD)) / Math.sin(A_RAD);
      ipts = GeoUtils.destCoordinate(
        activePos,
        Convert.degreesToRadians(Angle.add(twd_deg, ba_deg)),
        b
      );
      iptp = GeoUtils.destCoordinate(
        activePos,
        Convert.degreesToRadians(Angle.add(twd_deg, 0 - ba_deg)),
        c
      );
    } else if (
      !destUpwind &&
      markLines.length !== 0 &&
      typeof ga_diff === 'number' &&
      activePos
    ) {
      const C_RAD = Convert.degreesToRadians(ga_diff - hbd_deg);
      const B_RAD = Convert.degreesToRadians(ga_diff + hbd_deg);
      const A_RAD = Math.PI - (B_RAD + C_RAD);
      const b = (dtg * Math.sin(B_RAD)) / Math.sin(A_RAD);
      const c = (dtg * Math.sin(C_RAD)) / Math.sin(A_RAD);
      ipts = GeoUtils.destCoordinate(
        activePos,
        Convert.degreesToRadians(Angle.add(twd_deg, ga_diff)),
        b
      );
      iptp = GeoUtils.destCoordinate(
        activePos,
        Convert.degreesToRadians(Angle.add(twd_deg, 0 - ga_diff)),
        c
      );
    }

    const ml1 = markLines[1];
    if (!ipts || !iptp || !activePos || !ml1) return;

    perfLaylines.update(() => ({
      port: [
        [iptp as Position, activePos],
        [ipts as Position, activePos]
      ],
      starboard: [
        [ipts as Position, ml1],
        [ml1, iptp as Position]
      ]
    }));
  }
}

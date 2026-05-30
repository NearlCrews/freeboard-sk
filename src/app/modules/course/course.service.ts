import { effect, Injectable, Signal, signal } from '@angular/core';

import { SignalKClient } from 'src/lib/signalk-client';
import { AppFacade } from 'src/app/app.facade';
import { SKResourceService, SKVessel } from '../skresources';
import {
  CourseData,
  FBRoute,
  LineString,
  Position,
  SKPosition
} from 'src/app/types';
import { HttpErrorResponse } from '@angular/common/http';
import { Convert } from 'src/app/lib/convert';

/**
 * Internal shape that matches the runtime nullability of every CourseData
 * field. CourseData (the public/spec type) is intentionally narrower; the
 * cast at `courseData` boundary preserves the existing public contract
 * until callers are migrated to handle the nulls explicitly.
 */
interface CourseDataState {
  dtg: number | null;
  ttg: number | null;
  eta: Date | null;
  route: {
    dtg: number | null;
    ttg: number | null;
    eta: Date | null;
  };
  vmg: number | null;
  bearing: { value: number | null; type: string | null };
  bearingTrue: number | null;
  bearingMagnetic: number | null;
  xte: number | null;
  position: Position | null;
  pointIndex: number;
  pointTotal: number;
  arrivalCircle: number | null;
  startPosition: Position | null;
  pointNames: string[];
  activeRoutePoints: LineString | null;
  destPointName: string;
}

interface CourseApiPoint {
  position?: { longitude: number; latitude: number };
  href?: string;
}

interface CourseApiActiveRoute {
  href?: string;
  pointIndex?: number | null;
  pointTotal?: number | null;
  reverse?: boolean;
}

interface CourseApiValue {
  arrivalCircle?: number;
  nextPoint?: CourseApiPoint | null;
  previousPoint?: CourseApiPoint | null;
  activeRoute?: CourseApiActiveRoute | null;
}

const INITIAL_STATE: CourseDataState = {
  dtg: null,
  ttg: null,
  eta: null,
  route: {
    dtg: null,
    ttg: null,
    eta: null
  },
  bearing: { value: null, type: null },
  bearingTrue: null,
  bearingMagnetic: null,
  xte: null,
  vmg: null,
  position: null,
  pointIndex: -1,
  pointTotal: 0,
  arrivalCircle: null,
  startPosition: null,
  pointNames: [],
  activeRoutePoints: [],
  destPointName: ''
};

@Injectable({ providedIn: 'root' })
export class CourseService {
  private _courseData = signal<CourseDataState>({ ...INITIAL_STATE });
  readonly courseData = this._courseData.asReadonly() as unknown as Signal<
    Readonly<CourseData>
  >;

  constructor(
    private signalk: SignalKClient,
    private app: AppFacade,
    private skres: SKResourceService
  ) {
    effect(() => {
      if (this.skres.routes()) {
        this.handleRoutesSignal();
      }
    });
  }

  public activateRoute(id: string, startPoint = 0, reverse = false) {
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        'self',
        'navigation/course/activeRoute',
        {
          href: `/resources/routes/${id}`,
          reverse: reverse,
          pointIndex: startPoint,
          arrivalCircle: this.app.config.course.arrivalCircle
        }
      )
      .subscribe({
        error: (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      });
  }

  public navigateToWaypoint(id: string) {
    this.setDestination(`/resources/waypoints/${id}`);
  }

  public clearCourse() {
    this.signalk.api
      .delete(this.app.skApiVersion, `vessels/self/navigation/course`)
      .subscribe({
        error: (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      });
  }

  public setDestination(value: SKPosition | string) {
    const v: { href?: string; position?: SKPosition } =
      typeof value === 'string' ? { href: value } : { position: value };
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        'self',
        'navigation/course/destination',
        Object.assign(v, {
          arrivalCircle: this.app.config.course.arrivalCircle
        })
      )
      .subscribe({
        error: (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      });
  }

  public courseRestart() {
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        'self',
        'navigation/course/restart',
        null
      )
      .subscribe({
        error: (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      });
  }

  public courseRefresh() {
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        'self',
        'navigation/course/activeRoute/refresh',
        null
      )
      .subscribe({
        error: (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      });
  }

  public courseReverse() {
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        'self',
        'navigation/course/activeRoute/reverse',
        null
      )
      .subscribe({
        error: (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      });
  }

  public coursePointIndex(pointIndex: number) {
    this.signalk.api
      .putWithContext(
        this.app.skApiVersion,
        'self',
        `navigation/course/activeRoute/pointIndex`,
        {
          value: pointIndex
        }
      )
      .subscribe({
        error: (err: HttpErrorResponse) => {
          this.app.parseHttpErrorResponse(err);
        }
      });
  }

  public parseSelf(self: SKVessel) {
    if (typeof self.courseApi !== 'undefined') {
      this.processCourseData(self.courseApi as CourseApiValue | undefined);
    }
    this.processCourseCalcs(self);
  }

  public initCourseData() {
    this._courseData.update((current) => ({
      ...INITIAL_STATE,
      pointIndex: current.pointIndex,
      position: [null, null] as unknown as Position,
      startPosition: [null, null] as unknown as Position,
      activeRoutePoints: null
    }));
  }

  private processCourseData(value: CourseApiValue | undefined | null) {
    const clearCourse = (state: CourseDataState): CourseDataState => {
      state.position = null;
      state.startPosition = null;
      this.setAppDataField('activeWaypoint', null);
      return clearRoute(state);
    };

    const clearRoute = (state: CourseDataState): CourseDataState => {
      state.pointIndex = -1;
      state.pointTotal = 0;
      state.pointNames = [];
      state.destPointName = '';
      this.setAppDataField('activeRoute', null);
      this.app.data.activeRouteReversed = false;
      return state;
    };

    if (!value) {
      this._courseData.update((current) =>
        Object.assign({}, clearCourse(current))
      );
      return;
    }

    let c: CourseDataState = Object.assign({}, this._courseData());

    if (typeof value.arrivalCircle !== 'undefined') {
      c.arrivalCircle = value.arrivalCircle;
    }

    if (!value.nextPoint || !value.previousPoint) {
      c = clearCourse(c);
    }

    if (value.nextPoint && value.previousPoint) {
      c.startPosition = value.previousPoint.position
        ? [
            value.previousPoint.position.longitude,
            value.previousPoint.position.latitude
          ]
        : null;

      c.position = value.nextPoint.position
        ? [
            value.nextPoint.position.longitude,
            value.nextPoint.position.latitude
          ]
        : null;

      if (value.nextPoint.href) {
        const wptHref = value.nextPoint.href.split('/');
        const wptId = wptHref[wptHref.length - 1] ?? '';
        this.setAppDataField('activeWaypoint', wptId);
        const wpt = this.skres.fromCache('waypoints', wptId);
        if (!wpt) {
          this.skres.waypointAddFromServer([wptId]);
        }
      } else {
        this.setAppDataField('activeWaypoint', null);
      }
    }

    // navData.activeRoute
    if (!value.activeRoute) {
      c = clearRoute(c);
    } else {
      if (value.activeRoute.href) {
        c.destPointName = '';
        const rteHref = value.activeRoute.href.split('/');
        const rteId = rteHref[rteHref.length - 1] ?? '';
        this.setAppDataField('activeRoute', rteId);

        this.setAppDataField('activeWaypoint', null);
        c.pointIndex =
          value.activeRoute.pointIndex === null ||
          value.activeRoute.pointIndex === undefined
            ? -1
            : value.activeRoute.pointIndex;
        c.pointTotal =
          value.activeRoute.pointTotal === null ||
          value.activeRoute.pointTotal === undefined
            ? 0
            : value.activeRoute.pointTotal;
        this.app.data.activeRouteReversed = !value.activeRoute.reverse
          ? false
          : value.activeRoute.reverse;

        const rte = this.skres.fromCache('routes', rteId);
        if (!rte) {
          this.skres.routeAddFromServer([rteId]);
        } else {
          this.updateActiveRoutePointDetails(c, rte);
        }
      } else {
        this.setAppDataField('activeRoute', null);
      }
    }
    this._courseData.set(c);
  }

  private processCourseCalcs(v: SKVessel) {
    const c: CourseDataState = Object.assign({}, this._courseData());
    const calcs = v.courseCalcs as Record<string, number | null | undefined>;

    const crossTrackError = calcs['crossTrackError'];
    if (typeof crossTrackError === 'number') {
      c.xte =
        this.app.config.units.distance === 'kilometer'
          ? crossTrackError / 1000
          : Convert.transform(
              crossTrackError,
              'm',
              this.app.config.units.distance
            );
    }

    const bearingTrue = calcs['bearingTrue'];
    if (typeof bearingTrue === 'number') {
      c.bearingTrue = Convert.radiansToDegrees(bearingTrue);
      if (!this.app.useMagnetic) {
        c.bearing.value = c.bearingTrue;
        c.bearing.type = 'T';
      }
    }

    const bearingMagnetic = calcs['bearingMagnetic'];
    if (typeof bearingMagnetic === 'number') {
      c.bearingMagnetic = Convert.radiansToDegrees(bearingMagnetic);
      if (this.app.useMagnetic) {
        c.bearing.value = c.bearingMagnetic;
        c.bearing.type = 'M';
      }
    }

    const velocityMadeGood = calcs['velocityMadeGood'];
    if (typeof velocityMadeGood === 'number') {
      c.vmg = velocityMadeGood;
    }

    const distance = calcs['distance'];
    if (typeof distance === 'number') {
      c.dtg =
        this.app.config.units.distance === 'kilometer'
          ? distance / 1000
          : Convert.transform(distance, 'm', 'naut-mile');
    }

    const routeDistance = calcs['route.distance'];
    if (typeof routeDistance === 'number') {
      // Note: kilometer branch reads calcs['distance'] (not route.distance),
      // matching pre-Phase-5 behaviour. Flagged for lead review.
      const kmDistance = calcs['distance'];
      c.route.dtg =
        this.app.config.units.distance === 'kilometer'
          ? (typeof kmDistance === 'number' ? kmDistance : 0) / 1000
          : Convert.transform(routeDistance, 'm', 'naut-mile');
    }

    const timeToGo = calcs['timeToGo'];
    if (typeof timeToGo === 'number') {
      c.ttg = timeToGo / 60;
    }

    const routeTimeToGo = calcs['route.timeToGo'];
    if (typeof routeTimeToGo === 'number') {
      c.route.ttg = routeTimeToGo / 60;
    }

    const eta = calcs['estimatedTimeOfArrival'] as unknown;
    if (typeof eta !== 'undefined') {
      if (eta !== null) {
        const d = new Date(eta as string | number);
        c.eta = !isNaN(d.getTime()) ? d : null;
      } else {
        c.eta = null;
      }
    }

    const routeEta = calcs['route.estimatedTimeOfArrival'] as unknown;
    if (typeof routeEta !== 'undefined') {
      if (routeEta !== null) {
        const d = new Date(routeEta as string | number);
        c.route.eta = !isNaN(d.getTime()) ? d : null;
      } else {
        c.route.eta = null;
      }
    }

    this._courseData.set(c);
  }

  private updateActiveRoutePointDetails(c: CourseDataState, rte: FBRoute) {
    c.activeRoutePoints = rte[1].feature.geometry.coordinates;

    const coordsMeta = rte[1].feature.properties?.['coordinatesMeta'] as
      | ({ name?: string } | null)[]
      | undefined;
    if (Array.isArray(coordsMeta)) {
      c.pointNames = coordsMeta.map((pt) => pt?.name ?? '');
      if (c.pointIndex !== -1 && c.pointIndex < c.pointNames.length) {
        c.destPointName = c.pointNames[c.pointIndex] ?? '';
      }
    }
    const coords = rte[1].feature.geometry.coordinates;
    const first = coords[0];
    const last = coords[coords.length - 1];
    this.app.data.activeRouteCircular =
      !!first && !!last && first[0] === last[0] && first[1] === last[1];
  }

  private handleRoutesSignal() {
    const activeRouteId = this.app.data.activeRoute;
    if (!activeRouteId) {
      return;
    }
    const rte = this.skres.fromCache('routes', activeRouteId);
    if (rte) {
      const c = Object.assign({}, this._courseData());
      this.updateActiveRoutePointDetails(c, rte);
      this._courseData.set(c);
    }
  }

  /**
   * Localised assignment helper that writes the canonical-but-nullable
   * activeRoute / activeWaypoint / editingId fields. FBAppData declares
   * them as `string` (matching the spec) but app.config.ts seeds them with
   * `null`; this view describes the actual runtime shape.
   */
  private setAppDataField(
    field: 'activeRoute' | 'activeWaypoint' | 'editingId',
    value: string | null
  ): void {
    const view = this.app.data as unknown as Record<string, string | null>;
    view[field] = value;
  }
}

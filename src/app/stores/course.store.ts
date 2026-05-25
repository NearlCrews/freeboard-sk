import { Injectable, Signal, signal } from '@angular/core';

import type { FBAppData } from 'src/app/types';

/**
 * Phase 3 Batch 3: thin signal mirror of the active-course slice of
 * FBAppData (activeRoute, activeWaypoint, edit flags). Reads are signals so
 * downstream components can subscribe; writes route through both the signal
 * AND `app.data` so legacy `app.data.activeRoute` consumers stay correct.
 *
 * Full SignalK course API integration (course-to-steer, arrival circle
 * computations from notifications.navigation.arrivalCircleEntered) is
 * Phase 5+ scope. CourseService in modules/skresources remains the orchestrator
 * for set / clear / next-point flows.
 */
@Injectable({ providedIn: 'root' })
export class CourseStore {
  private readonly _activeRoute = signal<string | null>(null);
  readonly activeRoute: Signal<string | null> = this._activeRoute.asReadonly();

  private readonly _activeRouteReversed = signal<boolean>(false);
  readonly activeRouteReversed: Signal<boolean> =
    this._activeRouteReversed.asReadonly();

  private readonly _activeRouteCircular = signal<boolean>(false);
  readonly activeRouteCircular: Signal<boolean> =
    this._activeRouteCircular.asReadonly();

  private readonly _activeRouteIsEditing = signal<boolean>(false);
  readonly activeRouteIsEditing: Signal<boolean> =
    this._activeRouteIsEditing.asReadonly();

  private readonly _activeWaypoint = signal<string | null>(null);
  readonly activeWaypoint: Signal<string | null> =
    this._activeWaypoint.asReadonly();

  private readonly _editingId = signal<string | null>(null);
  readonly editingId: Signal<string | null> = this._editingId.asReadonly();

  /**
   * Sync signal state from the canonical FBAppData slice. Called by AppFacade
   * after data initialisation and any time the legacy mutation path runs.
   * Once consumers migrate to writing through this store, this becomes a
   * no-op and the legacy app.data fields can be removed.
   */
  syncFromData(data: FBAppData): void {
    this._activeRoute.set(data.activeRoute);
    this._activeRouteReversed.set(data.activeRouteReversed);
    this._activeRouteCircular.set(data.activeRouteCircular);
    this._activeRouteIsEditing.set(data.activeRouteIsEditing);
    this._activeWaypoint.set(data.activeWaypoint);
    this._editingId.set(data.editingId);
  }

  /** Update the active route plus its mode flags in one shot. */
  setActiveRoute(
    data: FBAppData,
    id: string | null,
    opts: { reversed?: boolean; circular?: boolean; editing?: boolean } = {}
  ): void {
    data.activeRoute = id;
    if (typeof opts.reversed === 'boolean') {
      data.activeRouteReversed = opts.reversed;
    }
    if (typeof opts.circular === 'boolean') {
      data.activeRouteCircular = opts.circular;
    }
    if (typeof opts.editing === 'boolean') {
      data.activeRouteIsEditing = opts.editing;
    }
    this.syncFromData(data);
  }

  /** Set the active waypoint id and mirror to FBAppData. */
  setActiveWaypoint(data: FBAppData, id: string | null): void {
    data.activeWaypoint = id;
    this._activeWaypoint.set(id);
  }

  /** Set the in-edit resource id and mirror to FBAppData. */
  setEditingId(data: FBAppData, id: string | null): void {
    data.editingId = id;
    this._editingId.set(id);
  }

  /** Clear all course-related state. */
  clear(data: FBAppData): void {
    data.activeRoute = null;
    data.activeWaypoint = null;
    data.activeRouteReversed = false;
    data.activeRouteCircular = false;
    data.activeRouteIsEditing = false;
    data.editingId = null;
    this.syncFromData(data);
  }
}

import { Injectable, Signal, signal } from '@angular/core';

export interface LeftMenuState {
  leftMenuPanel: boolean;
  routeList: boolean;
  waypointList: boolean;
  chartList: boolean;
  noteList: boolean;
  regionList: boolean;
  trackList: boolean;
  aisList: boolean;
  resourceGroups: boolean;
  infoLayerList: boolean;
  anchorWatch: boolean;
}

const EMPTY_MENU: LeftMenuState = {
  leftMenuPanel: false,
  routeList: false,
  waypointList: false,
  chartList: false,
  noteList: false,
  regionList: false,
  trackList: false,
  aisList: false,
  resourceGroups: false,
  infoLayerList: false,
  anchorWatch: false
};

const MENU_KEYS = new Set<string>([
  'routeList',
  'waypointList',
  'chartList',
  'noteList',
  'regionList',
  'trackList',
  'aisList',
  'resourceGroups',
  'infoLayerList',
  'anchorWatch'
]);

/**
 * Owns the left-menu open/closed state. Each call sets a single panel
 * exclusively or fully closes the menu (default branch). The on-close hook
 * lets the shell re-focus the map without coupling the service to the
 * map component directly.
 */
@Injectable({ providedIn: 'root' })
export class MenuController {
  private readonly _state = signal<LeftMenuState>({ ...EMPTY_MENU });
  readonly state: Signal<LeftMenuState> = this._state.asReadonly();
  private onClose?: () => void;

  /** Register a callback to run when the menu fully closes. */
  registerOnClose(cb: () => void): void {
    this.onClose = cb;
  }

  /** Show or hide a panel by key. Empty key (or unknown) closes the menu. */
  display(menulist = '', show = false): void {
    const next: LeftMenuState = { ...EMPTY_MENU, leftMenuPanel: show };
    if (menulist && MENU_KEYS.has(menulist)) {
      (next as unknown as Record<string, boolean>)[menulist] = show;
    } else {
      next.leftMenuPanel = false;
    }
    this._state.set(next);
    if (!show) {
      this.onClose?.();
    }
  }
}

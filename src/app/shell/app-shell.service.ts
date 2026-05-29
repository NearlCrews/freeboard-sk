import { Injectable, Signal, inject, signal } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { AppFacade } from 'src/app/app.facade';
import { SettingsStore } from 'src/app/stores';
import { SKResourceService } from 'src/app/modules';

interface FullscreenState {
  active: boolean;
  enabled: boolean;
}

type FullscreenElement = HTMLElement & {
  webkitRequestFullScreen?: () => Promise<void>;
  mozRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

/**
 * Owns shell-level UI state: toolbar toggles, sidenav focus signaling,
 * dark-theme overlay class, fullscreen state and document listeners.
 *
 * focusMap() is a counter signal the FBMap component watches via input
 * binding; bumping it asks the map to re-take keyboard focus without
 * crossing the component boundary.
 */
@Injectable({ providedIn: 'root' })
export class AppShellService {
  private readonly app = inject(AppFacade);
  // Phase 3 Batch 3: direct store injection for UI-state signals; AppFacade
  // is kept for the config + data + dark-mode bridge in setDarkTheme().
  private readonly settings = inject(SettingsStore);
  private readonly overlayContainer = inject(OverlayContainer);
  private readonly skres = inject(SKResourceService);

  private readonly _mapSetFocus = signal<string>('');
  readonly mapSetFocus: Signal<string> = this._mapSetFocus.asReadonly();

  private readonly _displayFullscreen = signal<FullscreenState>({
    active: false,
    enabled: document.fullscreenEnabled
  });
  readonly displayFullscreen: Signal<FullscreenState> =
    this._displayFullscreen.asReadonly();

  /**
   * Phase 3 foundation hook for body[data-theme] switching: drives the
   * three tokens.css blocks 'light' (default), 'dark', and 'night-red'.
   * Full ThemeService (settings persistence, prefers-color-scheme bridge,
   * and environment.mode bridge) is Phase 7 scope.
   */
  readonly themeAttr = signal<'light' | 'dark' | 'night-red'>('light');

  /** Register the document fullscreen listeners. Idempotent per session. */
  initFullscreenListeners(): void {
    document.addEventListener('fullscreenchange', () => {
      this._displayFullscreen.update((cur) => ({
        ...cur,
        active: !!document.fullscreenElement
      }));
    });
    document.addEventListener('fullscreenerror', () => {
      this._displayFullscreen.update((cur) => ({ ...cur, active: false }));
    });
  }

  /** Trigger the map component to take keyboard focus. Uses millisecond
   * resolution so two calls within the same second still emit a fresh
   * signal value to the FBMap input binding. */
  focusMap(): void {
    this._mapSetFocus.set(String(Date.now()));
  }

  // ----- toolbar toggles -----

  toggleMoveMap(exit = false): void {
    this.settings.uiConfig.update((c) => ({
      ...c,
      mapMove: exit ? false : !c.mapMove
    }));
    this.focusMap();
  }

  toggleNorthUp(): void {
    this.settings.uiConfig.update((c) => ({ ...c, mapNorthUp: !c.mapNorthUp }));
    this.focusMap();
  }

  toggleToolbarButtons(): void {
    this.settings.uiConfig.update((c) => ({
      ...c,
      toolbarButtons: !c.toolbarButtons
    }));
    this.focusMap();
  }

  toggleConstrainMapZoom(): void {
    this.settings.uiConfig.update((c) => ({
      ...c,
      mapConstrainZoom: !c.mapConstrainZoom
    }));
    this.skres.setMapZoomRange();
    this.focusMap();
  }

  invertFeatureLabelColor(): void {
    this.settings.uiConfig.update((c) => ({
      ...c,
      invertColor: !c.invertColor
    }));
    this.focusMap();
  }

  toggleAlertList(show: boolean): void {
    this.settings.uiCtrl.update((c) => ({ ...c, alertList: show }));
  }

  toggleAutopilotConsole(show: boolean): void {
    this.settings.uiCtrl.update((c) => ({ ...c, autopilotConsole: show }));
  }

  toggleRouteBuilderConsole(show: boolean): void {
    this.settings.uiCtrl.update((c) => ({ ...c, routeBuilder: show }));
  }

  toggleSuppressContextMenu(value: boolean): void {
    this.settings.uiCtrl.update((c) => ({ ...c, suppressContextMenu: value }));
  }

  toggleFullscreen(): void {
    const docel = document.documentElement as FullscreenElement;
    const fscreen =
      docel.requestFullscreen ||
      docel.webkitRequestFullScreen ||
      docel.mozRequestFullscreen ||
      docel.msRequestFullscreen;
    if (!fscreen) {
      return;
    }
    if (!document.fullscreenElement) {
      fscreen.call(docel);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    this.focusMap();
  }

  // ----- map orientation -----

  getOrientation(): string {
    return this.settings.uiConfig().mapNorthUp
      ? 'rotate(0deg)'
      : 'rotate(' + (0 - this.app.data.vessels.active.orientation) + 'rad)';
  }

  // ----- dark theme -----

  /** Apply or remove the .dark-theme class on the CDK overlay container. */
  setDarkTheme(): void {
    const cfg = this.app.config.display.darkMode;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const wantDark =
      (cfg.source === 0 && mq.matches) ||
      (cfg.source === 1 &&
        this.app.data.vessels.self.environment.mode === 'night') ||
      cfg.source === -1;

    this.overlayContainer
      .getContainerElement()
      .classList.toggle('dark-theme', wantDark);
    cfg.enabled = wantDark;
  }
}

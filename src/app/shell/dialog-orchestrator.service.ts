import { Injectable, inject } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { AppFacade } from 'src/app/app.facade';
import { AlarmStore, SettingsStore } from 'src/app/stores';
import { SignalKClient } from 'src/lib/signalk-client';
import { AppShellService } from './app-shell.service';
import {
  ActiveResourcePropertiesModal,
  AircraftPropertiesModal,
  AISPropertiesModal,
  AtoNPropertiesModal,
  CourseService,
  CourseSettingsModal,
  FBCustomResourceService,
  NotificationManager,
  ResourceSetFeatureModal,
  ResourceSetModal,
  SKAircraft,
  SKAtoN,
  SKResourceService,
  SKSaR,
  SKSTREAM_MODE,
  SKVessel,
  StreamOptions,
  WeatherForecastModal
} from 'src/app/modules';
import { ErrorList } from 'src/app/types';
import { SKRoute } from 'src/app/modules/skresources';
import { HttpErrorResponse } from '@angular/common/http';

interface DialogHooks {
  fetchResources: () => void;
  fetchAllResources: () => void;
  switchMode: (mode: SKSTREAM_MODE, options?: StreamOptions) => void;
  queryAfterConnect: () => void;
}

/**
 * Owns every dialog and bottom-sheet open call originally inlined in
 * AppComponent. Lazy-imported dialogs stay out of the eager main chunk
 * thanks to dynamic import() at each call site. Side effects that cross
 * back into the stream lifecycle (resource refresh, mode switch, post-
 * connect query) flow through the hooks registered by the shell.
 */
@Injectable({ providedIn: 'root' })
export class DialogOrchestrator {
  private readonly dialog = inject(MatDialog);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly app = inject(AppFacade);
  // Phase 3 Batch 3: direct store injection for dialog and fetch-progress
  // surface. AppFacade is kept for data + config + login flow access.
  private readonly alarm = inject(AlarmStore);
  private readonly settings = inject(SettingsStore);
  private readonly shell = inject(AppShellService);
  private readonly skres = inject(SKResourceService);
  private readonly skresOther = inject(FBCustomResourceService);
  private readonly course = inject(CourseService);
  private readonly signalk = inject(SignalKClient);
  private readonly notiMgr = inject(NotificationManager);

  private hooks: DialogHooks | null = null;

  /** Register the cross-cutting hooks the shell still owns. */
  registerHooks(hooks: DialogHooks): void {
    this.hooks = hooks;
  }

  private focus(): void {
    this.shell.focusMap();
  }

  // ----- lazy-imported dialogs -----

  async openAbout(): Promise<void> {
    const { AboutDialog } =
      await import('src/app/lib/components/dialogs/about-dialog');
    this.dialog
      .open(AboutDialog, {
        disableClose: false,
        data: {
          name: this.app.name,
          version: this.app.version,
          description: this.app.description,
          logo: this.app.logo,
          url: this.app.url
        }
      })
      .afterClosed()
      .subscribe(() => this.focus());
  }

  async openSettings(): Promise<void> {
    const { SettingsDialog } =
      await import('src/app/modules/settings/components/settings-dialog');
    this.dialog
      .open(SettingsDialog, {
        disableClose: true,
        data: {},
        maxWidth: '1000px',
        minHeight: '80vh'
      })
      .afterClosed()
      .subscribe(() => this.focus());
  }

  /** Route GPX vs GeoJSON imports by sniffing file content. */
  importFile(f: { data: string | ArrayBuffer; name: string }): void {
    const text = f.data as string;
    if (text.includes('<gpx ')) {
      this.processGPX(f);
    } else if (text.includes(`"type": "FeatureCollection",`)) {
      this.processGeoJSON(f);
    } else {
      this.alarm.showAlert('Import', 'File format not supported!');
    }
    this.focus();
  }

  async processGPX(f: {
    data: string | ArrayBuffer;
    name: string;
  }): Promise<void> {
    const { GPXImportDialog } =
      await import('src/app/modules/gpx/gpxload-dialog');
    this.dialog
      .open(GPXImportDialog, {
        disableClose: true,
        data: { fileData: f.data, fileName: f.name }
      })
      .afterClosed()
      .subscribe((res: { errCount: number; errList: ErrorList }) => {
        if (typeof res.errCount === 'undefined' || res.errCount < 0) {
          this.focus();
          return;
        }
        this.hooks?.fetchResources();
        if (res.errCount === 0) {
          this.alarm.showMsgBox(
            'GPX Load',
            'GPX file resources loaded successfully.'
          );
        } else {
          this.app.showErrorList(res.errList);
        }
        this.focus();
      });
  }

  async exportToGPX(): Promise<void> {
    const { GPXExportDialog } =
      await import('src/app/modules/gpx/gpxsave-dialog');
    this.dialog
      .open(GPXExportDialog, {
        disableClose: true,
        data: {
          routes: this.skres.routes(),
          tracks: [this.app.selfTrail()]
        }
      })
      .afterClosed()
      .subscribe((errCount) => {
        if (errCount < 0) {
          this.focus();
          return;
        }
        if (errCount === 0) {
          this.alarm.showMsgBox(
            'GPX Save',
            'Resources saved to GPX file successfully.'
          );
        } else {
          this.alarm.showAlert(
            'GPX Save',
            'Error saving resources to GPX file!'
          );
        }
        this.focus();
      });
  }

  async processGeoJSON(f: {
    data: string | ArrayBuffer;
    name: string;
  }): Promise<void> {
    const { GeoJSONImportDialog } =
      await import('src/app/lib/components/dialogs/geojson/geojson-dialog');
    this.dialog
      .open(GeoJSONImportDialog, {
        disableClose: true,
        data: { fileData: f.data, fileName: f.name }
      })
      .afterClosed()
      .subscribe((errCount) => {
        if (errCount < 0) {
          return;
        }
        this.hooks?.fetchResources();
        if (errCount === 0) {
          this.alarm.showMsgBox(
            'GeoJSON Load',
            'GeoJSON features loaded successfully.'
          );
        } else {
          this.alarm.showAlert(
            'GeoJSON Load',
            'Completed with errors!\nNot all features were loaded.'
          );
        }
        this.focus();
      });
  }

  async importResourceSet(): Promise<void> {
    const { ResourceImportDialog } =
      await import('src/app/modules/skresources/components/resourcesets/resource-upload-dialog');
    this.dialog
      .open(ResourceImportDialog, {
        disableClose: true,
        data: {}
      })
      .afterClosed()
      .subscribe((res) => {
        if (!res) {
          return;
        }
        try {
          const d = JSON.parse(res.data);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.skres.postToServer(res.path as any, d);
        } catch {
          this.alarm.showAlert(
            'Load Resource',
            'Resources were not loaded!\nInvalid JSON.'
          );
        }
        this.focus();
      });
  }

  async showLogin(
    message?: string,
    cancelWarning = true,
    onConnect?: boolean
  ): Promise<void> {
    const { LoginDialog } =
      await import('src/app/lib/components/dialogs/login-dialog');
    this.dialog
      .open(LoginDialog, {
        disableClose: true,
        data: { message: message || 'Login to Signal K server.' }
      })
      .afterClosed()
      .subscribe((res) => {
        if (!res.cancel) {
          this.handleLoginSubmit(res.user, res.pwd, onConnect);
        } else {
          this.handleLoginCancel(cancelWarning, onConnect);
        }
        this.focus();
      });
  }

  private handleLoginSubmit(
    user: string,
    pwd: string,
    onConnect?: boolean
  ): void {
    this.signalk.login(user, pwd).subscribe({
      next: (r) => {
        this.app.persistToken(r.token);
        this.app.loadUserConfigfromServer().then((loaded: boolean) => {
          if (loaded) {
            this.hooks?.fetchAllResources();
          }
        });
        if (onConnect) {
          this.hooks?.queryAfterConnect();
        }
        this.app.isLoggedIn.set(true);
      },
      error: () => {
        this.app.persistToken(null);
        this.signalk.isLoggedIn().subscribe((r) => {
          this.app.isLoggedIn.set(r);
        });
        if (onConnect) {
          this.app
            .showConfirm(
              'Invalid Username or Password.',
              'Authentication Failed:',
              'Try Again'
            )
            .subscribe(() => this.showLogin(null, false, true));
        } else {
          this.app
            .showConfirm(
              'Invalid Username or Password.\nNote: Choosing CLOSE may make operations requiring authentication unavailable.',
              'Authentication Failed:',
              'Try Again',
              'Close'
            )
            .subscribe((r) => {
              if (r) {
                this.showLogin();
              }
            });
        }
      }
    });
  }

  private handleLoginCancel(cancelWarning: boolean, onConnect?: boolean): void {
    this.app.hasAuthToken.set(false);
    this.signalk.isLoggedIn().subscribe((r: boolean) => {
      this.app.isLoggedIn.set(r);
    });
    if (onConnect) {
      this.showLogin(null, false, true);
    } else if (cancelWarning) {
      this.alarm.showAlert(
        'Login Cancelled:',
        `Update operations are NOT available until you have authenticated to the Signal K server.`
      );
    }
  }

  async showPlaybackSettings(): Promise<void> {
    const { PlaybackDialog } =
      await import('src/app/lib/components/dialogs/playback-dialog');
    this.dialog
      .open(PlaybackDialog, { disableClose: false })
      .afterClosed()
      .subscribe((r) => {
        if (r.result) {
          this.hooks?.switchMode(SKSTREAM_MODE.PLAYBACK, r.query);
        } else {
          this.hooks?.switchMode(SKSTREAM_MODE.REALTIME);
        }
        this.focus();
      });
  }

  async trailToRoute(): Promise<void> {
    const { Trail2RouteDialog } =
      await import('src/app/lib/components/dialogs/trail2route-dialog');
    this.dialog
      .open(Trail2RouteDialog, {
        disableClose: true,
        data: { trail: this.app.selfTrail() }
      })
      .afterClosed()
      .subscribe((r) => {
        if (r.result) {
          this.skres.newRouteAt(r.data);
        }
        this.focus();
      });
  }

  // ----- eager bottom sheets -----

  showWeather(mode: string): void {
    if (mode !== 'forecast') {
      return;
    }
    this.bottomSheet
      .open(WeatherForecastModal, {
        disableClose: true,
        data: {
          title: 'Forecast',
          position: this.app.data.vessels.self.position,
          subTitle: 'Location: Vessel Position'
        }
      })
      .afterDismissed()
      .subscribe(() => this.focus());
  }

  openCourseSettings(): void {
    this.bottomSheet
      .open(CourseSettingsModal, {
        disableClose: true,
        data: { title: 'Course Settings' }
      })
      .afterDismissed()
      .subscribe(() => this.focus());
  }

  openExperiment(e: { choice: string; value?: unknown }): void {
    if (e.choice === 'debugCapture') {
      this.captureDebugToClipboard();
      return;
    }
    if (this.app.config.resources.paths.includes(e.choice)) {
      this.bottomSheet
        .open(ResourceSetModal, {
          disableClose: true,
          data: { path: e.choice }
        })
        .afterDismissed()
        .subscribe(() => this.focus());
    }
  }

  private captureDebugToClipboard(): void {
    if (window.isSecureContext) {
      navigator.clipboard.writeText(
        JSON.stringify({ data: this.app.data, config: this.app.config })
      );
      this.app.showMessage('Debug data catpured to clipboard.');
    } else {
      this.alarm.showAlert(
        'Feature Unavailable',
        'This feature is only available in a secure context!\n e.g. https, http://localhost, http://127.0.0.1'
      );
    }
  }

  /** Open the properties bottom sheet for a selected feature. */
  async featureProperties(e: { id: string; type: string }): Promise<void> {
    if (e.type === 'route') {
      await this.openRouteProperties(e.id);
    } else if (e.type === 'aton' || e.type === 'meteo') {
      this.openAtonProperties(e);
    } else if (e.type === 'aircraft') {
      this.openAircraftProperties(e.id);
    } else if (e.type === 'alarm') {
      this.notiMgr.showAlertInfo(e.id);
    } else if (e.type === 'rset') {
      this.openResourceSetFeature(e.id);
    } else {
      await this.openVesselProperties(e);
    }
  }

  private async openRouteProperties(id: string): Promise<void> {
    let v: SKRoute | null = null;
    try {
      this.settings.sIsFetching.set(true);
      v = (await this.skres.fromServer('routes', id)) as SKRoute;
    } catch (err) {
      this.alarm.parseHttpErrorResponse(err as HttpErrorResponse);
      return;
    } finally {
      this.settings.sIsFetching.set(false);
    }
    if (!v) {
      return;
    }
    this.bottomSheet
      .open(ActiveResourcePropertiesModal, {
        disableClose: true,
        data: {
          title: 'Route Properties',
          resource: [id, v, false],
          type: 'route'
        }
      })
      .afterDismissed()
      .subscribe((deactivate: boolean) => {
        if (deactivate) {
          this.course.clearCourse();
        }
        this.focus();
      });
  }

  private openAtonProperties(e: { id: string; type: string }): void {
    let v: SKSaR | SKAtoN | undefined;
    let title: string;
    let icon: string;
    let atonType: string;
    if (e.type === 'meteo') {
      v = this.app.data.meteo.get(e.id);
      title = 'Meteo Properties';
      icon = 'air';
      atonType = e.type;
    } else if (e.id.startsWith('sar')) {
      v = this.app.data.sar.get(e.id);
      title = 'SaR Properties';
      icon = 'tour';
      atonType = 'sar';
    } else {
      v = this.app.data.atons.get(e.id);
      title = 'AtoN Properties';
      icon = 'beenhere';
      atonType = 'aton';
    }
    if (!v) {
      return;
    }
    this.bottomSheet
      .open(AtoNPropertiesModal, {
        disableClose: true,
        data: { title, target: v, id: e.id, icon, type: atonType }
      })
      .afterDismissed()
      .subscribe(() => this.focus());
  }

  private openAircraftProperties(id: string): void {
    const v: SKAircraft | undefined = this.app.data.aircraft.get(id);
    if (!v) {
      return;
    }
    this.bottomSheet
      .open(AircraftPropertiesModal, {
        disableClose: true,
        data: { title: 'Aircraft Properties', target: v, id }
      })
      .afterDismissed()
      .subscribe(() => this.focus());
  }

  private openResourceSetFeature(id: string): void {
    const v = this.skresOther.fromResourceSetCache(id);
    if (!v) {
      return;
    }
    this.bottomSheet
      .open(ResourceSetFeatureModal, {
        disableClose: true,
        data: { id, item: v }
      })
      .afterDismissed()
      .subscribe(() => this.focus());
  }

  private async openVesselProperties(e: {
    id: string;
    type: string;
  }): Promise<void> {
    let id: string;
    if (e.type === 'self') {
      id = e.type;
    } else if (e.id.includes('vessels.')) {
      id = e.id.split('.')[1];
    } else {
      id = e.id;
    }
    let v: SKVessel | null;
    try {
      this.settings.sIsFetching.set(true);
      v = (await this.skres.vesselFromServer(id)) as SKVessel | null;
    } catch (err) {
      this.alarm.parseHttpErrorResponse(err);
      return;
    } finally {
      this.settings.sIsFetching.set(false);
    }
    if (!v) {
      return;
    }
    this.bottomSheet
      .open(AISPropertiesModal, {
        disableClose: true,
        data: { title: 'Vessel Properties', target: v }
      })
      .afterDismissed()
      .subscribe(() => this.focus());
  }
}

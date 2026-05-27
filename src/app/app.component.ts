import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// standalone
import { CommonModule } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  FbNavListComponent,
  FbProgressBarComponent
} from 'src/app/design-system/primitives';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ETADialComponent,
  FileInputComponent,
  InteractionHelpComponent,
  MFBContainerComponent,
  PiPVideoComponent,
  TextDialComponent,
  TTGDialComponent
} from './lib/components';

// ****

import { AppFacade } from './app.facade';
import { InfoPanelComponent, InfoPanelFacade } from './modules/info-panel';
import { SignalKClient } from 'src/lib/signalk-client';
import { WakeLockService } from 'src/app/lib/services';
import {
  AppShellService,
  AudioAlarmService,
  DialogOrchestrator,
  MenuController
} from 'src/app/shell';

import {
  AISListComponent,
  AnchorService,
  AnchorWatchComponent,
  AlertComponent,
  AlertListComponent,
  AutopilotComponent,
  AutopilotService,
  BuildRouteComponent,
  ChartListComponent,
  CourseService,
  ExperimentsComponent,
  FBCustomResourceService,
  FBMapComponent,
  GroupListComponent,
  InfoLayerListComponent,
  NotePanel,
  NotesShellComponent,
  NotificationManager,
  RegionPanel,
  ResourcesShellComponent,
  RouteNextPointComponent,
  SettingsFacade,
  SKNote,
  SKRegion,
  SKResourceService,
  SKRoute,
  SKWaypoint,
  SKSTREAM_MODE,
  SKStreamFacade,
  StreamOptions,
  TrackListComponent
} from 'src/app/modules';

import { Convert } from 'src/app/lib/convert';
import { GeoUtils } from 'src/app/lib/geoutils';
import { compareSemver, parseSemver } from 'src/app/lib/semver';

import {
  LineString,
  MultiLineString,
  NotificationMessage,
  Polygon,
  Position,
  UpdateMessage
} from './types';
import {
  DrawFeatureInfo,
  DrawFeatureType,
  FBMapInteractService,
  SelectionResultDef
} from './modules/map/fbmap-interact.service';
import { RadarAPIService } from './modules/radar/radar-api.service';
import {
  RoutePanel,
  SKResourceType,
  WaypointPanel
} from './modules/skresources';
import { chartNightMode } from './modules/map/ol/lib/charts/night-mode-filter';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [
    MatMenuModule,
    MatSidenavModule,
    MatBadgeModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    FbNavListComponent,
    FbProgressBarComponent,
    CommonModule,
    TextDialComponent,
    TTGDialComponent,
    ETADialComponent,
    FileInputComponent,
    PiPVideoComponent,
    MFBContainerComponent,
    InteractionHelpComponent,
    FBMapComponent,
    ExperimentsComponent,
    AnchorWatchComponent,
    AlertComponent,
    AlertListComponent,
    AutopilotComponent,
    RouteNextPointComponent,
    ResourcesShellComponent,
    ChartListComponent,
    NotesShellComponent,
    TrackListComponent,
    AISListComponent,
    GroupListComponent,
    InfoLayerListComponent,
    BuildRouteComponent,
    InfoPanelComponent,
    NotePanel,
    RegionPanel,
    WaypointPanel,
    RoutePanel
  ]
})
export class AppComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('sideright', { static: false }) sideright?: MatSidenav;

  // Phase 3 shell services (state and orchestration extracted from this file)
  private readonly shell = inject(AppShellService);
  private readonly menu = inject(MenuController);
  private readonly audio = inject(AudioAlarmService);
  private readonly dialogs = inject(DialogOrchestrator);

  protected navDataPanel = signal<{
    show: boolean;
    nextPointCtrl: boolean;
    apModeColor: string;
    apModeText: string;
  }>({
    show: false,
    nextPointCtrl: false,
    apModeColor: '',
    apModeText: ''
  });

  protected playbackTime = signal<string | null>(null);

  // APP features / mode
  public features = { playbackAPI: true };
  public mode: SKSTREAM_MODE = SKSTREAM_MODE.REALTIME; // current mode

  private timers: ReturnType<typeof setInterval>[] = [];

  // external resources
  protected instUrl = signal<SafeResourceUrl | null>(null);
  private selFavourite = -1;
  protected vidUrl = signal<SafeResourceUrl | null>(null);

  protected convert = Convert;
  private destroyRef = inject(DestroyRef);
  private streamOptions: {
    options: StreamOptions | null;
    toMode: SKSTREAM_MODE | null;
  } = { options: null, toMode: null };

  protected mapCenter = signal<Position>([0, 0]);

  protected isInteracting = computed(() => {
    return (
      this.mapInteract.isMeasuring() ||
      this.mapInteract.isDrawing() ||
      this.mapInteract.isModifying() ||
      this.mapInteract.isBoxSelecting()
    );
  });

  protected app = inject(AppFacade);
  protected infoPanel = inject(InfoPanelFacade);
  protected mapInteract = inject(FBMapInteractService);
  protected anchor = inject(AnchorService);
  protected notiMgr = inject(NotificationManager);
  protected course = inject(CourseService);
  protected stream = inject(SKStreamFacade);
  protected skres = inject(SKResourceService);
  protected skresOther = inject(FBCustomResourceService);
  protected signalk = inject(SignalKClient);
  private dom = inject(DomSanitizer);
  protected wakeLock = inject(WakeLockService);
  private settings = inject(SettingsFacade);
  protected autopilot = inject(AutopilotService);
  protected radarApi = inject(RadarAPIService);

  // ----- template-bound signal proxies -----

  protected leftMenuCtrl = () => this.menu.state();
  protected displayFullscreen = () => this.shell.displayFullscreen();
  protected mapSetFocus = () => this.shell.mapSetFocus();
  protected audioStatus = () => this.audio.status();
  protected get themeAttr() {
    return this.shell.themeAttr;
  }

  // InfoPanel resource accessors: narrow the union to the concrete
  // SK type matched by InfoPanelItem.type so panel inputs typecheck
  // without leaking unsafe casts into the template.
  protected infoPanelNote(): SKNote {
    return this.infoPanel.item()?.resource as SKNote;
  }
  protected infoPanelRegion(): SKRegion {
    return this.infoPanel.item()?.resource as SKRegion;
  }
  protected infoPanelWaypoint(): SKWaypoint {
    return this.infoPanel.item()?.resource as SKWaypoint;
  }
  protected infoPanelRoute(): SKRoute {
    return this.infoPanel.item()?.resource as SKRoute;
  }

  constructor() {
    this.app.data.vessels.active = this.app.data.vessels.self;

    // Wire menu close to map-focus restoration.
    this.menu.registerOnClose(() => this.shell.focusMap());

    // Wire dialog cross-cuts back into the shell's stream/connection lifecycle.
    this.dialogs.registerHooks({
      fetchResources: () => this.fetchResources(),
      fetchAllResources: () => this.fetchAllResources(),
      switchMode: (mode, options) => this.switchMode(mode, options),
      queryAfterConnect: () => this.queryAfterConnect()
    });

    effect(() => {
      this.app.debug('** skAuthChange Event:', this.app.skAuthChange());
      this.handleSKAuthChange();
    });
    effect(() => {
      this.app.debug('** kioskMode Event:', this.app.kioskMode());
      this.shell.toggleSuppressContextMenu(this.app.kioskMode());
    });
    effect(() => {
      this.handleSelectionEnded(this.mapInteract.selection());
    });
    effect(() => {
      this.app.uiConfig();
      this.handleSettingChangeEvent();
    });
    // Phase 3 foundation: mirror themeAttr to body[data-theme] so
    // tokens.css's [data-theme] blocks resolve. Full ThemeService is Phase 7.
    effect(() => {
      document.body.setAttribute('data-theme', this.themeAttr());
    });
    // Mirror the effective night-mode flag into the chart-tile filter
    // signal. MapComponent watches it and refreshes raster sources so the
    // per-tile OffscreenCanvas tint applies; chrome is already covered by
    // the night-red OKLCH tokens.
    effect(() => {
      chartNightMode.set(
        this.stream.selfNightMode() || this.app.uiCtrl().forceNightMode
      );
    });
  }

  // ********* LIFECYCLE ****************

  ngAfterViewInit() {
    setTimeout(() => {
      if (!this.app.config.display.disableWakelock) {
        this.wakeLock.enable();
      }
    }, 500);
  }

  ngOnInit() {
    this.audio.init();
    this.shell.initFullscreenListeners();

    this.mapCenter.update(() => this.app.config.map.center);
    this.app.instrumentPanel.update((current) => {
      return Object.assign({}, current, {
        activate: !this.app.config.display.plugins.startOnOpen
      });
    });

    this.shell.setDarkTheme();

    this.instUrl.update(() =>
      this.dom.bypassSecurityTrustResourceUrl(this.formatInstrumentsUrl())
    );
    this.vidUrl.update(() =>
      this.dom.bypassSecurityTrustResourceUrl(
        `${this.app.config.resources.video.url}`
      )
    );

    this.connectSignalKServer();

    // ********************* SUBSCRIPTIONS *****************
    this.stream
      .delta$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((msg: NotificationMessage | UpdateMessage) =>
        this.onMessage(msg)
      );
    this.stream
      .connect$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((msg: NotificationMessage | UpdateMessage) =>
        this.onConnect(msg)
      );
    this.stream
      .close$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((msg: NotificationMessage | UpdateMessage) =>
        this.onClose(msg)
      );
    this.stream
      .error$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((msg: NotificationMessage | UpdateMessage) =>
        this.onError(msg)
      );
    this.stream
      .trail$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((msg) => this.handleTrailUpdate(msg));

    this.settings.change$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value: string[]) => this.handleSettingChangeEvent(value));
  }

  ngOnDestroy() {
    this.stopTimers();
    this.stream.terminate();
    this.signalk.disconnect();
  }

  // ********* DISPLAY / APPEARANCE / TOOLBAR (delegated to AppShellService) ****************

  protected getOrientation() {
    return this.shell.getOrientation();
  }
  protected focusMap() {
    this.shell.focusMap();
  }
  protected toggleRadar() {
    this.shell.toggleRadar();
  }
  protected toggleMoveMap(exit = false) {
    this.shell.toggleMoveMap(exit);
  }
  protected toggleNorthUp() {
    this.shell.toggleNorthUp();
  }
  protected toggleToolbarButtons() {
    this.shell.toggleToolbarButtons();
  }
  protected toggleConstrainMapZoom() {
    this.shell.toggleConstrainMapZoom();
  }
  protected invertFeatureLabelColor() {
    this.shell.invertFeatureLabelColor();
  }
  protected toggleAlertList(show: boolean) {
    this.shell.toggleAlertList(show);
  }
  protected toggleAutopilotConsole(show: boolean) {
    this.shell.toggleAutopilotConsole(show);
  }
  protected toggleRouteBuilderConsole(show: boolean) {
    this.shell.toggleRouteBuilderConsole(show);
  }
  protected toggleSuppressContextMenu(value: boolean) {
    this.shell.toggleSuppressContextMenu(value);
  }
  protected toggleFullscreen() {
    this.shell.toggleFullscreen();
  }

  // ********* AUDIO (delegated to AudioAlarmService) ****************

  protected enableAudio() {
    this.audio.enable();
  }

  // ********* DIALOGS (delegated to DialogOrchestrator) ****************

  protected openAbout() {
    this.dialogs.openAbout();
  }
  protected openSettings() {
    this.dialogs.openSettings();
  }
  protected importFile(f: { data: string | ArrayBuffer; name: string }) {
    this.dialogs.importFile(f);
  }
  protected exportToGPX() {
    this.dialogs.exportToGPX();
  }
  protected importResourceSet() {
    this.dialogs.importResourceSet();
  }
  protected showLogin(
    message?: string,
    cancelWarning = true,
    onConnect?: boolean
  ): Promise<void> {
    return this.dialogs.showLogin(message, cancelWarning, onConnect);
  }
  protected showPlaybackSettings() {
    this.dialogs.showPlaybackSettings();
  }
  protected trailToRoute() {
    this.dialogs.trailToRoute();
  }
  protected showWeather(mode: string) {
    this.dialogs.showWeather(mode);
  }
  protected openCourseSettings() {
    this.dialogs.openCourseSettings();
  }
  protected openExperiment(e: { choice: string; value?: unknown }) {
    this.dialogs.openExperiment(e);
  }
  protected featureProperties(e: { id: string; type: string }) {
    this.dialogs.featureProperties(e);
  }
  protected processGPX(f: { data: string | ArrayBuffer; name: string }) {
    this.dialogs.processGPX(f);
  }

  // ********* PLUGIN / INSTRUMENT URLS ****************

  private formatInstrumentsUrl() {
    const url = `${this.app.hostDef.url}${this.app.config.display.plugins.instruments}`;
    const params = this.app.config.display.plugins.parameters
      ? this.app.config.display.plugins.parameters.length > 0 &&
        !this.app.config.display.plugins.parameters.startsWith('?')
        ? `?${this.app.config.display.plugins.parameters}`
        : this.app.config.display.plugins.parameters
      : '';
    return params ? `${url}/${params}` : url;
  }

  protected selectPlugin(next = false) {
    const favs = this.app.config.display.plugins.favourites;
    if (next) {
      if (this.selFavourite === -1) {
        this.selFavourite = 0;
      } else if (this.selFavourite === favs.length - 1) {
        this.selFavourite = -1;
      } else {
        this.selFavourite++;
      }
    } else {
      if (this.selFavourite === -1) {
        this.selFavourite = favs.length - 1;
      } else if (this.selFavourite === 0) {
        this.selFavourite = -1;
      } else {
        this.selFavourite--;
      }
    }
    const url =
      this.selFavourite === -1
        ? this.formatInstrumentsUrl()
        : `${this.app.hostDef.url}${favs[this.selFavourite]}`;
    this.instUrl.update(() => this.dom.bypassSecurityTrustResourceUrl(url));
  }

  protected onInfoLayerParamChange(param: {
    id: string;
    param: Record<string, unknown>;
  }) {
    this.skresOther.infoLayerParams.update(() => [param]);
  }

  // ********* MAP CONTEXT MENU ****************

  protected handleContextMenuSelection(action: string) {
    switch (action) {
      case 'cleartrail':
        this.clearTrail(this.app.data.serverTrail);
        break;
      case 'trail2route':
        this.trailToRoute();
        break;
      case 'cleardestination':
        this.clearDestination();
        break;
      case 'anchor':
        this.displayLeftMenu('anchorWatch', true);
        break;
      case 'weather_forecast':
        this.showWeather('forecast');
        break;
    }
  }

  // ********* SIGNAL K AUTH ****************

  protected handleSKAuthChange() {
    this.signalk.getLoginStatus().subscribe((r) => {
      this.app.data.loginRequired = r.authenticationRequired ?? false;
      this.app.isLoggedIn.update(() => r.status === 'loggedIn');
      this.signalk.get('/plugins/freeboard-sk').subscribe(
        () => {
          this.app.debug('User Authenticated');
          this.app.isLoggedIn.set(true);
        },
        (err: HttpErrorResponse) => {
          if (err.status === 401) {
            this.app.debug('User NOT Authenticated');
            this.app.isLoggedIn.set(false);
          }
        }
      );
    });
  }

  // ********* SIGNAL K CONNECTION ****************

  private connectSignalKServer() {
    this.app.data.selfId = null;
    this.app.data.server = null;
    this.signalk.proxied = this.app.config.signalk.proxied;
    this.signalk
      .connect(
        this.app.hostDef.name,
        this.app.hostDef.port,
        this.app.hostDef.ssl
      )
      .subscribe({
        next: () => {
          this.signalk.authToken = this.app.getFBToken() ?? '';
          this.app.watchSKLogin();
          this.fetchAllResources();
          this.app
            .loadUserConfigfromServer()
            .then((loaded: boolean) => {
              if (!loaded && this.app.launchStatus.result === 'first_run') {
                const wr = this.app.showWelcome(false);
                if (wr) {
                  wr.afterClosed().subscribe((r) => {
                    if (r) this.openSettings();
                  });
                }
              } else {
                this.app.showWelcome(true);
              }
            })
            .finally(() => {
              this.fetchAllResources();
            });
          this.getFeatures();
          this.app.data.server = this.signalk.server.info;
          this.openSKStream();
        },
        error: () => {
          this.app.showMessage(
            'Unable to contact Signal K server! (Retrying in 5 secs)',
            false,
            5000
          );
          setTimeout(() => this.connectSignalKServer(), 5000);
        }
      });
  }

  private async getFeatures() {
    const ff = {
      anchorApi: false,
      autopilotApi: false,
      weatherApi: false,
      radarApi: false,
      notificationApi: false,
      buddyList: false
    };
    this.signalk.get('/signalk/v2/features?enabled=1').subscribe(
      (res: { apis: string[]; plugins: { id: string; version: string }[] }) => {
        ff.weatherApi = res.apis.includes('weather');
        ff.autopilotApi = res.apis.includes('autopilot');
        ff.radarApi = res.apis.includes('radar');
        ff.notificationApi = res.apis.includes('notifications');

        const hasPlugin = { charts: false, pmTiles: false };

        res.plugins.forEach((p: { id: string; version: string }) => {
          if (p.id === 'anchoralarm') {
            this.app.debug('*** found anchoralarm plugin');
            ff.anchorApi = true;
          }
          if (p.id === 'signalk-buddylist-plugin') {
            this.app.debug('*** found buddylist plugin');
            ff.buddyList = compareSemver(p.version, '1.2.0') > 0;
          }
          if (p.id === 'signalk-pmtiles-plugin') {
            this.app.debug('*** found PMTiles plugin');
            hasPlugin.pmTiles = true;
          }
        });
        this.app.featureFlags.update((current) => {
          return Object.assign({}, current, ff);
        });
      },
      () => {
        this.app.debug('*** Features API not present!');
      }
    );

    this.app.fetchUnitPrefsFromSKServer();

    const rcs = await this.skresOther.initCustomCollections();
    this.app.featureFlags.update((current) => {
      return Object.assign({}, current, rcs);
    });
  }

  // ********* TRAIL LOGGING TIMER ****************

  private startTimers() {
    this.app.debug(`Starting Trail logging timer...`);
    this.timers.push(setInterval(() => this.processTrail(), 5000));
  }

  private stopTimers() {
    this.app.debug(`Stopping timers:`);
    this.timers.forEach((t) => clearInterval(t));
    this.timers = [];
  }

  /** Process local vessel trail. trailData is the optional server trail. */
  private processTrail(trailData?: LineString) {
    if (!this.app.config.vessels.trail) {
      return;
    }
    const t = this.app.selfTrail().slice(-1);
    const selfPos = this.app.data.vessels.self.position;
    if (this.app.data.vessels.showSelf && selfPos) {
      if (t.length === 0) {
        this.app.selfTrail.update((current) => [...current, selfPos]);
        return;
      }
      const last = t[0];
      if (last && (selfPos[0] !== last[0] || selfPos[1] !== last[1])) {
        this.app.selfTrail.update((current) => [...current, selfPos]);
      }
    }

    if (!trailData || trailData.length === 0) {
      if (this.app.selfTrail().length % 60 === 0 && this.app.data.serverTrail) {
        if (this.app.config.vessels.trailFromServer) {
          this.stream.requestTrailFromServer();
        }
      }
      this.app.selfTrail.update((current) => current.slice(-5000));
    } else {
      // trailData arrives shaped as Position[][] at runtime even though
      // typed LineString; the .slice(-1) chain takes the trailing point of
      // the trailing segment. Behavior preserved.
      const segments = trailData as unknown as Position[][];
      const lastseg = segments.slice(-1);
      let lastpt: LineString = [];
      const first = lastseg[0];
      if (lastseg.length !== 0 && first) {
        lastpt = first.slice(-1);
      } else if (segments.length > 1) {
        const prev = segments[segments.length - 2];
        if (prev) lastpt = prev.slice(-1);
      }
      this.app.selfTrail.update(() => lastpt);
    }
    const trailId = this.mode === SKSTREAM_MODE.PLAYBACK ? 'history' : 'self';
    this.app.db.saveTrail(trailId, this.app.selfTrail());
  }

  private handleTrailUpdate(e: {
    action: string;
    mode: string;
    data: MultiLineString;
  }) {
    if (e.action === 'get' && e.mode === 'trail') {
      if (this.app.config.vessels.trailFromServer) {
        // selfTrailFromServer signal is typed LineString but consumers in
        // the layer-vessel-trail OL component expect Coordinate[][]
        // (MultiLineString shape). Phase 6 will reconcile.
        this.app.selfTrailFromServer.update(
          () => e.data as unknown as LineString
        );
      }
      this.processTrail(e.data as unknown as LineString);
    }
  }

  // ********* SETTINGS CHANGE HANDLER ****************

  private handleSettingChangeEvent(e: string[] = []) {
    if (e?.includes('darkTheme')) {
      this.shell.setDarkTheme();
    }

    if (e?.includes('headingAttribute')) {
      this.applyHeadingAttributeChange();
    }

    if (
      e?.includes('pluginParameters') ||
      e?.includes('pluginInstruments') ||
      e?.includes('pluginStartOnOpen')
    ) {
      this.applyInstrumentPanelChange();
    }

    if (e?.includes('videoUrl')) {
      this.vidUrl.update(() =>
        this.dom.bypassSecurityTrustResourceUrl(
          `${this.app.config.resources.video.url}`
        )
      );
    }

    if (e?.includes('vesselTrail') || e?.includes('trailFromServer')) {
      if (this.app.config.vessels.trail) {
        if (this.app.config.vessels.trailFromServer) {
          this.stream.requestTrailFromServer();
        } else {
          this.app.data.serverTrail = false;
        }
      }
    }
  }

  private applyHeadingAttributeChange() {
    this.app.debug('True / Magnetic selection changed..');
    const self = this.app.data.vessels.self;
    self.heading = this.app.useMagnetic
      ? self.headingMagnetic
      : self.headingTrue;
    self.cog = this.app.useMagnetic ? self.cogMagnetic : self.cogTrue;
    self.wind.direction = this.app.useMagnetic ? self.wind.mwd : self.wind.twd;

    this.app.data.vessels.aisTargets.forEach((v) => {
      v.heading = this.app.useMagnetic ? v.headingMagnetic : v.headingTrue;
      v.cog = this.app.useMagnetic ? v.cogMagnetic : v.cogTrue;
      v.wind.direction = this.app.useMagnetic ? v.wind.mwd : v.wind.twd;
    });
    this.app.sTrueMagChoice.set(this.app.config.units.headingAttribute);
  }

  private applyInstrumentPanelChange() {
    this.instUrl.update(() =>
      this.dom.bypassSecurityTrustResourceUrl(this.formatInstrumentsUrl())
    );
    this.app.instrumentPanel.update((current) => {
      return Object.assign({}, current, {
        activate: this.app.config.display.plugins.startOnOpen
          ? !!current.open
          : true
      });
    });
  }

  // ********* SIDENAV / LEFT MENU ****************

  protected rightSideNavAction(e: boolean) {
    this.app.instrumentPanel.update((current) => {
      return Object.assign({}, current, {
        open: e,
        activate: this.app.config.display.plugins.startOnOpen
          ? e
          : current.activate
      });
    });
    if (!e) {
      this.shell.focusMap();
    }
  }

  protected displayLeftMenu(menulist = '', show = false) {
    this.menu.display(menulist, show);
  }

  protected handleResourceInfo(collection: SKResourceType, id: string) {
    if (collection === 'notes' && !this.app.useInfoPanel()) {
      this.skres.noteSelected(id, false);
    } else if (collection === 'regions' && !this.app.useInfoPanel()) {
      this.skres.editRegionInfo(id);
    } else if (collection === 'waypoints' && !this.app.useInfoPanel()) {
      this.skres.editWaypointInfo(id);
    } else if (collection === 'routes' && !this.app.useInfoPanel()) {
      this.skres.editRouteInfo(id);
    } else {
      this.infoPanel.open(collection, id);
    }
  }

  // ********* OPTIONS / NAV ACTIONS ****************

  protected centerAndZoom(position: Position, zoomTo?: number) {
    this.mapCenter.update(() => position);
    if (typeof zoomTo === 'number') {
      this.app.config.map.zoomLevel = zoomTo;
    }
  }

  protected centerVessel() {
    this.centerAndZoom(this.app.calcMapCenter());
  }

  protected toggleAisTargets() {
    this.app.config.ui.showAisTargets = !this.app.config.ui.showAisTargets;
    if (this.app.config.ui.showAisTargets) {
      this.stream.aisTargetUpdated();
    }
    this.app.saveConfig();
  }

  protected toggleCourseData() {
    this.app.config.ui.showCourseData = !this.app.config.ui.showCourseData;
    this.app.saveConfig();
  }

  protected toggleNotes() {
    this.app.config.ui.showNotes = !this.app.config.ui.showNotes;
    this.app.saveConfig();
  }

  protected clearTrail(noprompt = false) {
    const doClear = () => {
      if (!this.app.data.serverTrail) {
        this.app.selfTrail.set([]);
      } else if (this.app.config.vessels.trailFromServer) {
        this.stream.requestTrailFromServer();
      }
    };
    if (noprompt) {
      doClear();
    } else if (!this.app.data.serverTrail) {
      this.app
        .showConfirm(
          'Clear Vessel Trail',
          'Do you want to delete the vessel trail?'
        )
        .subscribe((res) => {
          if (res) {
            doClear();
          }
        });
    }
  }

  protected clearCourseData() {
    this.course.initCourseData();
  }

  protected clearDestination() {
    this.course.clearCourse();
  }

  // ********* ROUTE / MAP ACTIONS ****************

  protected activateRoute(id: string) {
    const r = this.skres.fromCache('routes', id);
    if (!r) {
      return;
    }
    const selfPos = this.app.data.vessels.self.position;
    if (!selfPos) {
      return;
    }
    const heading = this.app.data.vessels.self.heading;
    const cpi = GeoUtils.closestForwardPoint(
      r[1].feature.geometry.coordinates,
      selfPos,
      heading === null ? 0 : Convert.radiansToDegrees(heading)
    );
    if (cpi === -1) {
      this.app
        .showConfirm(
          'Closest point is behind vessel!\nDo you want to start from the first point?',
          'Start Route'
        )
        .subscribe((res) => {
          if (res) {
            this.course.activateRoute(id);
          }
        });
      return;
    }
    this.course.activateRoute(id, cpi);
  }

  protected routeNextPoint(pointIndex: number) {
    this.course.coursePointIndex(pointIndex);
    this.shell.focusMap();
  }

  protected mapDragOver(e: DragEvent) {
    e.preventDefault();
  }

  protected mapDrop(e: DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) {
      return;
    }
    if (files.length > 1) {
      this.app.showAlert(
        'Load Resources',
        'Multiple files provided!\nPlease select only one file for processing.'
      );
      return;
    }
    const file = files[0];
    if (!file?.name) {
      return;
    }
    const fname = file.name;
    const reader = new FileReader();
    reader.onerror = () => {
      this.app.showAlert(
        'File Load error',
        `There was an error reading the file contents!`
      );
    };
    reader.onload = () => {
      if (reader.result === null) return;
      this.processGPX({ name: fname, data: reader.result });
    };
    reader.readAsText(file);
  }

  // ********* MODE ACTIONS ****************

  protected switchActiveVessel(uuid: string | null = null) {
    this.app.data.vessels.activeId = uuid;
    if (!uuid) {
      this.app.data.vessels.active = this.app.data.vessels.self;
    } else {
      const av = this.app.data.vessels.aisTargets.get(uuid);
      if (!av) {
        this.app.data.vessels.active = this.app.data.vessels.self;
        this.app.data.vessels.activeId = null;
      } else {
        this.app.data.vessels.active = av;
        this.sideright?.close();
      }
    }
    this.app.data.activeRoute = null;
    this.clearCourseData();
    this.app.debug(`** Active vessel: ${this.app.data.vessels.activeId} `);
    this.app.debug(this.app.data.vessels.active);
  }

  protected switchMode(toMode: SKSTREAM_MODE, options?: StreamOptions) {
    this.app.debug(`switchMode from: ${this.mode} to ${toMode}`);
    if (toMode === SKSTREAM_MODE.PLAYBACK) {
      this.app.db.saveTrail('self', this.app.selfTrail());
      this.app.selfTrail.set([]);
    } else {
      this.app.db.getTrail('self').then((t) => {
        this.app.selfTrail.set(t?.value ?? []);
      });
    }
    this.switchActiveVessel();
    this.openSKStream(options, toMode, true);
  }

  protected showSelectMode() {
    if (this.mode === SKSTREAM_MODE.REALTIME) {
      this.app
        .showConfirm(
          'Do you want to change to History Playback mode?',
          'Switch Mode'
        )
        .subscribe((r) => {
          if (r) this.showPlaybackSettings();
        });
    } else {
      this.app
        .showConfirm(
          'Do you want to exit History Playback mode?',
          'Exit History Playback'
        )
        .subscribe((r) => {
          if (r) this.switchMode(SKSTREAM_MODE.REALTIME);
        });
    }
  }

  // ********* DRAW / EDIT ****************

  protected handleSelectionEnded(selection: SelectionResultDef) {
    if (selection.mode === 'seedChart' && selection.bbox) {
      this.skres.seedChartCache(selection.data, selection.bbox);
    }
  }

  protected drawFeature(f: DrawFeatureType) {
    this.mapInteract.startDrawing(f);
  }

  protected handleDrawEnded(e: DrawFeatureInfo) {
    this.mapInteract.isDrawing();
    switch (this.mapInteract.draw.resourceType) {
      case 'note': {
        const params: { position: Position; group?: string } = {
          position: e.coordinates as Position
        };
        const group = this.mapInteract.draw.properties['group'];
        if (typeof group === 'string') {
          params.group = group;
        }
        this.skres.showNoteEditor(params);
        break;
      }
      case 'waypoint':
        this.skres.newWaypointAt(e.coordinates as Position);
        break;
      case 'route':
        this.skres.newRouteAt(e.coordinates as LineString);
        break;
      case 'region': {
        const region = new SKRegion();
        region.feature.geometry.coordinates = [
          GeoUtils.normaliseCoords(e.coordinates as Polygon)
        ];
        this.skres.newRegion(region);
        break;
      }
    }
  }

  protected closeInteraction() {
    if (this.mapInteract.isBoxSelecting()) {
      this.mapInteract.stopBoxSelection();
    }
    if (this.mapInteract.isMeasuring()) {
      this.mapInteract.stopMeasuring();
    }
    if (this.mapInteract.isDrawing()) {
      this.mapInteract.stopDrawing();
    }
    if (this.mapInteract.isModifying()) {
      this.handleModifyEnded();
    }
  }

  private handleModifyEnded() {
    this.mapInteract.stopModifying();
    this.app.data.activeRouteIsEditing = false;
    const forSave = this.mapInteract.draw.forSave;
    if (!forSave?.id) {
      return;
    }
    if (forSave.id === 'anchor') {
      this.mapInteract.draw.forSave = null;
      this.shell.focusMap();
      return;
    }
    this.app
      .showConfirm(
        `Do you want to save the changes made to ${forSave.id.split('.')[0]}?`,
        'Save Changes'
      )
      .subscribe((result) => {
        this.applyModifyDecision(result, forSave);
        this.mapInteract.draw.forSave = null;
        this.shell.focusMap();
      });
  }

  private applyModifyDecision(
    save: boolean,
    forSave: {
      id: string;
      coords: Position | Position[] | Position[][];
      coordsMetadata?: { name?: string; href?: string }[];
    }
  ) {
    const r = forSave.id.split('.');
    const kind = r[0];
    const subId = r[1];
    if (save && subId) {
      if (kind === 'route') {
        this.skres.updateRouteCoords(
          subId,
          forSave.coords as Position[],
          forSave.coordsMetadata
        );
      } else if (kind === 'waypoint') {
        const wptCoords = forSave.coords as Position;
        this.skres.updateWaypointPosition(subId, wptCoords);
        if (subId === this.app.data.activeWaypoint) {
          this.course.setDestination({
            latitude: wptCoords[1],
            longitude: wptCoords[0]
          });
        }
      } else if (kind === 'note') {
        this.skres.updateNotePosition(subId, forSave.coords as Position);
      } else if (kind === 'region') {
        this.skres.updateRegionCoords(subId, forSave.coords as Position[][]);
      }
      return;
    }
    if (r[0] === 'route') {
      this.skres.refreshRoutes();
    } else if (r[0] === 'waypoint') {
      this.skres.refreshWaypoints();
    } else if (r[0] === 'note') {
      this.skres.refreshNotes();
    } else if (r[0] === 'region') {
      this.skres.refreshRegions();
    }
  }

  // ******** SIGNAL K STREAM *************

  private fetchResources() {
    this.skres.refreshRoutes();
    this.skres.refreshWaypoints();
    this.skres.refreshCharts();
    // notes refresh is triggered via map center change, not here.
    this.skres.refreshRegions();
  }

  private fetchAllResources() {
    this.fetchResources();
    this.skres.refreshTracks();
    this.skresOther.refreshResourceSetsInBounds();
    this.skresOther.refreshInfoLayers();
  }

  private openSKStream(
    options: StreamOptions | null = null,
    toMode: SKSTREAM_MODE = SKSTREAM_MODE.REALTIME,
    restart = false
  ) {
    if (restart) {
      this.streamOptions = { options, toMode };
      this.stream.close();
      return;
    }
    this.stream.sendConfig(this.app.config);
    this.stream.open(options ?? undefined);
  }

  private queryAfterConnect() {
    if (parseSemver(String(this.signalk.server.info['version']))?.[0] === 1) {
      this.app.showAlert(
        'Unsupported Server Version:',
        'The connected Signal K server is not supported by this version of Freeboard-SK.\n Signal K server version 2 or later is required!'
      );
    }
    this.app.alignCustomResourcesPaths();
    this.signalk.api.getSelf().subscribe(
      (r: { name?: string }) => {
        this.stream.post({
          cmd: 'vessel',
          options: { context: 'self', name: r.name ?? '' }
        });
        if (this.app.config.vessels.trailFromServer) {
          this.stream.requestTrailFromServer();
        }
        const selfPos = this.app.data.vessels.self.position;
        this.anchor.queryAnchorStatus(undefined, selfPos ?? undefined);
        this.radarApi.listRadars().catch((err: Error) => {
          this.app.debug(err.message);
        });
      },
      (err: HttpErrorResponse) => {
        if (err.status && err.status === 401) {
          this.showLogin(undefined, false, true);
        }
        this.app.debug('No vessel data available!');
      }
    );
  }

  // ******** STREAM EVENT HANDLERS *************

  private reconnecting = false;

  private onConnect(e?: NotificationMessage | UpdateMessage) {
    this.app.showMessage('Connection Open.', false, 2000);
    this.app.debug(e);
    this.queryAfterConnect();
    this.startTimers();
  }

  private onClose(e?: NotificationMessage | UpdateMessage) {
    this.app.debug('onClose: STREAM connection closed...');
    this.app.debug(e);
    this.stopTimers();
    if (e?.result) {
      this.openSKStream(
        this.streamOptions.options ?? undefined,
        this.streamOptions.toMode ?? undefined
      );
      return;
    }
    if (e?.playback) {
      this.handlePlaybackClose();
      return;
    }
    if (!this.reconnecting) {
      this.reconnecting = true;
      setTimeout(() => {
        this.reconnecting = false;
        this.openSKStream(this.streamOptions.options ?? undefined, this.mode);
      }, 5000);
    }
  }

  private handlePlaybackClose() {
    const data = {
      title: 'Connection Closed:',
      buttonText: 'OK',
      message: 'Unable to open Playback connection.'
    };
    this.app
      .showAlert(data.message, data.title, data.buttonText)
      .subscribe(() => {
        if (this.mode === SKSTREAM_MODE.REALTIME) {
          this.switchMode(this.mode);
        } else {
          this.showPlaybackSettings();
        }
      });
  }

  private onError(e?: NotificationMessage | UpdateMessage) {
    this.app.showMessage('Connection Error!', false, 2000);
    console.warn('Stream Error!', e);
  }

  private onMessage(e: NotificationMessage | UpdateMessage) {
    if (e.action === 'hello') {
      this.app.debug(e);
      if (e.playback) {
        this.mode = SKSTREAM_MODE.PLAYBACK;
      } else {
        this.mode = SKSTREAM_MODE.REALTIME;
        this.stream.subscribe();
      }
      this.app.data.selfId = e.self ?? '';
      return;
    }
    if (e.action === 'update') {
      if (this.mode === SKSTREAM_MODE.PLAYBACK) {
        const d = new Date(e.timestamp);
        this.playbackTime.update(
          () => `${d.toDateString().slice(4)} ${d.toTimeString().slice(0, 8)}`
        );
      } else {
        this.playbackTime.set(null);
        this.shell.setDarkTheme();
      }
      this.updateNavPanel();
    }
  }

  private updateNavPanel() {
    this.navDataPanel.update(() => ({
      show: !!(
        this.app.data.activeRoute ||
        this.app.data.activeWaypoint ||
        this.course.courseData().position
      ),
      nextPointCtrl: !!this.app.data.activeRoute,
      apModeColor: this.app.data.vessels.self.autopilot.enabled
        ? 'primary'
        : '',
      apModeText: this.app.data.vessels.self.autopilot.default
        ? `Autopilot: ${this.app.data.vessels.self.autopilot.default}`
        : ''
    }));
  }
}

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
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
import {
  FbBadgeComponent,
  FbButtonComponent,
  FbDividerComponent,
  FbFabComponent,
  FbIconComponent,
  FbMenuService,
  type FbMenuTemplateContext,
  type FbMenuTemplateRef,
  FbNavListComponent,
  FbProgressBarComponent,
  FbTooltipDirective
} from 'src/app/design-system/primitives';
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
import type { InfoPanelItem } from './modules/info-panel';
import { VesselInfoPanelComponent } from './modules/info-panel/panels/vessel/vessel-info-panel.component';
import { AircraftInfoPanelComponent } from './modules/info-panel/panels/aircraft/aircraft-info-panel.component';
import { AtonInfoPanelComponent } from './modules/info-panel/panels/aton/aton-info-panel.component';
import { AlarmInfoPanelComponent } from './modules/info-panel/panels/alarm/alarm-info-panel.component';
import { S57InfoPanelComponent } from './modules/info-panel/panels/s57/s57-info-panel.component';
import { ResourcesetInfoPanelComponent } from './modules/info-panel/panels/resourceset/resourceset-info-panel.component';
import { FeaturelistInfoPanelComponent } from './modules/info-panel/panels/featurelist/featurelist-info-panel.component';
import { ChartlistInfoPanelComponent } from './modules/info-panel/panels/chartlist/chartlist-info-panel.component';
import { SignalKClient } from 'src/lib/signalk-client';
import { WakeLockService } from 'src/app/lib/services';
import {
  AppShellService,
  AudioAlarmService,
  DialogOrchestrator,
  MenuController,
  SignalKConnectionController
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
import {
  LineString,
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
import {
  RoutePanel,
  SKResourceType,
  WaypointPanel,
  isSKResourceType
} from './modules/skresources';
import { chartNightMode } from './modules/map/ol/lib/charts/night-mode-filter';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [
    FbBadgeComponent,
    FbButtonComponent,
    FbDividerComponent,
    FbFabComponent,
    FbIconComponent,
    FbNavListComponent,
    FbProgressBarComponent,
    FbTooltipDirective,
    CommonModule,
    TextDialComponent,
    TTGDialComponent,
    ETADialComponent,
    FileInputComponent,
    PiPVideoComponent,
    MFBContainerComponent,
    InteractionHelpComponent,
    FBMapComponent,
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
    RoutePanel,
    VesselInfoPanelComponent,
    AircraftInfoPanelComponent,
    AtonInfoPanelComponent,
    AlarmInfoPanelComponent,
    S57InfoPanelComponent,
    ResourcesetInfoPanelComponent,
    FeaturelistInfoPanelComponent,
    ChartlistInfoPanelComponent
  ]
})
export class AppComponent implements AfterViewInit, OnInit, OnDestroy {
  protected rightOpen = signal(false);

  protected toggleRight(): void {
    const next = !this.rightOpen();
    this.rightOpen.set(next);
    this.rightSideNavAction(next);
  }

  protected closeRight(): void {
    if (this.rightOpen()) {
      this.rightOpen.set(false);
      this.rightSideNavAction(false);
    }
  }

  @ViewChild(FBMapComponent) private fbMap?: FBMapComponent;

  @ViewChild('layersmenuTpl', { static: true })
  private layersmenuTpl!: TemplateRef<FbMenuTemplateContext>;
  @ViewChild('settingsmenuTpl', { static: true })
  private settingsmenuTpl!: TemplateRef<FbMenuTemplateContext>;
  @ViewChild('editmenuTpl', { static: true })
  private editmenuTpl!: TemplateRef<FbMenuTemplateContext>;
  @ViewChild('mainmenuTpl', { static: true })
  private mainmenuTpl!: TemplateRef<FbMenuTemplateContext>;

  // Phase 3 shell services (state and orchestration extracted from this file)
  private readonly shell = inject(AppShellService);
  private readonly menu = inject(MenuController);
  private readonly audio = inject(AudioAlarmService);
  private readonly dialogs = inject(DialogOrchestrator);
  private readonly conn = inject(SignalKConnectionController);
  private readonly fbMenu = inject(FbMenuService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private openMenuRef: FbMenuTemplateRef | null = null;

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

  public mode: SKSTREAM_MODE = SKSTREAM_MODE.REALTIME; // mirrored from controller for template binding

  // external resources
  protected instUrl = signal<SafeResourceUrl | null>(null);
  private selFavourite = -1;
  protected vidUrl = signal<SafeResourceUrl | null>(null);

  protected convert = Convert;
  private destroyRef = inject(DestroyRef);

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

  // ----- template-bound signal proxies -----

  protected leftMenuCtrl = () => this.menu.state();
  protected displayFullscreen = () => this.shell.displayFullscreen();
  protected mapSetFocus = () => this.shell.mapSetFocus();
  protected audioStatus = () => this.audio.status();
  protected get themeAttr() {
    return this.shell.themeAttr;
  }

  // InfoPanel resource accessors: narrow the discriminated union to the
  // concrete SK type so panel inputs typecheck without leaking unsafe
  // casts into templates. Each helper checks `kind === 'resource'`
  // first so non-resource items (vessel, alarm, s57, ...) return null.
  protected infoPanelResourceItem<T>(): T | null {
    const item = this.infoPanel.item();
    if (item?.kind !== 'resource') {
      return null;
    }
    return item.resource as T;
  }
  protected infoPanelNote(): SKNote | null {
    return this.infoPanelResourceItem<SKNote>();
  }
  protected infoPanelRegion(): SKRegion | null {
    return this.infoPanelResourceItem<SKRegion>();
  }
  protected infoPanelWaypoint(): SKWaypoint | null {
    return this.infoPanelResourceItem<SKWaypoint>();
  }
  protected infoPanelRoute(): SKRoute | null {
    return this.infoPanelResourceItem<SKRoute>();
  }

  constructor() {
    this.app.data.vessels.active = this.app.data.vessels.self;

    // Wire menu close to map-focus restoration.
    this.menu.registerOnClose(() => this.shell.focusMap());

    // Wire dialog cross-cuts back into the shell's stream/connection lifecycle.
    this.dialogs.registerHooks({
      fetchResources: () => this.conn.fetchResources(),
      fetchAllResources: () => this.conn.fetchAllResources(),
      switchMode: (mode, options) => this.switchMode(mode, options),
      queryAfterConnect: () => this.conn.queryAfterConnect()
    });

    // Wire stream-event hooks back to the host's template signals and
    // dialog flows. The controller owns the stream lifecycle but cannot
    // touch UI-bound state directly.
    this.conn.registerHooks({
      onModeChange: (mode) => {
        this.mode = mode;
      },
      onPlaybackTimeChange: (time) => this.playbackTime.set(time),
      updateNavPanel: () => this.updateNavPanel(),
      showLogin: () => {
        this.showLogin(undefined, false, true);
      },
      openSettings: () => this.openSettings(),
      showPlaybackSettings: () => this.showPlaybackSettings(),
      requestSwitchMode: (mode, options) => this.switchMode(mode, options)
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

    this.conn.connect();

    // ********************* SUBSCRIPTIONS *****************
    this.stream
      .delta$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((msg: NotificationMessage | UpdateMessage) =>
        this.conn.handleMessage(msg)
      );
    this.stream
      .connect$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((msg: NotificationMessage | UpdateMessage) =>
        this.conn.handleConnect(msg)
      );
    this.stream
      .close$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((msg: NotificationMessage | UpdateMessage) =>
        this.conn.handleClose(msg)
      );
    this.stream
      .error$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((msg: NotificationMessage | UpdateMessage) =>
        this.conn.handleError(msg)
      );
    this.stream
      .trail$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((msg) => this.conn.handleTrailUpdate(msg));

    this.settings.change$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value: string[]) => this.handleSettingChangeEvent(value));
  }

  ngOnDestroy() {
    this.conn.terminate();
  }

  // ********* DISPLAY / APPEARANCE / TOOLBAR (delegated to AppShellService) ****************

  protected getOrientation() {
    return this.shell.getOrientation();
  }
  protected focusMap() {
    this.shell.focusMap();
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

  // Used by the instruments side-panel "open in new window" button.
  // Bypasses the SafeResourceUrl-wrapped instUrl signal because
  // window.open wants the raw string and the URL is already same-
  // origin (formatInstrumentsUrl is server-relative).
  protected openInstrumentsInNewWindow(): void {
    const url = this.formatInstrumentsUrl();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
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

  protected openMainMenu(event: MouseEvent): void {
    this.openTemplateMenu(event, this.mainmenuTpl, 'Main menu');
  }
  protected openLayersMenu(event: MouseEvent): void {
    this.openTemplateMenu(event, this.layersmenuTpl, 'Resource layers menu');
  }
  protected openEditMenu(event: MouseEvent): void {
    this.openTemplateMenu(event, this.editmenuTpl, 'Draw, measure, or select');
  }
  protected openSettingsMenu(event: MouseEvent): void {
    this.openTemplateMenu(event, this.settingsmenuTpl, 'More actions');
  }

  private openTemplateMenu(
    event: MouseEvent,
    templateRef: TemplateRef<FbMenuTemplateContext>,
    ariaLabel: string
  ): void {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;
    this.openMenuRef?.close();
    this.openMenuRef = this.fbMenu.openTemplate({
      trigger: target,
      templateRef,
      viewContainerRef: this.viewContainerRef,
      ariaLabel
    });
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
  protected openResourceSet(path: string) {
    this.dialogs.openResourceSet(path);
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
      this.signalk.get('/plugins/signalk-open-binnacle').subscribe({
        next: () => {
          this.app.debug('User Authenticated');
          this.app.isLoggedIn.set(true);
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 401) {
            this.app.debug('User NOT Authenticated');
            this.app.isLoggedIn.set(false);
          }
        }
      });
    });
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

  // Info-panel handlers (replaced popover outputs from fb-map). Pure
  // delegations into existing services or the active vessel state; map
  // chrome work (modify, delete on resource sets) stays in fb-map and is
  // surfaced via a viewchild on the host map component.
  protected setActiveVessel(id: string | null) {
    this.app.data.vessels.activeId = id;
  }

  protected silenceAlarm(id: string): void {
    this.notiMgr.silence(id);
  }

  protected acknowledgeAlarm(id: string): void {
    this.notiMgr.acknowledge(id);
  }

  protected resolveAlarm(id: string): void {
    this.notiMgr.clear(id);
  }

  protected vesselInfoFromPanel(
    item: InfoPanelItem & { kind: 'vessel' }
  ): void {
    void this.dialogs.featureProperties({
      id: item.id,
      type: item.isSelf ? 'self' : 'vessel'
    });
  }

  protected aircraftInfoFromPanel(
    item: InfoPanelItem & { kind: 'aircraft' }
  ): void {
    void this.dialogs.featureProperties({ id: item.id, type: 'aircraft' });
  }

  protected atonInfoFromPanel(item: InfoPanelItem & { kind: 'aton' }): void {
    const type = item.id.includes('meteo') ? 'meteo' : 'aton';
    void this.dialogs.featureProperties({ id: item.id, type });
  }

  protected resourceSetInfoFromPanel(
    item: InfoPanelItem & { kind: 'resourceset' }
  ): void {
    void this.dialogs.featureProperties({ id: item.id, type: 'rset' });
  }

  protected modifyResourceSetFromPanel(
    _item: InfoPanelItem & { kind: 'resourceset' }
  ): void {
    this.fbMap?.modifyFeature();
  }

  protected deleteResourceSetFromPanel(
    _item: InfoPanelItem & { kind: 'resourceset' }
  ): void {
    const ov = this.fbMap?.overlay();
    if (ov) {
      this.fbMap?.deleteOverlay(ov);
    }
  }

  protected featureListSelectionFromPanel(event: {
    id: string;
    type?: SKResourceType;
  }): void {
    if (isSKResourceType(event.type)) {
      this.infoPanel.open(event.type, event.id);
    }
  }

  protected chartListSelectionFromPanel(event: {
    id: string;
    selected: boolean;
  }): void {
    this.fbMap?.toggleFeatureSelection(event.id, 'charts');
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

  // Resource info-panel action handlers (notes / regions / routes /
  // waypoints): delegate to the existing fb-map helpers via the
  // ViewChild so the map's overlay state stays the single source of
  // truth.
  protected deleteResourceFromPanel(
    _item: InfoPanelItem & { kind: 'resource' }
  ): void {
    const ov = this.fbMap?.overlay();
    if (ov) {
      this.fbMap?.deleteOverlay(ov);
    }
  }

  protected addNoteFromResource(
    _item: InfoPanelItem & { kind: 'resource' }
  ): void {
    const ov = this.fbMap?.overlay();
    if (ov) {
      this.fbMap?.addNoteFromOverlay(ov);
    }
  }

  protected showRelatedFromResource(id: string): void {
    void this.skres.showRelatedNotes(id, 'group');
  }

  protected showNotesFromResource(
    _item: InfoPanelItem & { kind: 'resource' }
  ): void {
    const ov = this.fbMap?.overlay();
    if (ov) {
      this.fbMap?.showRelatedNotesFromOverlay(ov);
    }
  }

  protected infoFromResource(item: InfoPanelItem & { kind: 'resource' }): void {
    const singular = item.type.endsWith('s')
      ? item.type.slice(0, -1)
      : item.type;
    this.skres.resourceProperties({ id: item.id, type: singular });
  }

  protected pointsFromResource(
    _item: InfoPanelItem & { kind: 'resource' }
  ): void {
    const ov = this.fbMap?.overlay();
    if (ov) {
      this.fbMap?.itemInfoFromOverlay(ov);
    }
  }

  protected activateWaypoint(event: { id: string }): void {
    this.course.navigateToWaypoint(event.id);
  }

  protected clearActiveDestination(): void {
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
        this.closeRight();
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
    this.conn.openStream(options, toMode, true);
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
        this.applyModifyDecision(result as boolean, forSave);
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

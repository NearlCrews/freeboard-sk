/** Application Information Service **
 * Phase 3 Batch 3: AppFacade is now a thin shim over five focused stores
 * under src/app/stores/ (AlarmStore, CourseStore, ResourceStore,
 * SettingsStore, and VesselStore). Existing `app.something` consumers keep
 * working via delegating getters and methods. Direct store injection is the
 * forward path: each new consumer should `inject(SettingsStore)` etc., and
 * the shim will be deleted once all sites migrate.
 * ************************************/
import {
  DestroyRef,
  effect,
  inject,
  Injectable,
  isDevMode
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { MatDialogRef } from '@angular/material/dialog';

import { AppDB, InfoService, AppInfoDef } from './lib/services';
import { WelcomeDialog } from './lib/components/dialogs/common-dialogs';
import { SignalKClient } from 'src/lib/signalk-client';
import { SKWorkerService } from './modules';

import { SI_BASE_UNIT } from './lib/convert';
import type {
  ErrorList,
  IAppConfig,
  Position,
  SKServerUnitPrefs
} from './types';

import {
  cleanConfig,
  defaultConfig,
  initData,
  validateConfig
} from './app.config';

import { getSvgList } from './modules/icons';
import { S57Service } from './modules/map/ol';
import type { LineStyleDash } from './modules/settings/components/linestyle-select.component';
import {
  AlarmStore,
  CourseStore,
  ResourceStore,
  SettingsStore,
  VesselStore
} from './stores';
import {
  isTopWindow,
  parseLaunchUrl,
  readCookie,
  testForInternet,
  type HostDef
} from './app.bootstrap';

interface ParentMessage {
  settings?: { autoNightMode?: boolean };
  commands?: { nightModeEnable?: boolean };
}

// App details
const FSK: AppInfoDef = {
  id: 'freeboard',
  name: 'Freeboard-SK',
  description: `Signal K Chart Plotter.`,
  version: '2.23.0',
  url: 'https://github.com/signalk/freeboard-sk',
  logo: './assets/img/app_logo.png'
};

const SERVER_APPDATA_VERSION = '1.0.0';

// Development SK server host details
const DEV_SERVER = {
  host: 'localhost',
  port: 3000,
  ssl: false
};

@Injectable({ providedIn: 'root' })
export class AppFacade extends InfoService {
  /** Signal K API version to use. */
  public skApiVersion = 2;

  public hostDef: HostDef = {
    name: undefined,
    port: undefined,
    ssl: false,
    url: undefined,
    params: {}
  };

  private AudioContext =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  public audio = { context: new AudioContext() };

  public db = new AppDB();
  public watchingSKLogin = 0;
  public formattedSpeedUnits = '';

  // ----- stores -----
  readonly settings = inject(SettingsStore);
  readonly vessel = inject(VesselStore);
  readonly alarm = inject(AlarmStore);
  readonly resource = inject(ResourceStore);
  readonly course = inject(CourseStore);

  protected signalk = inject(SignalKClient);
  private worker = inject(SKWorkerService);
  private iconReg = inject(MatIconRegistry);
  private dom = inject(DomSanitizer);
  private s57 = inject(S57Service);

  // ----- delegating signal getters (back-compat surface) -----
  get kioskMode() {
    return this.settings.kioskMode;
  }
  get hasAuthToken() {
    return this.settings.hasAuthToken;
  }
  get isLoggedIn() {
    return this.settings.isLoggedIn;
  }
  get instrumentPanelAvailable() {
    return this.settings.instrumentPanelAvailable;
  }
  get skAuthChange() {
    return this.settings.skAuthChange;
  }
  get sIsFetching() {
    return this.settings.sIsFetching;
  }
  get sTrueMagChoice() {
    return this.settings.sTrueMagChoice;
  }
  get instrumentPanel() {
    return this.settings.instrumentPanel;
  }
  get uiCtrl() {
    return this.settings.uiCtrl;
  }
  get uiConfig() {
    return this.settings.uiConfig;
  }
  get featureFlags() {
    return this.settings.featureFlags;
  }
  get serverConfig() {
    return this.settings.serverConfig;
  }
  get selfLines() {
    return this.vessel.selfLines;
  }
  get selfTrail() {
    return this.vessel.selfTrail;
  }
  get selfTrailFromServer() {
    return this.vessel.selfTrailFromServer;
  }
  get mapExtent() {
    return this.vessel.mapExtent;
  }
  get mapViewTopCenter() {
    return this.vessel.mapViewTopCenter;
  }
  get mapViewRightCenter() {
    return this.vessel.mapViewRightCenter;
  }
  get mapViewRotation() {
    return this.vessel.mapViewRotation;
  }

  // MAP_ZOOM_EXTENT keeps the mutable .min / .max shape that
  // resources.service.ts writes through. Backed by the vessel store signal.
  get MAP_ZOOM_EXTENT() {
    return this.vessel.MAP_ZOOM_EXTENT();
  }
  set MAP_ZOOM_EXTENT(v: { min: number; max: number }) {
    this.vessel.MAP_ZOOM_EXTENT.set({ ...v });
  }

  get STANDARD_RESOURCES() {
    return this.resource.STANDARD_RESOURCES;
  }
  get CUSTOM_RESOURCES() {
    return this.resource.CUSTOM_RESOURCES;
  }
  get IGNORE_RESOURCES() {
    return this.resource.IGNORE_RESOURCES;
  }

  get lineDashMap() {
    return this.settings.lineDashMap;
  }
  formatLineDashArray(value: LineStyleDash): number[] | null {
    return this.settings.formatLineDashArray(value);
  }

  constructor() {
    super(FSK);
    this.config = defaultConfig();
    this.data = initData();
    this.suppressPersist = true;

    this.db.dbUpdate$.subscribe((res) => {
      if (!res?.action) return;
      if (res.action === 'db_init') {
        if (res.value && this.config.vessels.trail) {
          this.db.getTrail().then((t) => {
            this.vessel.setSelfTrail(t?.value ?? []);
          });
        }
      } else if (res.action === 'trail_save' && !res.value) {
        this.debug('app.trail.save.error', 'warn');
      }
    });

    this.signalk.setAppId(FSK.id);
    this.signalk.setAppVersion(SERVER_APPDATA_VERSION);

    this.initAppIcons();
    parseLaunchUrl(this.hostDef, this.devMode, DEV_SERVER);
    const launchToken = this.hostDef.params['token'];
    if (launchToken) {
      this.persistToken(launchToken);
    }
    this.kioskMode.set(typeof this.hostDef.params['kiosk'] !== 'undefined');
    this.debug('host:', this.hostDef);

    this.instrumentPanelAvailable.set(isTopWindow());
    if (!isTopWindow()) {
      window.addEventListener('message', (event) => {
        this.parseMessageFromParent(event);
      });
    }

    // Cancel the in-flight reachability probe on facade destroy so the
    // onOffline callback does not fire showAlert -> MatDialog.open after
    // the injector tears down (NG0205 in TestBed).
    const probeAbort = new AbortController();
    inject(DestroyRef).onDestroy(() => probeAbort.abort());
    testForInternet(() => {
      const mapsel = this.config.selections.charts;
      if (
        (mapsel.includes('openstreetmap') || mapsel.includes('openseamap')) &&
        !this.kioskMode()
      ) {
        this.showAlert(
          'Internet Map Service Unavailable: ',
          `Unable to display Open Street / Sea Maps!\n
              Please check your Internet connection or select maps from the local network.\n
              `
        );
      }
    }, probeAbort.signal);

    this.loadConfig();
    this.parseLocalConfig();
    this.formattedSpeedUnits = this.settings.formatSpeed(
      this.config,
      0,
      true
    ) as string;

    effect(() => {
      const ui = this.uiConfig();
      this.debug(`AppFacade.effect().uiConfig`, ui);
      this.config.ui = ui;
      this.saveConfig();
    });
    effect(() => {
      const prefs = this.serverConfig.unitPreferences();
      if (prefs) this.alignUnitPrefs(prefs);
    });
  }

  /** Determine whether InfoPanel is used to display resource details based
   * on the device screen width. */
  public useInfoPanel(): boolean {
    const mediaQuery = window.matchMedia('(max-width: 760px)');
    return !mediaQuery.matches && !this.instrumentPanel().open;
  }

  /** Retrieve unit preferences from the Signal K server. */
  public fetchUnitPrefsFromSKServer(): void {
    this.settings.fetchUnitPrefsFromSKServer();
  }

  /** Process message from parent window to respond to configuration requests. */
  parseMessageFromParent(event: MessageEvent<ParentMessage>): void {
    if (!isDevMode() && event.origin !== this.hostDef.url) {
      this.debug('parseMessageFromParent() - untrusted origin!', event.origin);
      return;
    }
    this.debug('parseMessageFromParent()', event.origin, event.data);
    const { settings, commands } = event.data;
    if (!settings && !commands) {
      this.debug('parseMessageFromParent() - invalid data!');
      return;
    }
    if (typeof settings?.autoNightMode === 'boolean') {
      this.config.display.nightMode = settings.autoNightMode;
      this.uiConfig.update((current) => ({
        ...current,
        autoNightMode: this.config.display.nightMode
      }));
    }
    const forceNightMode = commands?.nightModeEnable;
    if (typeof forceNightMode === 'boolean') {
      this.uiCtrl.update((current) => ({
        ...current,
        forceNightMode
      }));
    }
  }

  private parseLocalConfig(): void {
    cleanConfig(this.config, this.hostDef.params);
    this.s57.init(this.config.map.s57Options);
    this.doPostConfigLoad();
  }

  /** Initialise post-config-load state and emit config$.ready. */
  private doPostConfigLoad(): void {
    this.uiConfig.set(this.config.ui);
    if (this.config.vessels.fixedLocationMode) {
      this.data.vessels.self.position = [
        ...this.config.vessels.fixedPosition
      ] as Position;
      this.data.vessels.showSelf = true;
      this.config.map.center = [...this.config.vessels.fixedPosition];
    }

    const cog = this.config.vessels.selfLines.cog;
    const heading = this.config.vessels.selfLines.heading;
    this.selfLines.set({
      cog: {
        fill: { color: cog.color },
        stroke: {
          color: cog.color,
          width: cog.weight,
          lineDash: this.formatLineDashArray(cog.dash)
        }
      },
      heading: {
        fill: { color: heading.color },
        stroke: {
          color: heading.color,
          width: heading.weight,
          lineDash: this.formatLineDashArray(heading.dash)
        }
      }
    });

    this.sTrueMagChoice.set(this.config.units.headingAttribute);
    this.s57.setOptions(this.config.map.s57Options);
    this.debug('doPostConfigLoad(): emit config$.ready');
    this.emitConfigEvent('ready');
    this.suppressPersist = false;
  }

  /** Retrieve and apply saved config from server. */
  public async loadUserConfigfromServer(): Promise<boolean> {
    return new Promise((resolve) => {
      this.signalk.isLoggedIn().subscribe({
        next: (r: boolean) => {
          this.isLoggedIn.set(r);
          if (!r) {
            this.debug('loadUserConfigfromServer(): Not authenticated.');
            return resolve(false);
          }
          this.signalk.appDataGet('/').subscribe({
            next: (serverSettings: IAppConfig) => {
              if (Object.keys(serverSettings).length === 0) {
                return resolve(false);
              }
              cleanConfig(serverSettings, this.hostDef.params);
              if (validateConfig(serverSettings)) {
                this.config = serverSettings;
                this.doPostConfigLoad();
                this.alignCustomResourcesPaths();
                const prefs = this.serverConfig.unitPreferences();
                if (prefs) this.alignUnitPrefs(prefs);
                this.saveConfig();
              }
              resolve(true);
            },
            error: () => {
              console.info(
                'applicationData: Unable to retrieve settings from server!'
              );
              resolve(false);
            }
          });
        },
        error: () => {
          this.isLoggedIn.set(false);
          this.debug('loadUserConfigfromServer(): loginStatus error.');
          resolve(false);
        }
      });
    });
  }

  /** Align server unit preference settings with FB units config. */
  public alignUnitPrefs(units: SKServerUnitPrefs): void {
    this.settings.alignUnitPrefs(this.config, units);
  }

  /** Initialises Material IconRegistry with custom icons. */
  private initAppIcons(): void {
    getSvgList().forEach((s: { id: string; path: string }) => {
      this.iconReg.addSvgIcon(
        s.id,
        this.dom.bypassSecurityTrustResourceUrl(s.path)
      );
    });
  }

  // ----- auth / cookies -----

  persistToken(value: string | null): void {
    if (value) {
      this.signalk.authToken = value;
      this.worker.postMessage({ cmd: 'auth', options: { token: value } });
      document.cookie = `sktoken=${value}; SameSite=Strict`;
      this.hasAuthToken.set(true);
    } else {
      this.hasAuthToken.set(false);
      (this.signalk as unknown as { authToken: string | null }).authToken =
        null;
      this.isLoggedIn.set(false);
      document.cookie = `sktoken=null; SameSite=Strict; max-age=0;`;
      this.worker.postMessage({ cmd: 'auth', options: { token: null } });
    }
  }

  watchSKLogin(): void {
    if (this.watchingSKLogin) return;
    this.watchingSKLogin = window.setInterval(() => {
      this.skAuthChange.set(readCookie(document.cookie, 'skLoginInfo'));
    }, 2000);
  }

  getFBToken(): string | undefined {
    return readCookie(document.cookie, 'sktoken');
  }

  get useMagnetic(): boolean {
    return this.config.units.headingAttribute === 'navigation.headingMagnetic';
  }

  addToSelfTrail(pt: Position): void {
    this.vessel.addToSelfTrail(pt);
  }

  calcMapCenter(): Position {
    const active = this.data.vessels.active;
    if (!active?.position) {
      return this.config.map.center as Position;
    }
    return this.vessel.calcMapCenter(this.config, {
      position: active.position,
      orientation: active.orientation,
      cogTrue: active.cogTrue,
      headingTrue: active.headingTrue
    });
  }

  alignCustomResourcesPaths(): void {
    this.resource.alignCustomResourcesPaths(this.config, this.skApiVersion);
  }

  override saveConfig(): void {
    super.saveConfig();
    if (this.isLoggedIn()) {
      this.signalk.appDataSet('/', this.config)?.subscribe({
        next: () => this.debug('saveConfig: config saved to server.'),
        error: () => this.debug('saveConfig: Cannot save config to server!')
      });
    }
  }

  // ----- dialog delegates -----

  showHelp(anchor?: string): void {
    window.open(
      `./assets/help/index.html${anchor ? '#' + anchor : ''}`,
      'help'
    );
  }

  showWelcome(
    suppressFirstRun: boolean
  ): MatDialogRef<WelcomeDialog> | undefined {
    return this.alarm.showWelcome(
      suppressFirstRun,
      this.launchStatus.result,
      this.data,
      this.kioskMode()
    );
  }

  showMsgBox(title: string, message: string, btn?: string) {
    return this.alarm.showMsgBox(title, message, btn);
  }

  showAlert(title: string, message: string, btn?: string) {
    return this.alarm.showAlert(title, message, btn);
  }

  showErrorList(errList: ErrorList, btn?: string) {
    return this.alarm.showErrorList(errList, btn);
  }

  showMessage(message: string, sound = false, duration = 5000): void {
    this.alarm.showMessage(message, sound, duration);
  }

  showConfirm(
    message: string,
    title: string,
    btn1?: string,
    btn2?: string,
    checkText?: string
  ) {
    return this.alarm.showConfirm(message, title, btn1, btn2, checkText);
  }

  parseHttpErrorResponse(err: unknown): void {
    this.alarm.parseHttpErrorResponse(err);
  }

  // ----- format delegates -----

  formatValueForDisplay(
    value: number,
    sourceUnit: SI_BASE_UNIT,
    options?: { category?: string; noSymbol?: boolean; precision?: number }
  ): string {
    return this.settings.formatValueForDisplay(
      this.config,
      value,
      sourceUnit,
      options
    );
  }

  formatNumericDisplay(value: number, precision?: number): string {
    return this.settings.formatNumericDisplay(value, precision);
  }

  formatSpeed(value: number | null, asString = false): string | number {
    if (value === null) return asString ? '-.-' : NaN;
    const out = this.settings.formatSpeed(this.config, value, asString);
    this.formattedSpeedUnits = this.settings.formatSpeed(
      this.config,
      0,
      true
    ) as string;
    return out;
  }
}

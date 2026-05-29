import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'src/lib/signalk-client';
import { AppShellService } from './app-shell.service';
import {
  AnchorService,
  FBCustomResourceService,
  SKResourceService,
  SKSTREAM_MODE,
  SKStreamFacade,
  StreamOptions
} from 'src/app/modules';
import {
  LineString,
  MultiLineString,
  NotificationMessage,
  Position,
  UpdateMessage
} from 'src/app/types';
import { compareSemver, parseSemver } from 'src/app/lib/semver';

/**
 * Hooks the host component must register before the controller is wired
 * into the stream. The controller stays out of UI concerns (dialogs and
 * template signals) by calling back through these.
 */
export interface ConnectionHooks {
  /** Re-emit the controller-owned `mode` so the host's template binding stays in sync. */
  onModeChange: (mode: SKSTREAM_MODE) => void;
  /** Re-emit the playback timestamp string for the host's template signal. */
  onPlaybackTimeChange: (time: string | null) => void;
  /** Re-evaluate the host's nav data panel signal after each update. */
  updateNavPanel: () => void;
  /** Show the login dialog when a 401 surfaces inside the controller. */
  showLogin: () => void;
  /** Show settings (called from the first-run welcome dialog). */
  openSettings: () => void;
  /** Show playback settings (called from handlePlaybackClose). */
  showPlaybackSettings: () => void;
  /** Restart the stream in a different mode (handlePlaybackClose realtime branch). */
  requestSwitchMode: (mode: SKSTREAM_MODE, options?: StreamOptions) => void;
}

/**
 * Owns the Signal K server connection, the stream open/close lifecycle,
 * feature discovery, trail logging timer, and the stream-event handlers
 * (onConnect/onClose/onError/onMessage/handleTrailUpdate). Extracted from
 * AppComponent so the host stays under the god-component LOC ceiling and
 * the connection logic can be tested in isolation.
 */
@Injectable({ providedIn: 'root' })
export class SignalKConnectionController {
  private readonly app = inject(AppFacade);
  private readonly signalk = inject(SignalKClient);
  private readonly stream = inject(SKStreamFacade);
  private readonly skres = inject(SKResourceService);
  private readonly skresOther = inject(FBCustomResourceService);
  private readonly shell = inject(AppShellService);
  private readonly anchor = inject(AnchorService);

  public mode: SKSTREAM_MODE = SKSTREAM_MODE.REALTIME;

  private timers: ReturnType<typeof setInterval>[] = [];
  private reconnecting = false;
  private streamOptions: {
    options: StreamOptions | null;
    toMode: SKSTREAM_MODE | null;
  } = { options: null, toMode: null };

  private hooks: ConnectionHooks | null = null;

  registerHooks(hooks: ConnectionHooks): void {
    this.hooks = hooks;
  }

  // ******** PUBLIC API used by AppComponent ********

  fetchResources(): void {
    this.skres.refreshRoutes();
    this.skres.refreshWaypoints();
    this.skres.refreshCharts();
    // notes refresh is triggered via map center change, not here.
    this.skres.refreshRegions();
  }

  fetchAllResources(): void {
    this.fetchResources();
    this.skres.refreshTracks();
    this.skresOther.refreshResourceSetsInBounds();
    this.skresOther.refreshInfoLayers();
  }

  /** Open the SK websocket stream. `restart` closes first; on close the
   *  saved options reopen automatically. */
  openStream(
    options: StreamOptions | null = null,
    toMode: SKSTREAM_MODE = SKSTREAM_MODE.REALTIME,
    restart = false
  ): void {
    if (restart) {
      this.streamOptions = { options, toMode };
      this.stream.close();
      return;
    }
    this.stream.sendConfig(this.app.config);
    this.stream.open(options ?? undefined);
  }

  queryAfterConnect(): void {
    if (parseSemver(String(this.signalk.server.info['version']))?.[0] === 1) {
      this.app.showAlert(
        'Unsupported Server Version:',
        'The connected Signal K server is not supported by this version of Open Binnacle.\n Signal K server version 2 or later is required!'
      );
    }
    this.app.alignCustomResourcesPaths();
    this.signalk.api.getSelf().subscribe({
      next: (r: { name?: string }) => {
        this.stream.post({
          cmd: 'vessel',
          options: { context: 'self', name: r.name ?? '' }
        });
        if (this.app.config.vessels.trailFromServer) {
          this.stream.requestTrailFromServer();
        }
        if (this.app.featureFlags().anchorApi) {
          const selfPos = this.app.data.vessels.self.position;
          this.anchor.queryAnchorStatus(undefined, selfPos ?? undefined);
        }
      },
      error: (err: HttpErrorResponse) => {
        if (err.status && err.status === 401) {
          this.hooks?.showLogin();
        }
        this.app.debug('No vessel data available!');
      }
    });
  }

  /** Connect to the Signal K server. Retries every 5s on failure. */
  connect(): void {
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
                  wr.closed.subscribe((r) => {
                    const result = r as boolean | undefined;
                    if (result) this.hooks?.openSettings();
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
          this.openStream();
        },
        error: () => {
          this.app.showMessage(
            'Unable to contact Signal K server! (Retrying in 5 secs)',
            false,
            5000
          );
          setTimeout(() => this.connect(), 5000);
        }
      });
  }

  /** Tear down timers and close the upstream connection. */
  terminate(): void {
    this.stopTimers();
    this.stream.terminate();
    this.signalk.disconnect();
  }

  // ******** STREAM EVENT HANDLERS ********

  handleConnect(e?: NotificationMessage | UpdateMessage): void {
    this.app.showMessage('Connection Open.', false, 2000);
    this.app.debug(e);
    this.queryAfterConnect();
    this.startTimers();
  }

  handleClose(e?: NotificationMessage | UpdateMessage): void {
    this.app.debug('handleClose: STREAM connection closed...');
    this.app.debug(e);
    this.stopTimers();
    if (e?.result) {
      this.openStream(
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
        this.openStream(this.streamOptions.options ?? undefined, this.mode);
      }, 5000);
    }
  }

  handleError(e?: NotificationMessage | UpdateMessage): void {
    this.app.showMessage('Connection Error!', false, 2000);
    console.warn('Stream Error!', e);
  }

  handleMessage(e: NotificationMessage | UpdateMessage): void {
    if (e.action === 'hello') {
      this.app.debug(e);
      if (e.playback) {
        this.setMode(SKSTREAM_MODE.PLAYBACK);
      } else {
        this.setMode(SKSTREAM_MODE.REALTIME);
        this.stream.subscribe();
      }
      this.app.data.selfId = e.self ?? '';
      return;
    }
    if (e.action === 'update') {
      if (this.mode === SKSTREAM_MODE.PLAYBACK) {
        const d = new Date(e.timestamp);
        this.hooks?.onPlaybackTimeChange(
          `${d.toDateString().slice(4)} ${d.toTimeString().slice(0, 8)}`
        );
      } else {
        this.hooks?.onPlaybackTimeChange(null);
        this.shell.setDarkTheme();
      }
      this.hooks?.updateNavPanel();
    }
  }

  handleTrailUpdate(e: {
    action: string;
    mode: string;
    data: MultiLineString;
  }): void {
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

  // ******** INTERNAL ********

  private setMode(mode: SKSTREAM_MODE): void {
    this.mode = mode;
    this.hooks?.onModeChange(mode);
  }

  private handlePlaybackClose(): void {
    const data = {
      title: 'Connection Closed:',
      buttonText: 'OK',
      message: 'Unable to open Playback connection.'
    };
    this.app
      .showAlert(data.message, data.title, data.buttonText)
      .subscribe(() => {
        if (this.mode === SKSTREAM_MODE.REALTIME) {
          this.hooks?.requestSwitchMode(this.mode);
        } else {
          this.hooks?.showPlaybackSettings();
        }
      });
  }

  private async getFeatures(): Promise<void> {
    const ff = {
      anchorApi: false,
      autopilotApi: false,
      weatherApi: false,
      notificationApi: false,
      playbackApi: false,
      buddyList: false
    };
    this.signalk.get('/signalk/v2/features?enabled=1').subscribe({
      next: (res: {
        apis: string[];
        plugins: { id: string; version: string }[];
      }) => {
        ff.weatherApi = res.apis.includes('weather');
        ff.autopilotApi = res.apis.includes('autopilot');
        ff.notificationApi = res.apis.includes('notifications');
        ff.playbackApi = res.apis.includes('playback');

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
        this.app.featureFlags.update((current) =>
          Object.assign({}, current, ff)
        );
      },
      error: () => {
        this.app.debug('*** Features API not present!');
      }
    });

    this.app.fetchUnitPrefsFromSKServer();

    const rcs = await this.skresOther.initCustomCollections();
    this.app.featureFlags.update((current) => {
      return Object.assign({}, current, rcs);
    });
  }

  private startTimers(): void {
    this.app.debug(`Starting Trail logging timer...`);
    this.timers.push(setInterval(() => this.processTrail(), 5000));
  }

  private stopTimers(): void {
    this.app.debug(`Stopping timers:`);
    this.timers.forEach((t) => clearInterval(t));
    this.timers = [];
  }

  private processTrail(trailData?: LineString): void {
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
}

/**
 * SignalK delta processor (main-thread).
 *
 * Phase 1 (Batch 3) extraction from skstream.worker.ts. This service holds the
 * WebSocket via SKStreamAPI and assembles the SKVessel / SKAtoN / SKSaR /
 * SKAircraft / SKMeteo object graph that SKStreamFacade hands to AppFacade.
 *
 * Off-thread concerns left in the slim worker:
 *   - SimplifyAP autopilot path optimisation.
 *   - Deterministic AIS target TTL eviction (AisExpiryTracker).
 */

import { Subject, Subscription } from 'rxjs';

import { Convert } from 'src/app/lib/convert';
import { Extent, GeoUtils } from 'src/app/lib/geoutils';
import {
  SKAircraft,
  SKAtoN,
  SKMeteo,
  SKSaR,
  SKVessel
} from 'src/app/modules/skresources/resource-classes';
import {
  NotificationMessage,
  PathValue,
  ResourceMessage,
  ResultPayload,
  UpdateMessage
} from 'src/app/types/stream';

import { Alarm, AlarmState, SKStreamAPI } from './stream-api';

const PREF_SOURCE_PATHS = new Set<string>([
  'environment.wind.speedTrue',
  'environment.wind.speedOverGround',
  'environment.wind.angleTrueGround',
  'environment.wind.angleTrueWater',
  'environment.wind.directionTrue',
  'environment.wind.directionMagnetic',
  'navigation.courseOverGroundTrue',
  'navigation.courseOverGroundMagnetic',
  'navigation.headingTrue',
  'navigation.headingMagnetic'
]);

const DEFAULT_AIS_RADIUS = 10_000;
const DEFAULT_EXT_RECALC_BASE_INTERVAL_S = 60;
const WATCHDOG_MAX_EMPTY_INTERVALS = 18;
const DEFAULT_MSG_INTERVAL_MS = 500;
const TRACK_REFRESH_MS = 60_000;

interface AisStatus {
  updated: Record<string, boolean>;
  stale: Record<string, boolean>;
  expired: Record<string, boolean>;
}

interface AisFilter {
  signalk: Record<string, unknown>;
  aisState: string[];
}

interface DeltaUpdate {
  $source?: string;
  timestamp?: string;
  values?: PathValue[];
}

interface SignalKDelta {
  context: string;
  updates?: DeltaUpdate[];
  [k: string]: unknown;
}

type GroupFilter = Map<string, SKVessel | SKSaR | SKAircraft | SKAtoN>;

export interface OpenOptions {
  url: string;
  subscribe?: string;
  token?: string;
  playback?: boolean;
  playbackOptions?: {
    startTime?: string;
    playbackRate?: number;
    subscribe?: string;
  };
}

export interface SettingsOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
  interval?: number;
  playback?: boolean;
}

export interface AlarmOptions {
  raise: boolean;
  type: string;
  message: string;
  state: string;
}

export interface SubscribeOptions {
  context: string;
  path: unknown[];
}

export interface AisExpiryPayload {
  stale: string[];
  expired: string[];
}

/** Sink for AIS expiry messages destined for the slim worker. */
export interface WorkerSink {
  postAisTouch: (ids: string[]) => void;
  postAisRemove: (id: string) => void;
  postAisClear: () => void;
  postAisConfig: (cfg: {
    maxAge?: number;
    staleAge?: number;
    intervalMs?: number;
  }) => void;
}

export interface DeltaProcessorEvents {
  update: Subject<UpdateMessage>;
  notification: Subject<NotificationMessage>;
  resource: Subject<ResourceMessage>;
  connect: Subject<UpdateMessage>;
  close: Subject<UpdateMessage>;
  error: Subject<UpdateMessage>;
  hello: Subject<UpdateMessage>;
  response: Subject<UpdateMessage>;
}

export class SignalKDeltaProcessor {
  // AIS target filter and freshness state live here on the main thread.
  // The slim worker mirrors only target ids so it can fire TTL-based
  // stale and expired notifications back.
  private targetFilter: AisFilter = { signalk: {}, aisState: [] };
  private targetExtent: Extent = [0, 0, 0, 0];
  private extRecalcInterval = DEFAULT_EXT_RECALC_BASE_INTERVAL_S;
  private extRecalcCounter = 0;
  private targetStatus: AisStatus = { updated: {}, stale: {}, expired: {} };

  private preferredPaths: Record<string, string> = {};
  private msgInterval = DEFAULT_MSG_INTERVAL_MS;
  private playbackMode = false;
  private playbackTime = '';
  private aisMgr = {
    maxAge: 540_000,
    staleAge: 360_000,
    maxTrack: 20
  };
  private vesselPrefs: {
    selfLines: { cog: { length: number } };
    aisCogLine: number;
    [k: string]: unknown;
  } = {
    selfLines: { cog: { length: 10 } },
    aisCogLine: 10
  };

  private vessels!: ResultPayload;
  private stream: SKStreamAPI | null = null;
  private skToken = '';
  private subscriptions: Subscription[] = [];
  private timers: ReturnType<typeof setInterval>[] = [];
  private updateReceived = false;
  private apiUrl = '';
  private hasTrackPlugin = false;
  private isFetching = false;
  private $source = '';
  private $timestamp = '';
  private apDeviceId = 'freeboard-sk';
  private watchDog = {
    active: false,
    maxMsgIntervals: WATCHDOG_MAX_EMPTY_INTERVALS,
    intervalCount: 0,
    msgCount: 0,
    alarm: false
  };

  constructor(
    private readonly events: DeltaProcessorEvents,
    private readonly worker: WorkerSink
  ) {
    this.initVessels();
  }

  // ************ public command surface ************

  setAuthToken(token: string | undefined): void {
    if (typeof token === 'string') {
      this.skToken = token;
    }
  }

  setVesselName(opt: { context: string; name?: string } | undefined): void {
    if (!opt || !opt.name) {
      return;
    }
    const v: SKVessel | undefined =
      opt.context === 'self'
        ? this.vessels.self
        : this.vessels.aisTargets.get(opt.context);
    if (v) {
      v.name = opt.name;
    }
  }

  applySettings(opt: SettingsOptions = { config: {} }): void {
    if (typeof opt.interval === 'number') {
      this.msgInterval = opt.interval;
      this.clearTimers();
      this.startTimers();
      this.extRecalcInterval =
        (1 / (this.msgInterval / 1000)) * DEFAULT_EXT_RECALC_BASE_INTERVAL_S;
    }
    this.playbackMode = !!opt.playback;
    if (!opt.config) {
      return;
    }
    if (typeof opt.config['units']?.preferredPaths !== 'undefined') {
      this.preferredPaths = opt.config['units'].preferredPaths;
    }
    if (typeof opt.config['vessels']?.aisMaxAge === 'number') {
      this.aisMgr.maxAge = opt.config['vessels'].aisMaxAge;
    }
    if (typeof opt.config['vessels']?.aisStaleAge === 'number') {
      this.aisMgr.staleAge = opt.config['vessels'].aisStaleAge;
    }
    if (typeof opt.config['signalk']?.maxRadius === 'number') {
      this.targetFilter.signalk = opt.config['signalk'];
    }
    if (Array.isArray(opt.config['selections']?.aisState)) {
      this.targetFilter.aisState = opt.config['selections'].aisState;
    }
    if (opt.config['vessels']) {
      this.vesselPrefs = opt.config['vessels'];
    }
    this.worker.postAisConfig({
      maxAge: this.aisMgr.maxAge,
      staleAge: this.aisMgr.staleAge
    });
  }

  actionAlarm(opt: AlarmOptions): void {
    if (!this.stream) {
      return;
    }
    const n = opt.type.startsWith('notifications.')
      ? opt.type
      : `notifications.${opt.type}`;
    if (opt.raise) {
      this.stream.raiseAlarm(
        'self',
        n,
        new Alarm(opt.message, opt.state as AlarmState, true, true)
      );
    } else {
      this.stream.clearAlarm('self', n);
    }
  }

  subscribe(opt: SubscribeOptions): void {
    this.stream?.subscribe(opt.context, opt.path);
  }

  open(opt: OpenOptions): void {
    if (this.stream) {
      return;
    }
    if (!opt.url) {
      this.events.error.next(
        Object.assign(new UpdateMessage(), {
          action: 'error',
          result: 'Valid options not provided!'
        })
      );
      return;
    }
    // compose apiUrl from ws url
    const u = opt.url.split('/');
    u.pop();
    u.push('api');
    u[0] = u[0] === 'wss:' ? 'https:' : 'http:';
    this.apiUrl = u.join('/');

    this.initVessels();
    this.worker.postAisClear();

    this.stream = new SKStreamAPI();
    this.subscriptions.push(
      this.stream.onConnect.subscribe((r) => this.onStreamConnect(r))
    );
    this.subscriptions.push(
      this.stream.onClose.subscribe(() => this.onStreamClose())
    );
    this.subscriptions.push(
      this.stream.onError.subscribe(() => this.onStreamError())
    );
    this.subscriptions.push(
      this.stream.onMessage.subscribe((r) => this.parseStreamMessage(r))
    );
    this.stream.authToken = this.skToken;

    if (opt.playback) {
      const startTime = opt.playbackOptions?.startTime
        ? `?startTime=${opt.playbackOptions.startTime}`
        : '';
      const rateParam = opt.playbackOptions?.playbackRate
        ? `playbackRate=${opt.playbackOptions.playbackRate}`
        : '';
      const rate = rateParam
        ? startTime
          ? '&' + rateParam
          : '?' + rateParam
        : '';
      this.stream.open(
        `${opt.url}${startTime}${rate}`,
        opt.playbackOptions?.subscribe,
        opt.token
      );
    } else {
      this.stream.open(opt.url, opt.subscribe, opt.token);
      this.getAISTracks();
    }
  }

  close(fromCommand = false): void {
    this.clearTimers();
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions = [];
    if (this.stream && fromCommand) {
      this.stream.close();
    }
    this.stream = null;
    this.worker.postAisClear();
    this.events.close.next(
      Object.assign(new UpdateMessage(), {
        action: 'close',
        result: fromCommand,
        playback: this.playbackMode
      })
    );
  }

  /** Apply ais-expiry events emitted by the slim worker. */
  applyAisExpiry(payload: AisExpiryPayload): void {
    payload.stale.forEach((id) => {
      this.targetStatus.stale[id] = true;
    });
    payload.expired.forEach((id) => {
      this.targetStatus.expired[id] = true;
      this.vessels.aisTargets.delete(id);
      this.vessels.aircraft.delete(id);
      this.vessels.sar.delete(id);
    });
    if (payload.stale.length === 0 && payload.expired.length === 0) {
      return;
    }
    this.postUpdate(true);
  }

  /** Returns the apiUrl derived from the open()'d websocket. */
  getApiUrl(): string {
    return this.apiUrl;
  }

  /** Returns the SKStreamAPI instance for low-level callers (e.g., raiseAlarm). */
  getStream(): SKStreamAPI | null {
    return this.stream;
  }

  /** Current playback flag for downstream messages. */
  isPlayback(): boolean {
    return this.playbackMode;
  }

  // ************ stream lifecycle ************

  private onStreamConnect(msg: Event): void {
    const target = msg?.target as WebSocket | null;
    this.events.connect.next(
      Object.assign(new UpdateMessage(), {
        action: 'open',
        playback: this.playbackMode,
        result: target?.readyState
      })
    );
    this.watchDog.msgCount = 0;
    this.watchDog.intervalCount = 0;
    this.watchDog.alarm = false;
    this.watchDog.active = true;
  }

  private onStreamClose(): void {
    this.close(false);
    this.watchDog.active = false;
  }

  private onStreamError(): void {
    this.events.error.next(
      Object.assign(new UpdateMessage(), {
        action: 'error',
        playback: this.playbackMode,
        result: 'Connection error!'
      })
    );
    this.watchDog.msgCount = 0;
    this.watchDog.intervalCount = 0;
    this.watchDog.active = false;
  }

  // ************ vessels init ************

  private initVessels(): void {
    this.vessels = {
      self: new SKVessel(),
      aisTargets: new Map(),
      aisStatus: { updated: [], stale: [], expired: [] },
      paths: {},
      atons: new Map(),
      aircraft: new Map(),
      sar: new Map(),
      meteo: new Map()
    };
    this.vessels.self.positionReceived = false;
    this.targetStatus = { updated: {}, stale: {}, expired: {} };
  }

  // ************ delta parsing ************

  private parseStreamMessage(data: Record<string, unknown>): void {
    if (!this.stream) {
      return;
    }
    if (this.stream.isHello(data)) {
      this.events.hello.next(
        Object.assign(new UpdateMessage(), {
          action: 'hello',
          result: data,
          self: data['self'],
          playback: this.playbackMode
        })
      );
      if (this.msgInterval) {
        this.startTimers();
      }
      return;
    }
    if (this.stream.isDelta(data)) {
      this.watchDog.msgCount++;
      this.updateReceived = true;
      const touchedAisIds = new Set<string>();
      const delta = data as SignalKDelta;
      const updates = delta.updates ?? [];
      updates.forEach((u: DeltaUpdate) => {
        if (!u.values) {
          return;
        }
        this.$source = u.$source ?? '';
        this.$timestamp = u.timestamp ?? '';
        this.playbackTime = u.timestamp ?? '';
        // Context is set on every well-formed master delta; drop the whole
        // update if a producer sent it without one.
        if (!delta.context) {
          return;
        }
        u.values.forEach((v: PathValue) => {
          this.dispatchValue(delta, v, touchedAisIds);
        });
      });
      if (touchedAisIds.size) {
        this.worker.postAisTouch([...touchedAisIds]);
      }
      this.postUpdate();
      return;
    }
    if (this.stream.isResponse(data)) {
      this.events.response.next(
        Object.assign(new UpdateMessage(), {
          action: 'response',
          result: data
        })
      );
    }
  }

  private dispatchValue(
    data: SignalKDelta,
    v: PathValue,
    touchedAisIds: Set<string>
  ): void {
    // Only position or mmsi deltas count as a "liveness" touch for AIS expiry,
    // matching the legacy worker's `lastUpdated` semantics: heading, SOG, and
    // similar high-cadence telemetry alone do not keep a target alive.
    const isLivenessPath = v.path === 'navigation.position' || v.path === '';
    switch (data.context.split('.')[0]) {
      case 'shore':
      case 'atons':
        if (this.targetFilter?.signalk['atons']) {
          this.processAtoN(data.context, v);
        }
        this.filterContext(
          data.context,
          this.vessels.atons,
          this.targetFilter?.signalk['atons']
        );
        return;
      case 'sar':
        if (this.targetFilter?.signalk['sar']) {
          this.processSaR(data.context, v);
          if (isLivenessPath) {
            touchedAisIds.add(data.context);
          }
        }
        this.filterContext(
          data.context,
          this.vessels.sar,
          this.targetFilter?.signalk['sar']
        );
        return;
      case 'aircraft':
        if (this.targetFilter?.signalk['aircraft']) {
          this.processAircraft(data.context, v);
          if (isLivenessPath) {
            touchedAisIds.add(data.context);
          }
        }
        this.filterContext(
          data.context,
          this.vessels.aircraft,
          this.targetFilter?.signalk['aircraft']
        );
        return;
      case 'meteo':
        if (this.targetFilter?.signalk['meteo']) {
          this.processMeteo(data.context, v);
          this.processNotifications(v);
        }
        this.filterContext(
          data.context,
          this.vessels.meteo,
          this.targetFilter?.signalk['meteo']
        );
        return;
      case 'vessels':
        if (this.stream && this.stream.isSelf(data)) {
          if (!this.vessels.self.id) {
            this.vessels.self.id = data.context;
          }
          this.processVessel(this.vessels.self, v, true);
          this.processNotifications(v);
        } else {
          if (this.targetFilter?.signalk['vessels']) {
            const oVessel = this.selectVessel(data.context);
            this.processVessel(oVessel, v);
            if (isLivenessPath) {
              touchedAisIds.add(data.context);
            }
          }
          this.filterContext(
            data.context,
            this.vessels.aisTargets,
            this.targetFilter?.signalk['vessels'],
            this.targetFilter?.aisState
          );
        }
        return;
    }
  }

  private filterContext(
    context: string,
    group: GroupFilter,
    enabled: unknown = true,
    state: string[] = []
  ): void {
    if (!enabled) {
      if (group.size !== 0) {
        group.forEach((_v, k) => {
          this.targetStatus.expired[k] = true;
        });
        group.clear();
        this.worker.postAisClear();
      }
      return;
    }
    const obj = group.get(context);
    if (!obj) {
      return;
    }
    if (state.includes(obj.state)) {
      this.targetStatus.expired[context] = true;
      this.worker.postAisRemove(context);
      return;
    }
    if (!this.targetFilter.signalk['maxRadius']) {
      this.targetStatus.updated[context] = true;
      return;
    }
    if (
      obj.positionReceived &&
      obj.position &&
      GeoUtils.inBounds(obj.position, this.targetExtent)
    ) {
      this.targetStatus.updated[context] = true;
    } else {
      group.delete(context);
      this.targetStatus.expired[context] = true;
      this.worker.postAisRemove(context);
    }
  }

  // ************ update emission + watchdog ************

  private postUpdate(immediate = false): void {
    if (this.msgInterval && !immediate) {
      return;
    }
    const msg = new UpdateMessage();
    msg.watchDogAlarm = this.watchDog.alarm;
    msg.playback = this.playbackMode;
    this.vessels.aisStatus.updated = Object.keys(this.targetStatus.updated);
    this.vessels.aisStatus.stale = Object.keys(this.targetStatus.stale);
    this.vessels.aisStatus.expired = Object.keys(this.targetStatus.expired);
    msg.result = this.vessels;
    msg.timestamp = this.playbackMode
      ? this.playbackTime
      : this.vessels.self.lastUpdated?.toISOString();
    this.events.update.next(msg);
    this.targetStatus = { updated: {}, stale: {}, expired: {} };
    this.vessels.self.resourceUpdates = [];
    // extent recalc
    if (this.extRecalcCounter === 0) {
      const maxRadius = this.targetFilter?.signalk['maxRadius'];
      if (
        this.vessels.self.positionReceived &&
        this.vessels.self.position &&
        maxRadius &&
        typeof maxRadius === 'number'
      ) {
        this.targetExtent = GeoUtils.calcMapifiedExtent(
          this.vessels.self.position,
          maxRadius
        );
        this.extRecalcCounter++;
      }
    }
    this.extRecalcCounter =
      this.extRecalcCounter >= this.extRecalcInterval
        ? 0
        : this.extRecalcCounter + 1;
  }

  private startTimers(): void {
    if (this.msgInterval) {
      this.timers.push(
        setInterval(() => this.watchDogTick(), this.msgInterval)
      );
    }
    this.timers.push(
      setInterval(() => {
        if (this.hasTrackPlugin) {
          this.getAISTracks();
        }
      }, TRACK_REFRESH_MS)
    );
  }

  private watchDogTick(): void {
    if (this.watchDog.active && !this.watchDog.msgCount) {
      this.watchDog.intervalCount += 1;
      if (this.watchDog.intervalCount >= this.watchDog.maxMsgIntervals) {
        this.watchDog.intervalCount = 0;
        this.watchDog.alarm = true;
        this.postUpdate(true);
      }
    } else {
      this.watchDog.intervalCount = 0;
      this.watchDog.msgCount = 0;
      this.watchDog.alarm = false;
    }
    if (this.updateReceived) {
      this.postUpdate(true);
      this.updateReceived = false;
    }
  }

  private clearTimers(): void {
    this.timers.forEach((t) => clearInterval(t));
    this.timers = [];
  }

  // ************ vessel and AIS object assembly ************

  private selectVessel(id: string): SKVessel {
    let vessel = this.vessels.aisTargets.get(id);
    if (!vessel) {
      vessel = new SKVessel();
      vessel.id = id;
      vessel.position = null;
      this.vessels.aisTargets.set(id, vessel);
    }
    return vessel;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processVessel(d: SKVessel, v: any, isSelf = false): void {
    if (isSelf) {
      d.lastUpdated = new Date();
      if (v.path.startsWith('resources.')) {
        d.resourceUpdates.push(v);
        this.processResourceUpdate(v);
      } else if (v.path.startsWith('navigation.racing')) {
        d.properties[v.path] = v.value;
      } else if (v.path === 'performance.beatAngle') {
        d.performance.beatAngle = v.value;
      } else if (v.path === 'performance.gybeAngle') {
        d.performance.gybeAngle = v.value;
      } else if (v.path.startsWith('navigation.course.')) {
        if (v.path.startsWith('navigation.course.calcValues.')) {
          const p = v.path.split('.').slice(3).join('.');
          d.courseCalcs[p] = v.value;
        } else if (v.path.includes('activeRoute')) {
          d.courseApi['activeRoute'] = v.value;
        } else if (v.path.includes('nextPoint')) {
          d.courseApi['nextPoint'] = v.value;
        } else if (v.path.includes('previousPoint')) {
          d.courseApi['previousPoint'] = v.value;
        } else if (v.path.includes('arrivalCircle')) {
          d.courseApi['arrivalCircle'] = v.value;
        }
      }
      const cp = v.path.includes('course')
        ? v.path.split('.').slice(0, 2).join('.')
        : v.path;
      if (PREF_SOURCE_PATHS.has(cp)) {
        this.vessels.paths[cp] = null;
      }
    } else {
      if (v.path === 'navigation.distanceToSelf') {
        d.distanceToSelf = v.value;
      }
      if (v.path === 'navigation.closestApproach') {
        d.closestApproach = v.value;
      }
    }

    this.applyCommonVesselValue(d, v, isSelf);
  }

  private applyCommonVesselValue(
    d: SKVessel,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    v: any,
    isSelf: boolean
  ): void {
    if (v.path === '') {
      if (typeof v.value.name !== 'undefined') {
        d.name = v.value.name;
      }
      if (typeof v.value.mmsi !== 'undefined') {
        d.mmsi = v.value.mmsi;
        d.lastUpdated = new Date();
      }
      if (typeof v.value.registrations !== 'undefined') {
        d.registrations = v.value.registrations;
      }
      if (typeof v.value.buddy !== 'undefined') {
        d.buddy = v.value.buddy;
      }
      if (typeof v.value.communication !== 'undefined') {
        d.callsignVhf = v.value.communication.callsignVhf ?? '';
        d.callsignHf = v.value.communication.callsignHf ?? '';
      }
    } else if (v.path === 'communication.callsignVhf') {
      d.callsignVhf = v.value;
    } else if (v.path === 'communication.callsignHf') {
      d.callsignHf = v.value;
    } else if (v.path === 'design.aisShipType') {
      d.type = v.value;
    } else if (v.path === 'navigation.position' && v.value) {
      if (
        typeof v.value.latitude === 'undefined' ||
        typeof v.value.longitude === 'undefined'
      ) {
        return;
      }
      d.position = GeoUtils.normaliseCoords([
        v.value.longitude,
        v.value.latitude
      ]);
      d.positionReceived = true;
      d.positionTimestamp = this.$timestamp ?? '';
      d.lastUpdated = new Date();
      if (!isSelf) {
        this.appendTrack(d);
      }
    } else if (v.path === 'navigation.state') {
      d.state = v.value;
    } else if (v.path === 'navigation.speedOverGround') {
      d.sog = v.value;
    } else if (v.path === 'environment.mode') {
      d.environment.mode = v.value;
    } else if (v.path === 'environment.sun') {
      d.environment.sun = v.value;
    } else if (v.path === 'environment.wind.angleApparent') {
      d.wind.awa = v.value;
    } else if (v.path === 'environment.wind.speedApparent') {
      d.wind.aws = v.value;
    } else if (v.path === 'environment.wind.speedTrue') {
      d.wind.speedTrue = v.value;
    } else if (v.path === 'environment.wind.speedOverGround') {
      d.wind.sog = v.value;
    } else if (v.path === 'environment.wind.directionTrue') {
      d.wind.twd = v.value;
    } else if (v.path === 'environment.wind.directionMagnetic') {
      d.wind.mwd = v.value;
    } else if (v.path === 'navigation.anchor.position') {
      d.anchor.position = v.value;
    } else if (v.path === 'navigation.anchor.maxRadius') {
      d.anchor.maxRadius = v.value;
    } else if (v.path === 'navigation.anchor.currentRadius') {
      d.anchor.radius = v.value;
    } else if (
      v.path === 'steering.autopilot.state' &&
      this.$source === this.apDeviceId
    ) {
      d.autopilot.state = v.value;
    } else if (
      v.path === 'steering.autopilot.mode' &&
      this.$source === this.apDeviceId
    ) {
      d.autopilot.mode = v.value;
    } else if (
      v.path === 'steering.autopilot.target' &&
      this.$source === this.apDeviceId
    ) {
      d.autopilot.target = v.value;
    } else if (
      v.path === 'steering.autopilot.engaged' &&
      this.$source === this.apDeviceId
    ) {
      d.autopilot.enabled = v.value;
    } else if (v.path === 'steering.autopilot.defaultPilot') {
      d.autopilot.default = v.value;
      this.apDeviceId = v.value;
    } else if (
      v.path === 'steering.autopilot.availableActions' &&
      this.$source === this.apDeviceId
    ) {
      d.autopilot.availableActions = v.value ?? [];
    } else if (v.path === 'navigation.courseOverGroundTrue') {
      d.cogTrue = v.value;
    } else if (v.path === 'navigation.courseOverGroundMagnetic') {
      d.cogMagnetic = v.value;
    } else if (v.path === 'navigation.headingTrue') {
      d.headingTrue = v.value;
    } else if (v.path === 'navigation.headingMagnetic') {
      d.headingMagnetic = v.value;
    }

    if (
      typeof this.preferredPaths['heading'] !== 'undefined' &&
      v.path === this.preferredPaths['heading']
    ) {
      d.orientation = v.value;
    }
    if (
      typeof this.preferredPaths['tws'] !== 'undefined' &&
      v.path === this.preferredPaths['tws']
    ) {
      d.wind.tws = v.value;
    }
    if (
      typeof this.preferredPaths['twd'] !== 'undefined' &&
      v.path === this.preferredPaths['twd']
    ) {
      d.wind.direction =
        v.path === 'environment.wind.angleTrueGround' ||
        v.path === 'environment.wind.angleTrueWater'
          ? Convert.angleToDirection(v.value, d.orientation ?? 0)
          : v.value;
    }

    this.updateCogVector(d, isSelf);
  }

  private updateCogVector(d: SKVessel, isSelf: boolean): void {
    const cog = d.cogTrue ?? d.cogMagnetic ?? undefined;
    if (typeof cog === 'undefined' || !d.position) {
      return;
    }
    const cogLen = isSelf
      ? this.vesselPrefs.selfLines.cog.length
      : this.vesselPrefs.aisCogLine;
    const cvlen = (d.sog ?? 0) * (cogLen * 60);
    const lon = d.position[0];
    const lat = d.position[1];
    const last = d.cogVecKey;
    if (
      !last ||
      last[0] !== lon ||
      last[1] !== lat ||
      last[2] !== cog ||
      last[3] !== cvlen
    ) {
      d.vectors.cog = [
        d.position,
        GeoUtils.rhumbDestination(d.position, cog, cvlen)
      ];
      d.cogVecKey = [lon, lat, cog, cvlen];
    }
  }

  private processResourceUpdate(v: PathValue): void {
    const msg = new ResourceMessage();
    msg.playback = this.playbackMode;
    msg.result = {
      path: v.path,
      value: v.value,
      sourceRef: this.$source
    } as never;
    this.events.resource.next(msg);
  }

  private processNotifications(v: PathValue): void {
    if (!v.path.startsWith('notifications.')) {
      return;
    }
    const msg = new NotificationMessage();
    msg.playback = this.playbackMode;
    msg.result = {
      path: v.path,
      value: v.value,
      sourceRef: this.$source
    } as never;
    this.events.notification.next(msg);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processAtoN(id: string, v: any): string {
    const isBaseStation = id.includes('shore.basestations');
    if (!this.vessels.atons.has(id)) {
      const aton = new SKAtoN();
      aton.id = id;
      aton.position = null;
      aton.type.id = null;
      if (isBaseStation) {
        aton.type.id = -2;
        aton.type.name = 'Basestation';
      }
      this.vessels.atons.set(id, aton);
    }
    const d = this.vessels.atons.get(id);
    if (!d) {
      return id;
    }
    if (v.path === '') {
      if (typeof v.value.name !== 'undefined') {
        d.name = v.value.name;
      }
      if (typeof v.value.mmsi !== 'undefined') {
        d.mmsi = v.value.mmsi;
      }
      if (typeof v.value.atonType !== 'undefined') {
        d.type = v.value.atonType;
      }
    } else if (v.path === 'atonType') {
      d.type = v.value;
    } else if (v.path === 'virtual') {
      d.virtual = v.value;
    } else if (v.path === 'navigation.position') {
      d.position = [v.value.longitude, v.value.latitude];
      d.positionReceived = true;
    } else {
      d.properties[v.path] = v.value;
    }
    return id;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processSaR(id: string, v: any): void {
    if (!this.vessels.sar.has(id)) {
      const sar = new SKSaR();
      sar.id = id;
      sar.position = null;
      sar.type.id = -1;
      sar.type.name = 'SaR Beacon';
      this.vessels.sar.set(id, sar);
    }
    const d = this.vessels.sar.get(id);
    if (!d) {
      return;
    }
    if (v.path === '') {
      if (typeof v.value.name !== 'undefined') {
        d.name = v.value.name;
      }
      if (typeof v.value.mmsi !== 'undefined') {
        d.mmsi = v.value.mmsi;
      }
      if (typeof v.value.communication !== 'undefined') {
        d.callsignVhf = v.value.communication.callsignVhf ?? '';
        d.callsignHf = v.value.communication.callsignHf ?? '';
      }
    } else if (v.path === 'communication.callsignVhf') {
      d.callsignVhf = v.value;
    } else if (v.path === 'communication.callsignHf') {
      d.callsignHf = v.value;
    } else if (v.path === 'navigation.position' && v.value) {
      d.position = GeoUtils.normaliseCoords([
        v.value.longitude,
        v.value.latitude
      ]);
      d.positionReceived = true;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processMeteo(id: string, v: any): void {
    if (!this.vessels.meteo.has(id)) {
      const meteo = new SKMeteo();
      meteo.id = id;
      meteo.position = null;
      meteo.type.id = -1;
      meteo.type.name = 'Weather Station';
      this.vessels.meteo.set(id, meteo);
    }
    const d = this.vessels.meteo.get(id);
    if (!d) {
      return;
    }
    if (v.path === '') {
      if (typeof v.value.name !== 'undefined') {
        d.name = v.value.name;
      }
      if (typeof v.value.mmsi !== 'undefined') {
        const nid = id.split(':').slice(-2);
        d.mmsi = nid.length === 2 ? `${nid[0]}:${nid[1]}` : v.value.mmsi;
      }
      if (typeof v.value.communication !== 'undefined') {
        d.callsignVhf = v.value.communication.callsignVhf ?? '';
        d.callsignHf = v.value.communication.callsignHf ?? '';
      }
    } else if (v.path === 'communication.callsignVhf') {
      d.callsignVhf = v.value;
    } else if (v.path === 'communication.callsignHf') {
      d.callsignHf = v.value;
    } else if (v.path === 'environment.outside.temperature') {
      d.temperature = v.value;
    } else if (v.path === 'environment.wind.directionTrue') {
      d.twd = v.value;
    } else if (v.path === 'environment.wind.averageSpeed') {
      d.tws = v.value;
    } else if (v.path === 'navigation.position' && v.value) {
      d.position = GeoUtils.normaliseCoords([
        v.value.longitude,
        v.value.latitude
      ]);
      d.positionReceived = true;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private processAircraft(id: string, v: any): void {
    if (!this.vessels.aircraft.has(id)) {
      const aircraft = new SKAircraft();
      aircraft.id = id;
      aircraft.position = null;
      this.vessels.aircraft.set(id, aircraft);
    }
    const d = this.vessels.aircraft.get(id);
    if (!d) {
      return;
    }
    if (v.path === '') {
      if (typeof v.value.name !== 'undefined') {
        d.name = v.value.name;
      }
      if (typeof v.value.mmsi !== 'undefined') {
        d.mmsi = v.value.mmsi;
      }
      if (typeof v.value.communication !== 'undefined') {
        d.callsignVhf = v.value.communication.callsignVhf ?? '';
        d.callsignHf = v.value.communication.callsignHf ?? '';
      }
    } else if (v.path === 'communication.callsignVhf') {
      d.callsignVhf = v.value;
    } else if (v.path === 'communication.callsignHf') {
      d.callsignHf = v.value;
    } else if (v.path === 'navigation.position' && v.value) {
      d.position = GeoUtils.normaliseCoords([
        v.value.longitude,
        v.value.latitude
      ]);
      d.positionReceived = true;
      this.appendTrack(d);
    } else if (v.path === 'navigation.courseOverGroundTrue') {
      d.orientation = v.value;
    } else if (v.path === 'navigation.speedOverGround') {
      d.sog = v.value;
    }
  }

  private appendTrack(d: SKAircraft | SKVessel): void {
    if (!d.position) return;
    const pos = d.position;
    if (d.track.length === 0) {
      d.track.push([pos]);
    } else {
      const lastSegment = d.track[d.track.length - 1]!;
      const lastPoint = lastSegment[lastSegment.length - 1]!;
      if (lastPoint[0] !== pos[0] && lastPoint[1] !== pos[1]) {
        lastSegment.push(pos);
      }
    }
    const lastIdx = d.track.length - 1;
    d.track[lastIdx] = d.track[lastIdx]!.slice(0 - this.aisMgr.maxTrack);
  }

  // ************ AIS track refresh ************

  // Returns undefined synchronously when a request is already in flight so the
  // caller can short-circuit; otherwise returns the parsed JSON promise.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private apiGet(url: string): Promise<any> | undefined {
    if (this.isFetching) {
      return undefined;
    }
    this.isFetching = true;
    return fetch(url)
      .then((r) => {
        // fetch() resolves on HTTP errors; only network failures reject.
        // Reject explicitly so callers' .catch() runs (apiGet is used to
        // probe optional server endpoints like /tracks; a 404 means the
        // plugin is not installed, not "we got data shaped like
        // anything").
        if (!r.ok) {
          throw new Error(`HTTP ${r.status} from ${url}`);
        }
        return r.json();
      })
      .finally(() => {
        this.isFetching = false;
      });
  }

  private getAISTracks(): void {
    const raw = this.targetFilter?.signalk?.['maxRadius'];
    const radius = typeof raw === 'number' ? raw : DEFAULT_AIS_RADIUS;
    // radius=0 means "filter out everything", so the probe would return
    // an empty object even when the tracks plugin IS installed. Skip
    // the network round-trip and the visible-in-DevTools 404 noise that
    // results when no plugin is installed at all.
    if (!Number.isFinite(radius) || radius <= 0) {
      this.hasTrackPlugin = false;
      return;
    }
    const promise = this.apiGet(`${this.apiUrl}/tracks?radius=${radius}`);
    if (!promise) {
      return;
    }
    promise
      .then((r: Record<string, { coordinates: [number, number][][] }>) => {
        this.hasTrackPlugin = true;
        for (const [id, payload] of Object.entries(r)) {
          const v = this.vessels.aisTargets.get(id);
          if (v) {
            v.track = payload.coordinates;
            this.appendTrack(v);
          }
        }
      })
      .catch(() => {
        this.hasTrackPlugin = false;
      });
  }
}

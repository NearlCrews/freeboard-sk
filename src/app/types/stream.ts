/** Signal K Types */

import type { SKPosition } from './resources/signalk';

// Notification types
export enum ALARM_STATE {
  nominal = 'nominal',
  normal = 'normal',
  alert = 'alert',
  warn = 'warn',
  alarm = 'alarm',
  emergency = 'emergency'
}

export enum ALARM_METHOD {
  visual = 'visual',
  sound = 'sound'
}

export interface SKNotification {
  state: ALARM_STATE;
  method: ALARM_METHOD[];
  message: string;
  status?: {
    silenced: boolean;
    acknowledged: boolean;
    canSilence: boolean;
    canAcknowledge: boolean;
    canClear: boolean;
  };
  position?: SKPosition;
  createdAt?: string;
  id?: string;
}

// Update Deltas
export interface PathValue {
  path: string;
  value: object | number | string | null | Notification | boolean;
}

export interface ActionResult {
  state: 'COMPLETED' | 'PENDING' | 'FAILED';
  statusCode?: number;
  message?: string;
  timestamp?: string;
}

/***************** */

import {
  SKVessel,
  SKAtoN,
  SKAircraft,
  SKSaR,
  SKMeteo
} from 'src/app/modules/skresources/resource-classes';

type AisIds = string[];

interface WorkerMessageBase {
  action: string;
  playback: boolean;
  // result is heterogeneous across delta/notification/resource messages;
  // call sites narrow. Tightening to a closed union is Phase 6 work.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
  self: string | null;
  timestamp: string;
}

export interface ResourceDeltaSignal {
  path: string;
  value: unknown;
  sourceRef?: string;
}

export interface ResultPayload {
  self: SKVessel;
  aisTargets: Map<string, SKVessel>;
  aisStatus: {
    updated: AisIds;
    stale: AisIds;
    expired: AisIds;
  };
  paths: Record<string, string | null>;
  atons: Map<string, SKAtoN>;
  aircraft: Map<string, SKAircraft>;
  sar: Map<string, SKSaR>;
  meteo: Map<string, SKMeteo>;
}

export class NotificationMessage implements WorkerMessageBase {
  action = 'notification';
  playback = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any = null;
  self: string | null = null;
  timestamp = new Date().toISOString();
  sourceRef!: string;
}

export class UpdateMessage implements WorkerMessageBase {
  action: string;
  playback = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any = null;
  timestamp = '';
  self: string | null = null;
  watchDogAlarm = false;

  constructor() {
    this.action = 'update';
  }
}

export class ResourceMessage extends UpdateMessage {
  constructor() {
    super();
    this.action = 'resource';
  }
}

export class TrailMessage extends UpdateMessage {
  constructor() {
    super();
    this.action = 'trail';
  }
}

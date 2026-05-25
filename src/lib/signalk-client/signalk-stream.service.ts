// Vendored from signalk-client-angular ^2.1.0 (Apache 2.0, AdrianP).
// Pure ESM, named exports, tree-shakable.
//
// Loose response types preserved during inline. Phase 6 (TS strict ratchet)
// will tighten the public surface. See MODERNIZATION_ROADMAP.md.

/* eslint-disable
   @typescript-eslint/no-explicit-any,
   @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-member-access,
   @typescript-eslint/no-unsafe-argument
*/

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';

import type { Alarm } from './alarm';
import { Message } from './message';
import type { AlarmType } from './types';

const MIN_WS_TIMEOUT_MS = 3000;
const MAX_WS_TIMEOUT_MS = 60000;
const DEFAULT_WS_TIMEOUT_MS = 20000;
const WS_READY_OPEN = 1;
const WS_READY_CLOSED = 3;

interface StreamSource {
  label?: string;
  [key: string]: unknown;
}

interface SubscribeOptions {
  period?: number;
  minPeriod?: number;
  format?: 'delta' | 'full';
  policy?: 'instant' | 'ideal' | 'fixed';
}

@Injectable({ providedIn: 'root' })
export class SignalKStream {
  private readonly _connect = new Subject<any>();
  private readonly _close = new Subject<any>();
  private readonly _error = new Subject<any>();
  private readonly _message = new Subject<any>();
  private ws: WebSocket | null = null;
  private _filter = '';
  private _wsTimeout = DEFAULT_WS_TIMEOUT_MS;
  private _token = '';
  private _playbackMode = false;

  readonly onConnect: Observable<any> = this._connect.asObservable();
  readonly onClose: Observable<any> = this._close.asObservable();
  readonly onError: Observable<any> = this._error.asObservable();
  readonly onMessage: Observable<any> = this._message.asObservable();

  version = 1;
  endpoint = '';
  selfId = '';
  _source: StreamSource | null = null;

  // Set source label for use in messages.
  set source(val: string) {
    if (!this._source) {
      this._source = {};
    }
    this._source.label = val;
  }

  set authToken(val: string) {
    this._token = val;
  }

  // Get / set the WebSocket connection timeout: clamped to [3000, 60000].
  get connectionTimeout(): number {
    return this._wsTimeout;
  }

  set connectionTimeout(val: number) {
    if (val < MIN_WS_TIMEOUT_MS) {
      this._wsTimeout = MIN_WS_TIMEOUT_MS;
    } else if (val > MAX_WS_TIMEOUT_MS) {
      this._wsTimeout = MAX_WS_TIMEOUT_MS;
    } else {
      this._wsTimeout = val;
    }
  }

  // Is the WebSocket stream connected?
  get isOpen(): boolean {
    return !!(
      this.ws &&
      this.ws.readyState !== WS_READY_OPEN &&
      this.ws.readyState !== WS_READY_CLOSED
    );
  }

  // Get / set filter to select delta messages for the supplied vessel id.
  get filter(): string {
    return this._filter;
  }

  // Set filter = null to remove message filtering.
  set filter(id: string) {
    if (id && id.includes('self')) {
      this._filter = this.selfId ? this.selfId : '';
    } else {
      this._filter = id;
    }
  }

  // Returns true on a Playback Hello message.
  get playbackMode(): boolean {
    return this._playbackMode;
  }

  // Close the WebSocket connection.
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Open a WebSocket at the provided URL.
  open(url?: string, subscribe?: string, token?: string): void {
    let target = url ? url : this.endpoint;
    if (!target) {
      return;
    }
    const q = target.includes('?') ? '&' : '?';
    if (subscribe) {
      target += `${q}subscribe=${subscribe}`;
    }
    if (this._token || token) {
      target += `${subscribe ? '&' : '?'}token=${this._token || token}`;
    }
    this.close();
    this.ws = new WebSocket(target);
    // Start connection watchdog.
    setTimeout(() => {
      if (
        this.ws &&
        this.ws.readyState !== WS_READY_OPEN &&
        this.ws.readyState !== WS_READY_CLOSED
      ) {
        console.warn(
          `Connection watchdog expired (${this._wsTimeout / 1000} sec): ${this.ws.readyState}... aborting connection...`
        );
        this.close();
      }
    }, this._wsTimeout);
    this.ws.onopen = (e: Event) => {
      this._connect.next(e);
    };
    this.ws.onclose = (e: CloseEvent) => {
      this._close.next(e);
    };
    this.ws.onerror = (e: Event) => {
      this._error.next(e);
    };
    this.ws.onmessage = (e: MessageEvent) => {
      this.parseOnMessage(e);
    };
  }

  // Parse a received message.
  private parseOnMessage(e: MessageEvent): void {
    let data: any;
    if (typeof e.data === 'string') {
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
    }
    if (this.isHello(data)) {
      this.selfId = data.self;
      this._playbackMode = typeof data.startTime !== 'undefined';
      this._message.next(data);
    } else if (this.isResponse(data)) {
      if (typeof data.login !== 'undefined') {
        if (typeof data.login.token !== 'undefined') {
          this._token = data.login.token;
        }
      }
      this._message.next(data);
    } else if (this._filter && this.isDelta(data)) {
      if (data.context === this._filter) {
        this._message.next(data);
      }
    } else {
      this._message.next(data);
    }
  }

  // Send a request via the Delta stream.
  sendRequest(value: any): string {
    if (typeof value !== 'object' || value === null) {
      return '';
    }
    const msg: Record<string, any> = Message.request();
    if (typeof value.login === 'undefined' && this._token) {
      msg.token = this._token;
    }
    for (const k of Object.keys(value)) {
      msg[k] = value[k];
    }
    this.send(msg);
    return msg.requestId as string;
  }

  // Send a PUT request via the Delta stream.
  put(context: string, path: string, value: any): string {
    const msg = {
      context: context === 'self' ? 'vessels.self' : context,
      put: { path, value }
    };
    return this.sendRequest(msg);
  }

  // Get an auth token for the supplied user details.
  login(username: string, password: string): string {
    const msg = {
      login: { username, password }
    };
    return this.sendRequest(msg);
  }

  // Send data to the Signal K stream.
  send(data: any): void {
    if (this.ws) {
      const payload = typeof data === 'object' ? JSON.stringify(data) : data;
      this.ws.send(payload);
    }
  }

  sendUpdate(context: string, path: any[]): void;
  sendUpdate(context: string, path: string, value: any): void;
  sendUpdate(context = 'self', path: string | any[], value?: any): void {
    const val: Record<string, any> = Message.updates();
    if (this._token) {
      val.token = this._token;
    }
    val.context = context === 'self' ? 'vessels.self' : context;
    if (this._token) {
      val.token = this._token;
    }
    let uValues: any[] = [];
    if (typeof path === 'string') {
      uValues.push({ path, value });
    }
    if (typeof path === 'object' && Array.isArray(path)) {
      uValues = path;
    }
    const u: Record<string, any> = {
      timestamp: new Date().toISOString(),
      values: uValues
    };
    if (this._source) {
      u.source = this._source;
    }
    (val.updates as any[]).push(u);
    this.send(val);
  }

  subscribe(context: string, path: any[]): void;
  subscribe(context: string, path: string, options?: any): void;
  subscribe(
    context = '*',
    path: string | any[] = '*',
    options?: SubscribeOptions
  ): void {
    const val: Record<string, any> = Message.subscribe();
    if (this._token) {
      val.token = this._token;
    }
    val.context = context === 'self' ? 'vessels.self' : context;
    if (this._token) {
      val.token = this._token;
    }
    if (typeof path === 'object' && Array.isArray(path)) {
      val.subscribe = path;
    }
    if (typeof path === 'string') {
      const sValue: Record<string, any> = { path };
      if (options && typeof options === 'object') {
        if (options.period) {
          sValue.period = options.period;
        }
        if (options.minPeriod) {
          // Parity with original: minPeriod source uses options.period.
          sValue.minPeriod = options.period;
        }
        if (
          options.format &&
          (options.format === 'delta' || options.format === 'full')
        ) {
          sValue.format = options.format;
        }
        if (
          options.policy &&
          (options.policy === 'instant' ||
            options.policy === 'ideal' ||
            options.policy === 'fixed')
        ) {
          sValue.policy = options.policy;
        }
      }
      (val.subscribe as any[]).push(sValue);
    }
    this.send(val);
  }

  // Unsubscribe from Delta stream messages.
  unsubscribe(context = '*', path: any = '*'): void {
    const val: Record<string, any> = Message.unsubscribe();
    if (this._token) {
      val.token = this._token;
    }
    val.context = context === 'self' ? 'vessels.self' : context;
    if (this._token) {
      val.token = this._token;
    }
    if (typeof path === 'object' && Array.isArray(path)) {
      val.unsubscribe = path;
    }
    if (typeof path === 'string') {
      (val.unsubscribe as any[]).push({ path });
    }
    this.send(val);
  }

  raiseAlarm(context: string, name: string, alarm: Alarm): void;
  raiseAlarm(context: string, type: AlarmType, alarm: Alarm): void;
  raiseAlarm(context = '*', alarmId: string | AlarmType, alarm: Alarm): void {
    let path: string;
    if (typeof alarmId === 'string') {
      path = alarmId.includes('notifications.')
        ? alarmId
        : `notifications.${alarmId}`;
    } else {
      path = alarmId;
    }
    this.put(context, path, alarm.value);
  }

  // Clear alarm for path.
  clearAlarm(context = '*', name: string): void {
    const path = name.includes('notifications.')
      ? name
      : `notifications.${name}`;
    this.put(context, path, null);
  }

  // Returns true if the message context is 'self'.
  isSelf(msg: any): boolean {
    return msg.context === this.selfId;
  }

  // Returns true if the message is a Delta message.
  isDelta(msg: any): boolean {
    return typeof msg.context !== 'undefined';
  }

  // Returns true if the message is a Hello message.
  isHello(msg: any): boolean {
    return (
      typeof msg.version !== 'undefined' && typeof msg.self !== 'undefined'
    );
  }

  // Returns true if the message is a request Response message.
  isResponse(msg: any): boolean {
    return typeof msg.requestId !== 'undefined';
  }
}

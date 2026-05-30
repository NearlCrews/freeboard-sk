import { Subject, Observable } from 'rxjs';
import * as uuid from 'uuid';

type SKMessage = Record<string, unknown>;

export class SKStreamAPI {
  private _connect: Subject<Event>;
  private _close: Subject<CloseEvent>;
  private _error: Subject<Event>;
  private _message: Subject<SKMessage>;

  private ws: WebSocket | null = null;
  private _filter = '';
  private _wsTimeout = 20000;
  private _token = '';
  private _playbackMode = false;

  public onConnect: Observable<Event>;
  public onClose: Observable<CloseEvent>;
  public onError: Observable<Event>;
  public onMessage: Observable<SKMessage>;

  public version = 1;
  public endpoint = '';
  public selfId = '';
  public _source: Record<string, string> | null = null;

  set source(val: string) {
    if (!this._source) {
      this._source = {};
    }
    this._source['label'] = val;
  }

  set authToken(val: string) {
    this._token = val;
  }
  get connectionTimeout(): number {
    return this._wsTimeout;
  }
  set connectionTimeout(val: number) {
    this._wsTimeout = val < 3000 ? 3000 : val > 60000 ? 60000 : val;
  }
  get isOpen(): boolean {
    return this.ws && this.ws.readyState !== 1 && this.ws.readyState !== 3
      ? true
      : false;
  }
  get filter(): string {
    return this._filter;
  }
  set filter(id: string) {
    if (id && id.includes('self')) {
      this._filter = this.selfId ? this.selfId : '';
    } else {
      this._filter = id;
    }
  }
  get playbackMode(): boolean {
    return this._playbackMode;
  }

  constructor() {
    this._connect = new Subject<Event>();
    this.onConnect = this._connect.asObservable();
    this._close = new Subject<CloseEvent>();
    this.onClose = this._close.asObservable();
    this._error = new Subject<Event>();
    this.onError = this._error.asObservable();
    this._message = new Subject<SKMessage>();
    this.onMessage = this._message.asObservable();
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  open(url: string, subscribe?: string, token?: string) {
    url = url ? url : this.endpoint;
    if (!url) {
      return;
    }
    const q = url.includes('?') ? '&' : '?';
    if (subscribe) {
      url += `${q}subscribe=${subscribe}`;
    }
    if (this._token || token) {
      url += `${subscribe ? '&' : '?'}token=${this._token || token}`;
    }

    this.close();
    this.ws = new WebSocket(url);
    setTimeout(() => {
      if (this.ws && this.ws.readyState !== 1 && this.ws.readyState !== 3) {
        console.warn(
          `Connection watchdog expired (${this._wsTimeout / 1000} sec): ${
            this.ws.readyState
          }... aborting connection...`
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

  private parseOnMessage(e: MessageEvent) {
    let data: SKMessage | undefined;
    if (typeof e.data === 'string') {
      try {
        data = JSON.parse(e.data) as SKMessage;
      } catch {
        return;
      }
    }
    if (!data) {
      return;
    }
    if (this.isHello(data)) {
      this.selfId = (data['self'] as string) ?? '';
      this._playbackMode = typeof data['startTime'] !== 'undefined';
      this._message.next(data);
    } else if (this.isResponse(data)) {
      const login = data['login'] as { token?: string } | undefined;
      if (login && typeof login.token !== 'undefined') {
        this._token = login.token;
      }
      this._message.next(data);
    } else if (this._filter && this.isDelta(data)) {
      if (data['context'] === this._filter) {
        this._message.next(data);
      }
    } else {
      this._message.next(data);
    }
  }

  sendRequest(value: SKMessage): string {
    if (typeof value !== 'object') {
      return '';
    }
    const msg: SKMessage = Message.request();
    if (typeof value['login'] === 'undefined' && this._token) {
      msg['token'] = this._token;
    }
    Object.keys(value).forEach((k) => {
      msg[k] = value[k];
    });
    this.send(msg);
    return msg['requestId'] as string;
  }

  put(context: string, path: string, value: unknown): string {
    const msg = {
      context: context === 'self' ? 'vessels.self' : context,
      put: { path: path, value: value }
    };
    return this.sendRequest(msg);
  }

  login(username: string, password: string) {
    const msg = {
      login: { username: username, password: password }
    };
    return this.sendRequest(msg);
  }

  send(data: unknown) {
    if (this.ws) {
      const payload =
        typeof data === 'object' ? JSON.stringify(data) : (data as string);
      this.ws.send(payload);
    }
  }

  sendUpdate(context: string, path: unknown[]): void;
  sendUpdate(context: string, path: string, value: unknown): void;
  sendUpdate(
    context = 'self',
    path: string | unknown[],
    value?: unknown
  ): void {
    const val: SKMessage = Message.updates();
    if (this._token) {
      val['token'] = this._token;
    }
    val['context'] = context === 'self' ? 'vessels.self' : context;

    let uValues: unknown[] = [];
    if (typeof path === 'string') {
      uValues.push({ path: path, value: value });
    }
    if (typeof path === 'object' && Array.isArray(path)) {
      uValues = path;
    }
    const u: SKMessage = {
      timestamp: new Date().toISOString(),
      values: uValues
    };
    if (this._source) {
      u['source'] = this._source;
    }
    (val['updates'] as unknown[]).push(u);
    this.send(val);
  }

  subscribe(context: string, path: unknown[]): void;
  subscribe(context: string, path: string, options?: SKMessage): void;
  subscribe(
    context = '*',
    path: string | unknown[] = '*',
    options?: SKMessage
  ): void {
    const val: SKMessage = Message.subscribe();
    if (this._token) {
      val['token'] = this._token;
    }
    val['context'] = context === 'self' ? 'vessels.self' : context;

    if (typeof path === 'object' && Array.isArray(path)) {
      val['subscribe'] = path;
    }
    if (typeof path === 'string') {
      const sValue: SKMessage = { path };
      if (options && typeof options === 'object') {
        if (options['period']) {
          sValue['period'] = options['period'];
        }
        if (options['minPeriod']) {
          sValue['minPeriod'] = options['minPeriod'];
        }
        if (
          options['format'] &&
          (options['format'] === 'delta' || options['format'] === 'full')
        ) {
          sValue['format'] = options['format'];
        }
        if (
          options['policy'] &&
          (options['policy'] === 'instant' ||
            options['policy'] === 'ideal' ||
            options['policy'] === 'fixed')
        ) {
          sValue['policy'] = options['policy'];
        }
      }
      (val['subscribe'] as unknown[]).push(sValue);
    }
    this.send(val);
  }

  unsubscribe(context = '*', path: string | unknown[] = '*') {
    const val: SKMessage = Message.unsubscribe();
    if (this._token) {
      val['token'] = this._token;
    }
    val['context'] = context === 'self' ? 'vessels.self' : context;

    if (typeof path === 'object' && Array.isArray(path)) {
      val['unsubscribe'] = path;
    }
    if (typeof path === 'string') {
      (val['unsubscribe'] as unknown[]).push({ path: path });
    }
    this.send(val);
  }

  raiseAlarm(context: string, name: string, alarm: Alarm): void;
  raiseAlarm(context: string, type: AlarmType, alarm: Alarm): void;
  raiseAlarm(context = '*', alarmId: string | AlarmType, alarm: Alarm): void {
    const path = alarmId.startsWith('notifications.')
      ? alarmId
      : `notifications.${alarmId}`;
    this.put(context, path, alarm.value);
  }

  clearAlarm(context = '*', name: string) {
    const path = name.startsWith('notifications.')
      ? name
      : `notifications.${name}`;
    this.put(context, path, null);
  }

  isSelf(msg: SKMessage): boolean {
    return msg['context'] === this.selfId;
  }
  isDelta(msg: SKMessage): boolean {
    return typeof msg['context'] !== 'undefined';
  }
  isHello(msg: SKMessage): boolean {
    return (
      typeof msg['version'] !== 'undefined' &&
      typeof msg['self'] !== 'undefined'
    );
  }
  isResponse(msg: SKMessage): boolean {
    return typeof msg['requestId'] !== 'undefined';
  }
}

export class Message {
  static updates(): SKMessage {
    return {
      context: null,
      updates: []
    };
  }
  static subscribe(): SKMessage {
    return {
      context: null,
      subscribe: []
    };
  }
  static unsubscribe(): SKMessage {
    return {
      context: null,
      unsubscribe: []
    };
  }
  static request(): SKMessage {
    return {
      requestId: uuid.v4()
    };
  }
}

export class Alarm {
  private _state: AlarmState;
  private _method: AlarmMethod[] = [];
  private _message = '';

  constructor(
    message: string,
    state?: AlarmState,
    visual?: boolean,
    sound?: boolean
  ) {
    this._message = typeof message !== 'undefined' ? message : '';
    this._state = typeof state !== 'undefined' ? state : AlarmState.alarm;
    if (visual) {
      this._method.push(AlarmMethod.visual);
    }
    if (sound) {
      this._method.push(AlarmMethod.sound);
    }
  }

  get value() {
    return {
      message: this._message,
      state: this._state,
      method: this._method
    };
  }
}

export enum AlarmState {
  nominal = 'nominal',
  normal = 'normal',
  alert = 'alert',
  warn = 'warn',
  alarm = 'alarm',
  emergency = 'emergency'
}

export enum AlarmMethod {
  visual = 'visual',
  sound = 'sound'
}

export enum AlarmType {
  mob = 'notifications.mob',
  fire = 'notifications.fire',
  sinking = 'notifications.sinking',
  flooding = 'notifications.flooding',
  collision = 'notifications.collision',
  grounding = 'notifications.grounding',
  listing = 'notifications.listing',
  adrift = 'notifications.adrift',
  piracy = 'notifications.piracy',
  abandon = 'notifications.abandon'
}

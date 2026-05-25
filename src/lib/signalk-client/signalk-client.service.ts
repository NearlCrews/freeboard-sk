// Vendored from signalk-client-angular ^2.1.0 (Apache 2.0, AdrianP).
// Pure ESM, named exports, tree-shakable.
//
// Loose response types preserved during inline. Public surface still uses
// `any` for upstream-API parity. The file-level eslint disable below
// suppresses the no-unsafe-* family for that legacy `any` shape; bracket
// access on the Record-typed server.info and server.endpoints fields keeps
// tsc happy under tsconfig.strict.json (Phase 1 ratchet). Public-surface
// tightening (replacing `any` with narrower observable types) is roadmap
// Phase 6. See MODERNIZATION_ROADMAP.md.

/* eslint-disable
   @typescript-eslint/no-explicit-any,
   @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-member-access
*/

import { Injectable, inject, isDevMode } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';

import { Message } from './message';
import { Path } from './path';
import { SignalKApps } from './signalk-apps.service';
import { SignalKHttp } from './signalk-http.service';
import { SignalKStream } from './signalk-stream.service';
import { APPDATA_CONTEXT } from './types';
import type { JSON_Patch, Server_Info } from './types';
import { UUID } from './uuid';

interface FallbackEndpoints {
  endpoints: { v1: Record<string, string> };
  server: { id: string };
}

interface PlaybackOptions {
  startTime?: string;
  playbackRate?: number;
  subscribe?: string;
}

interface LoginStatus {
  status: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class SignalKClient implements OnDestroy {
  private readonly http = inject(HttpClient);
  readonly apps = inject(SignalKApps);
  readonly api = inject(SignalKHttp);
  readonly stream = inject(SignalKStream);

  private hostname = 'localhost';
  private port = 3000;
  private protocol = '';
  private _version = 'v1'; // Default Signal K API version.
  private _token = ''; // Token for when security is enabled on the server.

  // Endpoints to fall back to if hello response is not received.
  private readonly fallbackEndpoints: FallbackEndpoints = {
    endpoints: { v1: {} },
    server: { id: 'fallback' }
  };

  // Server information block.
  server: Server_Info = {
    endpoints: {},
    info: {},
    apiVersions: []
  };

  // Endpoints fall back to host address when no hello response.
  fallback = false;
  // Endpoints are set to host address regardless of contents of hello response.
  proxied = false;

  // applicationData api members.
  private _appId = '';
  private _appVersion = '';

  constructor() {
    this.init();
  }

  private debug(val: unknown): void {
    if (isDevMode()) {
      console.info(val);
    }
  }

  // Get / set Signal K preferred API version to use.
  get version(): number {
    return parseInt(this._version.slice(1));
  }

  set version(val: number) {
    const v = 'v' + val;
    if (this.server.apiVersions.length === 0) {
      this._version = v;
      this.debug(`Signal K api version set to: ${v}`);
    } else {
      this._version = this.server.apiVersions.includes(v) ? v : this._version;
      this.debug(
        `Signal K api version set request: ${v}, result: ${this._version}`
      );
    }
    this.api.version = parseInt(v.slice(1));
    this.stream.version = parseInt(v.slice(1));
  }

  set authToken(val: string) {
    this._token = val;
    this.api.authToken = val;
    this.stream.authToken = val;
  }

  get message(): typeof Message {
    return Message;
  }

  // Generate and return a UUID string.
  get uuid(): string {
    return new UUID().toString();
  }

  // Generate and return a Signal K MRN UUID.
  get signalkUuid(): string {
    return `urn:mrn:signalk:uuid:${new UUID().toString()}`;
  }

  ngOnDestroy(): void {
    this.stream.close();
  }

  // Initialise protocol, hostname, port values.
  private init(hostname = this.hostname, port = 80, useSSL = false): void {
    this.hostname = hostname ? hostname : this.hostname;
    if (useSSL) {
      this.protocol = 'https';
      this.port = port || 443;
    } else {
      this.protocol = 'http';
      this.port = port || 80;
    }
    const httpUrl = `${this.protocol}://${this.hostname}:${this.port}`;
    const wsUrl = `${useSSL ? 'wss' : 'ws'}://${this.hostname}:${this.port}`;
    this.fallbackEndpoints.endpoints.v1['signalk-http'] =
      `${httpUrl}/signalk/v1/api/`;
    this.fallbackEndpoints.endpoints.v1['signalk-ws'] =
      `${wsUrl}/signalk/v1/stream`;
  }

  // Connection and discovery.

  // Signal K server endpoint discovery request (/signalk).
  hello(
    hostname = this.hostname,
    port = 3000,
    useSSL = false
  ): Observable<any> {
    this.init(hostname, port, useSSL);
    return this.get('/signalk');
  }

  // Connect to server (endpoint discovery), do not open Stream.
  connect(
    hostname = this.hostname,
    port = 3000,
    useSSL = false
  ): Observable<any> {
    const sub = new Subject<any>();
    this.debug('Contacting Signal K server.........');
    this.hello(hostname, port, useSSL).subscribe({
      next: (response: any) => {
        // eslint-disable-next-line rxjs-x/no-nested-subscribe
        this.getLoginStatus().subscribe();
        if (this.stream) {
          this.stream.close();
        }
        this.processHello(response);
        this.api.endpoint = this.resolveHttpEndpoint();
        this.stream.endpoint = this.resolveStreamEndpoint();
        sub.next(true);
      },
      error: (error: any) => {
        if (this.fallback) {
          // Fallback if no hello response.
          if (this.stream) {
            this.stream.close();
          }
          this.processHello(null);
          this.api.endpoint = this.resolveHttpEndpoint();
          this.stream.endpoint = this.resolveStreamEndpoint();
          sub.next(true);
        } else {
          this.disconnectedFromServer();
          sub.error(error);
        }
      }
    });
    return sub.asObservable();
  }

  // Disconnect from server.
  disconnect(): void {
    this.stream.close();
  }

  // Connect + open Delta Stream (endpoint discovery).
  connectStream(
    hostname = this.hostname,
    port = 3000,
    useSSL = false,
    subscribe = ''
  ): Observable<any> {
    const sub = new Subject<any>();
    this.connect(hostname, port, useSSL).subscribe({
      next: () => {
        const url = this.resolveStreamEndpoint();
        if (!url) {
          sub.error(new Error('Server has no advertised Stream endpoints!'));
          return;
        }
        this.stream.open(url, subscribe);
        sub.next(true);
      },
      error: (e: any) => {
        sub.error(e);
      }
    });
    return sub.asObservable();
  }

  // Connect to playback stream (endpoint discovery).
  connectPlayback(
    hostname = this.hostname,
    port = 3000,
    useSSL = false,
    options: PlaybackOptions
  ): Observable<any> {
    const sub = new Subject<any>();
    this.connect(hostname, port, useSSL).subscribe({
      next: () => {
        this.openPlayback('', options, this._token);
        sub.next(true);
      },
      error: (e: any) => {
        sub.error(e);
      }
    });
    return sub.asObservable();
  }

  // Connect to Delta stream with NO endpoint discovery.
  openStream(
    url = this.hostname,
    subscribe?: string,
    token?: string
  ): true | Error {
    this.debug('openStream.........');
    let target = url;
    if (!target) {
      target = this.resolveStreamEndpoint();
      if (!target) {
        return new Error('Server has no advertised Stream endpoints!');
      }
    }
    this.stream.open(target, subscribe, token);
    return true;
  }

  // Connect to playback stream with NO endpoint discovery.
  openPlayback(
    url = this.hostname,
    options?: PlaybackOptions,
    token?: string
  ): true | Error {
    this.debug('openPlayback.........');
    let target = url;
    if (!target) {
      target = this.resolveStreamEndpoint();
      if (!target) {
        return new Error('Server has no advertised Stream endpoints!');
      }
      target = target.replace('stream', 'playback');
    }
    let pb = '';
    let subscribe = '';
    if (options && typeof options === 'object') {
      pb += options.startTime
        ? '?startTime=' +
          options.startTime.slice(0, options.startTime.indexOf('.')) +
          'Z'
        : '';
      pb += options.playbackRate ? `&playbackRate=${options.playbackRate}` : '';
      subscribe = options.subscribe ? options.subscribe : '';
    }
    this.stream.open(target + pb, subscribe, token);
    return true;
  }

  // Process Hello response.
  private processHello(response: any): void {
    if (this.proxied) {
      this.server.endpoints = this.fallbackEndpoints.endpoints;
    } else {
      this.server.endpoints =
        response && response.endpoints
          ? response.endpoints
          : this.fallbackEndpoints.endpoints;
    }
    this.server.info =
      response && response.server
        ? response.server
        : this.fallbackEndpoints.server;
    this.server.apiVersions = this.server.endpoints
      ? Object.keys(this.server.endpoints)
      : [];
    this.debug(this.server.endpoints);
    this.api.server = this.server.info;
    this.apps.endpoint = this.resolveAppsEndpoint();
  }

  // Return Signal K apps API URL.
  private resolveAppsEndpoint(): string {
    return this.resolveHttpEndpoint().replace('api', 'apps');
  }

  // Return preferred WS stream URL.
  resolveStreamEndpoint(): string {
    const versioned = this.server.endpoints[this._version];
    if (versioned && versioned['signalk-ws']) {
      this.debug(`Connecting endpoint version: ${this._version}`);
      return `${versioned['signalk-ws']}`;
    }
    const v1 = this.server.endpoints['v1'];
    if (v1 && v1['signalk-ws']) {
      this.debug(`Connection falling back to: v1`);
      return `${v1['signalk-ws']}`;
    }
    return '';
  }

  // Return signalk-http endpoint URL.
  private resolveHttpEndpoint(): string {
    let url = '';
    const versioned = this.server.endpoints[this._version];
    if (versioned) {
      if (versioned['signalk-http']) {
        url = `${versioned['signalk-http']}`;
      } else {
        url = `${this.server.endpoints['v1']?.['signalk-http'] ?? ''}`;
      }
    } else {
      this.debug(
        'No current connection http endpoint service! Use connect() to establish a connection.'
      );
    }
    return url;
  }

  // Cleanup on server disconnection.
  private disconnectedFromServer(): void {
    this.server.endpoints = {};
    this.server.info = {};
    this.server.apiVersions = [];
  }

  // Return observable response from HTTP path.
  get(path: string): Observable<any> {
    let p = path;
    if (p && p.length > 0 && p.startsWith('/')) {
      p = p.slice(1);
    }
    const url = `${this.protocol}://${this.hostname}:${this.port}/${p}`;
    this.debug(`get ${url}`);
    if (this._token) {
      const headers = new HttpHeaders({ Authorization: `JWT ${this._token}` });
      return this.http.get(url, { headers });
    }
    return this.http.get(url, { withCredentials: true });
  }

  // Return observable response for PUT to HTTP path.
  put(path: string, value: any): Observable<any> {
    const url = `${this.protocol}://${this.hostname}:${this.port}/${path}`;
    this.debug(`put ${url}`);
    if (this._token) {
      const headers = new HttpHeaders({ Authorization: `JWT ${this._token}` });
      return this.http.put(url, value, { headers });
    }
    return this.http.put(url, value, { withCredentials: true });
  }

  // Return observable response for POST to HTTP path.
  post(path: string, value: any): Observable<any> {
    let p = path;
    if (p && p.length > 0 && p.startsWith('/')) {
      p = p.slice(1);
    }
    const url = `${this.protocol}://${this.hostname}:${this.port}/${p}`;
    this.debug(`post ${url}`);
    if (this._token) {
      const headers = new HttpHeaders({ Authorization: `JWT ${this._token}` });
      return this.http.post(url, value, { headers });
    }
    return this.http.post(url, value, { withCredentials: true });
  }

  // Get auth token for the supplied user details.
  login(username: string, password: string): Observable<any> {
    const headers = new HttpHeaders().set('Content-Type', `application/json`);
    return this.http.post(
      `${this.protocol}://${this.hostname}:${this.port}/signalk/${this._version}/auth/login`,
      { username, password },
      { headers }
    );
  }

  // Logout from server.
  logout(): Observable<boolean> {
    const sub = new Subject<boolean>();
    const url = `${this.protocol}://${this.hostname}:${this.port}/signalk/${this._version}/auth/logout`;
    const onResult = (success: boolean) => sub.next(success);
    if (this._token) {
      const headers = new HttpHeaders({ Authorization: `JWT ${this._token}` });
      this.http.put(url, null, { headers, responseType: 'text' }).subscribe({
        next: () => onResult(true),
        error: () => onResult(false)
      });
    } else {
      this.http
        .put(url, null, { responseType: 'text', withCredentials: true })
        .subscribe({
          next: () => onResult(true),
          error: () => onResult(false)
        });
    }
    return sub.asObservable();
  }

  // Is a user authenticated to the server?
  isLoggedIn(): Observable<boolean> {
    const sub = new Subject<boolean>();
    this.getLoginStatus().subscribe({
      next: (r: LoginStatus) => sub.next(r.status === 'loggedIn'),
      error: () => sub.next(false)
    });
    return sub.asObservable();
  }

  // Fetch login status from server.
  getLoginStatus(): Observable<any> {
    let url = `/skServer/loginStatus`;
    if (
      this.server &&
      this.server.info &&
      this.server.info['id'] === 'signalk-server-node'
    ) {
      const ver = (this.server.info['version'] as string).split('.');
      // Use legacy link for older versions.
      url = ver[0] === '1' && Number(ver[1]) < 36 ? `/loginstatus` : url;
    }
    return this.get(url);
  }

  // Get data via the snapshot HTTP API path for the supplied time.
  snapshot(context: string, time: string): Observable<any> | undefined {
    if (!time) {
      return undefined;
    }
    const isoTime = time.slice(0, time.indexOf('.')) + 'Z';
    let url = this.resolveHttpEndpoint();
    if (!url) {
      return undefined;
    }
    url = `${url.replace('api', 'snapshot')}${Path.contextToPath(context)}?time=${isoTime}`;
    if (this._token) {
      const headers = new HttpHeaders({ Authorization: `JWT ${this._token}` });
      return this.http.get(url, { headers });
    }
    return this.http.get(url, { withCredentials: true });
  }

  // applicationData API methods. context: 'user' or 'global'. appId: application id string.

  private resolveAppDataEndpoint(context: string, appId: string): string {
    if (!context || !appId) {
      return '';
    }
    const url = this.resolveHttpEndpoint().replace('api', 'applicationData');
    return `${url}${context}/${appId}/`;
  }

  setAppId(value: string): void {
    this._appId = value;
  }

  setAppVersion(value: string): void {
    this._appVersion = value;
  }

  // Get list of available versions of data stored.
  appDataVersions(
    context: APPDATA_CONTEXT = APPDATA_CONTEXT.USER,
    appId: string = this._appId
  ): Observable<any> {
    const url = this.resolveAppDataEndpoint(context, appId);
    if (this._token) {
      const headers = new HttpHeaders({ Authorization: `JWT ${this._token}` });
      return this.http.get(url, { headers });
    }
    return this.http.get(url, { withCredentials: true });
  }

  // Get list of available keys for a stored path.
  appDataKeys(
    path = '',
    context: APPDATA_CONTEXT = APPDATA_CONTEXT.USER,
    appId: string = this._appId,
    version: string = this._appVersion
  ): Observable<any> {
    const p = path.startsWith('/') ? path.slice(1) : path;
    const url = `${this.resolveAppDataEndpoint(context, appId)}${version}/${p}?keys=true`;
    if (this._token) {
      const headers = new HttpHeaders({ Authorization: `JWT ${this._token}` });
      return this.http.get(url, { headers });
    }
    return this.http.get(url, { withCredentials: true });
  }

  // Get stored value at provided path.
  appDataGet(
    path = '',
    context: APPDATA_CONTEXT = APPDATA_CONTEXT.USER,
    appId: string = this._appId,
    version: string = this._appVersion
  ): Observable<any> {
    const p = path.startsWith('/') ? path.slice(1) : path;
    const url = `${this.resolveAppDataEndpoint(context, appId)}${version}/${p}`;
    if (this._token) {
      const headers = new HttpHeaders({ Authorization: `JWT ${this._token}` });
      return this.http.get(url, { headers });
    }
    return this.http.get(url, { withCredentials: true });
  }

  // Set stored value at provided path.
  appDataSet(
    path: string,
    value: any,
    context: APPDATA_CONTEXT = APPDATA_CONTEXT.USER,
    appId: string = this._appId,
    version: string = this._appVersion
  ): Observable<any> | undefined {
    if (!path) {
      return undefined;
    }
    const p = path.startsWith('/') ? path.slice(1) : path;
    const ep = this.resolveAppDataEndpoint(context, appId);
    if (!ep) {
      return undefined;
    }
    const url = `${ep}${version}/${p}`;
    if (this._token) {
      const headers = new HttpHeaders({ Authorization: `JWT ${this._token}` });
      return this.http.post(url, value, { headers });
    }
    return this.http.post(url, value, { withCredentials: true });
  }

  // Update / patch stored values using an array of JSON patch objects.
  appDataPatch(
    value: JSON_Patch[],
    context: APPDATA_CONTEXT = APPDATA_CONTEXT.USER,
    appId: string = this._appId,
    version: string = this._appVersion
  ): Observable<any> | undefined {
    const ep = this.resolveAppDataEndpoint(context, appId);
    if (!ep || !version) {
      return undefined;
    }
    const url = `${ep}${version}`;
    if (this._token) {
      const headers = new HttpHeaders({ Authorization: `JWT ${this._token}` });
      return this.http.post(url, value, { headers });
    }
    return this.http.post(url, value, { withCredentials: true });
  }
}

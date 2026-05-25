// Vendored from signalk-client-angular ^2.1.0 (Apache 2.0, AdrianP).
// Pure ESM, named exports, tree-shakable.
//
// Loose response types preserved during inline. Phase 6 (TS strict ratchet)
// will tighten the public surface. See MODERNIZATION_ROADMAP.md.

/* eslint-disable
   @typescript-eslint/no-explicit-any,
   @typescript-eslint/no-unsafe-assignment
*/

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import type { Alarm } from './alarm';
import { Path } from './path';
import type { AlarmType } from './types';

type ObserveType = 'body' | 'response';

const V_RE = /\/v[0-9]+\//;

@Injectable({ providedIn: 'root' })
export class SignalKHttp {
  private readonly http = inject(HttpClient);
  private _token = '';
  private _observe: ObserveType = 'body';

  server: any;
  endpoint = '';
  version = 1;

  set authToken(val: string) {
    this._token = val;
  }

  set observeResponse(value: boolean) {
    this._observe = value ? 'response' : 'body';
  }

  // Get the contents of the Signal K tree pointed to by self.
  getSelf(): any {
    return this.get(`vessels/self`);
  }

  // Get ID of vessel self via HTTP.
  getSelfId(): any {
    return this.get(`self`);
  }

  // Return observable response for the meta object at the specified context and path.
  getMeta(context: string, path: string): any {
    return this.get(`${Path.contextToPath(context)}/${path}/meta`);
  }

  get(path: string): any;
  get(version: number, path: string): any;
  get(p1: string | number, p2?: string): any {
    if (!this.endpoint) {
      return;
    }
    let ep: string;
    let path: string;
    if (typeof p1 === 'number') {
      ep = this.endpoint.replace(V_RE, `/v${p1}/`);
      path = p2 as string;
    } else {
      ep = this.endpoint;
      path = p1;
    }
    if (path.startsWith('/')) {
      path = path.slice(1);
    }
    const url = `${ep}${path}`;
    if (this._token) {
      const headers = new HttpHeaders({ Authorization: `JWT ${this._token}` });
      return this.http.get(url, { headers });
    }
    return this.http.get(url, { withCredentials: true });
  }

  // Patch for v2 and above PUT handling of resourcesApi and courseApi.
  private parseApiPut(version: number, value: any): any {
    if (version > 1) {
      return value;
    }
    return { value };
  }

  put(path: string, value: any): any;
  put(version: number, path: string, value: any): any;
  put(p1: string | number, p2: any, p3?: any): any {
    if (!this.endpoint) {
      return;
    }
    let ep: string;
    let path: string;
    let value: any;
    let msg: any;
    if (typeof p1 === 'number') {
      ep = this.endpoint.replace(V_RE, `/v${p1}/`);
      path = p2 as string;
      value = p3;
      msg = this.parseApiPut(p1, value);
    } else {
      ep = this.endpoint;
      path = p1;
      value = p2;
      msg = this.parseApiPut(this.version, value);
    }
    if (path.startsWith('/')) {
      path = path.slice(1);
    }
    const url = `${ep}${path}`;
    if (this._token) {
      const headers = new HttpHeaders({ Authorization: `JWT ${this._token}` });
      return this.http.put(url, msg, {
        headers,
        observe: this._observe as 'body'
      });
    }
    return this.http.put(url, msg, {
      withCredentials: true,
      observe: this._observe as 'body'
    });
  }

  putWithContext(context: string, path: string, value: any): any;
  putWithContext(
    version: number,
    context: string,
    path: string,
    value: any
  ): any;
  putWithContext(p1: string | number, p2: any, p3?: any, p4?: any): any {
    if (!this.endpoint) {
      return;
    }
    let ep: string;
    let path: string;
    let context: string;
    let value: any;
    let msg: any;
    if (typeof p1 === 'number') {
      ep = this.endpoint.replace(V_RE, `/v${p1}/`);
      context = p2 ? `${Path.contextToPath(p2 as string)}/` : '';
      path = p3 as string;
      value = p4;
      msg = this.parseApiPut(p1, value);
    } else {
      ep = this.endpoint;
      context = p1 ? `${Path.contextToPath(p1)}/` : '';
      path = p2 as string;
      value = p3;
      msg = this.parseApiPut(this.version, value);
    }
    if (path.startsWith('/')) {
      path = path.slice(1);
    }
    const url = ep + context + path;
    if (this._token) {
      const headers = new HttpHeaders({ Authorization: `JWT ${this._token}` });
      return this.http.put(url, msg, {
        headers,
        observe: this._observe as 'body'
      });
    }
    return this.http.put(url, msg, {
      withCredentials: true,
      observe: this._observe as 'body'
    });
  }

  post(path: string, value: any): any;
  post(version: number, path: string, value: any): any;
  post(p1: string | number, p2: any, p3?: any): any {
    if (!this.endpoint) {
      return;
    }
    let ep: string;
    let path: string;
    let value: any;
    if (typeof p1 === 'number') {
      ep = this.endpoint.replace(V_RE, `/v${p1}/`);
      path = p2 as string;
      value = p3;
    } else {
      ep = this.endpoint;
      path = p1;
      value = p2;
    }
    if (path.startsWith('/')) {
      path = path.slice(1);
    }
    const url = `${ep}${path}`;
    if (this._token) {
      const headers = new HttpHeaders({ Authorization: `JWT ${this._token}` });
      return this.http.post(url, value, {
        headers,
        observe: this._observe as 'body'
      });
    }
    return this.http.post(url, value, {
      withCredentials: true,
      observe: this._observe as 'body'
    });
  }

  delete(path: string): any;
  delete(version: number, path: string): any;
  delete(p1: string | number, p2?: string): any {
    if (!this.endpoint) {
      return;
    }
    let ep: string;
    let path: string;
    if (typeof p1 === 'number') {
      ep = this.endpoint.replace(V_RE, `/v${p1}/`);
      path = p2 as string;
    } else {
      ep = this.endpoint;
      path = p1;
    }
    if (path.startsWith('/')) {
      path = path.slice(1);
    }
    const url = `${ep}${path}`;
    if (this._token) {
      const headers = new HttpHeaders({ Authorization: `JWT ${this._token}` });
      return this.http.delete(url, {
        headers,
        observe: this._observe as 'body'
      });
    }
    return this.http.delete(url, {
      withCredentials: true,
      observe: this._observe as 'body'
    });
  }

  raiseAlarm(context: string, name: string, alarm: Alarm): any;
  raiseAlarm(context: string, type: AlarmType, alarm: Alarm): any;
  raiseAlarm(context = '*', alarmId: string | AlarmType, alarm: Alarm): any {
    let path: string;
    if (typeof alarmId === 'string') {
      path = alarmId.includes('notifications.')
        ? alarmId
        : `notifications.${alarmId}`;
    } else {
      path = alarmId;
    }
    return this.putWithContext(context, path, alarm.value);
  }

  // Clear alarm for path (name); returns Observable.
  clearAlarm(context = '*', name: string): any {
    const path = name.includes('notifications.')
      ? name
      : `notifications.${name}`;
    return this.putWithContext(context, path, null);
  }
}

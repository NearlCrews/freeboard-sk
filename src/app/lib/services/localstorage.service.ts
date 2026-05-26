// LocalStorage Service: encapsulates window.localStorage with an optional
// per-instance namespace prefix.

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalStorage {
  private _ls: Storage | null = null;
  private _namespace = '';

  constructor() {
    try {
      if ('localStorage' in window && window.localStorage !== null) {
        this._ls = window.localStorage;
      }
    } catch {
      console.warn('window.localStorage is not supported by this browser!');
    }
  }

  set namespace(value: string) {
    this._namespace = value + '_';
  }
  get namespace(): string {
    return this._namespace;
  }

  read(key: string): unknown {
    if (!this._ls || !key) return undefined;
    const raw = this._ls.getItem(this._namespace + key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  write(key: string, value: unknown = ''): void {
    if (!this._ls || !key) return;
    this._ls.setItem(this._namespace + key, JSON.stringify(value));
  }

  delete(key: string): void {
    if (!this._ls || !key) return;
    this._ls.removeItem(this._namespace + key);
  }

  exists(key: string): boolean {
    if (!this._ls || !key) return false;
    return this._ls.getItem(this._namespace + key) !== null;
  }
}

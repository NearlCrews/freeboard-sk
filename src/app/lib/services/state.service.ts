// Application local-storage facade: namespace-prefixed read/write of the
// info, config, and data blobs the app persists across sessions.

import { Injectable } from '@angular/core';

import { LocalStorage } from './localstorage.service';

interface SavePayload {
  info?: unknown;
  config?: unknown;
  data?: unknown;
}

type JsonRecord = Record<string, unknown>;

@Injectable({
  providedIn: 'root'
})
export class State {
  private _appid = '';
  private ls: LocalStorage;

  constructor() {
    this.ls = new LocalStorage();
  }

  get appId(): string {
    return this._appid;
  }

  set appId(value: string) {
    if (value && value.length !== 0) {
      this._appid = value;
      this.ls.namespace = this._appid;
    }
  }

  /** load info, config, and data */
  load(): { info: unknown; config: unknown; data: unknown } {
    return {
      info: this.loadInfo(),
      config: this.loadConfig(),
      data: this.loadData()
    };
  }

  /** save info, config, and data */
  save(values: SavePayload | null = null): void {
    if (!values) {
      return;
    }
    if (values.info) {
      this.saveInfo(values.info);
    }
    if (values.config) {
      this.saveConfig(values.config);
    }
    if (values.data) {
      this.saveData(values.data);
    }
  }

  // merge default values into stored values for missing keys
  merge(storedValue: JsonRecord, defaultValue: JsonRecord): JsonRecord {
    Object.keys(defaultValue).forEach((key) => {
      const sv = storedValue[key];
      if (!sv) {
        storedValue[key] = defaultValue[key];
        return;
      }
      if (typeof sv === 'object' && !Array.isArray(sv) && sv !== null) {
        storedValue[key] = this.merge(
          sv as JsonRecord,
          defaultValue[key] as JsonRecord
        );
      }
    });
    return storedValue;
  }

  loadConfig(defaultValue: unknown = {}): unknown {
    const config = this.ls.read('config');
    return config ? config : defaultValue;
  }

  loadData(defaultValue: unknown = {}): unknown {
    const data = this.ls.read('data');
    return data ? data : defaultValue;
  }

  loadInfo(defaultValue: unknown = {}): unknown {
    const info = this.ls.read('info');
    return info ? info : defaultValue;
  }

  saveConfig(value: unknown = null): void {
    if (value) {
      this.ls.write('config', value);
    }
  }

  saveData(value: unknown = null): void {
    if (value) {
      this.ls.write('data', value);
    }
  }

  saveInfo(value: unknown = null): void {
    if (value) {
      this.ls.write('info', value);
    }
  }
}

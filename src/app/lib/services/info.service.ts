//*************************************
//** Application Information Service **
//*************************************
import { isDevMode } from '@angular/core';
import { Subject, Observable } from 'rxjs';

import { parseSemver } from '../semver';
import { IAppConfig, FBAppData } from '../../types';

export type ConfigEvent = 'saved' | 'ready';

export interface AppInfoDef {
  id: string;
  name: string;
  description: string;
  version: string;
  url?: string;
  logo?: string;
}

export class InfoService {
  public config!: IAppConfig;
  public data!: FBAppData;

  public name = '';
  public description = ``;
  public version = '';
  public url = '';
  public logo = './assets/img/app_logo.png';

  public launchStatus!: {
    result: 'current' | 'major' | 'minor' | 'patch' | 'first_run';
    previousVersion: string;
  };

  protected devMode: boolean;
  protected suppressPersist = false;

  private id = '';
  private ls: Storage | null = null;

  // Observables
  private configEvent: Subject<ConfigEvent> = new Subject<ConfigEvent>();
  public config$: Observable<ConfigEvent> = this.configEvent.asObservable();

  constructor(infoDef: AppInfoDef) {
    this.devMode = isDevMode();
    try {
      if ('localStorage' in window && window.localStorage !== null) {
        this.ls = window.localStorage;
      }
    } catch {
      console.warn('window.localStorage is not supported by this browser!');
    }

    this.id = infoDef.id ?? '_';
    this.name = infoDef.name ?? '';
    this.description = infoDef.description ?? '';
    this.version = infoDef.version ?? '0.0.0';
    this.url = infoDef.url ?? '';
    this.logo = infoDef.logo ?? '';
    this.checkVersion();
  }

  /** write debug information to console in devMode only */
  debug(...e: unknown[]) {
    e.unshift('debug:');
    if (this.devMode) {
      console.info(...e);
    }
  }

  /** Check version set launchStatus */
  private checkVersion() {
    const pv = (this.readStorage('info') as AppInfoDef | null)?.version;
    if (!pv) {
      this.launchStatus = { result: 'first_run', previousVersion: '' };
    } else if (pv === this.version) {
      this.launchStatus = { result: 'current', previousVersion: pv };
    } else {
      const pva = parseSemver(pv);
      const cva = parseSemver(this.version);
      let result: 'major' | 'minor' | 'patch' = 'patch';
      if (pva && cva) {
        if (pva[0] !== cva[0]) result = 'major';
        else if (pva[1] !== cva[1]) result = 'minor';
      }
      this.launchStatus = { result, previousVersion: pv };
    }

    this.saveInfo();
    this.debug(`Version Check:`, this.launchStatus);
  }

  /** emit config$ event */
  emitConfigEvent(value: ConfigEvent) {
    this.configEvent.next(value);
  }

  /** persist version info */
  saveInfo() {
    this.writeStorage('info', { name: this.name, version: this.version });
  }

  /** load app config */
  loadConfig() {
    const stored = this.readStorage('config');
    this.config = (stored ?? this.config) as IAppConfig;
  }

  /** persist app config */
  saveConfig() {
    if (this.suppressPersist) {
      this.debug(`InfoService: suppressPersist = true`);
      return;
    }
    this.debug(`InfoService.saveConfig`);
    this.writeStorage('config', this.config);
    this.emitConfigEvent('saved');
  }

  /** load app data */
  loadData() {
    const stored = this.readStorage('data');
    this.data = (stored ?? this.data) as FBAppData;
  }

  /** persist app data */
  saveData() {
    this.writeStorage('data', this.data);
  }

  private storageKey(key: string): string {
    return `${this.id}_${key}`;
  }

  private readStorage(key: string): unknown {
    if (!this.ls) return null;
    const raw = this.ls.getItem(this.storageKey(key));
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      console.warn(
        `InfoService: discarding malformed localStorage entry "${key}"`
      );
      return null;
    }
  }

  private writeStorage(key: string, value: unknown): void {
    if (!this.ls || value === null || value === undefined) return;
    this.ls.setItem(this.storageKey(key), JSON.stringify(value));
  }
}

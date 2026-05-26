import { Injectable, inject, signal } from '@angular/core';

import { SignalKClient } from 'src/lib/signalk-client';
import { Convert, SI_BASE_UNIT, TARGET_UNIT } from 'src/app/lib/convert';
import type {
  DepthUnitDef,
  DistanceUnitDef,
  IAppConfig,
  LengthUnitDef,
  SKServerUnitPrefs,
  SpeedUnitDef,
  TemperatureUnitDef
} from 'src/app/types';
import type { LineStyleDash } from 'src/app/modules/settings/components/linestyle-select.component';

export interface UiCtrlState {
  /** display AlertList */
  alertList: boolean;
  /** display AutopilotConsole */
  autopilotConsole: boolean;
  /** display Radar map Layer */
  radarLayer: boolean;
  /** display BuildRoute */
  routeBuilder: boolean;
  /** prevent display of context menu */
  suppressContextMenu: boolean;
  /** force setting of night mode */
  forceNightMode: boolean;
}

export interface UiConfigState {
  /** map North / Heading Up */
  mapNorthUp: boolean;
  /** move map mode */
  mapMove: boolean;
  /** constrain zoom to chart min / max */
  mapConstrainZoom: boolean;
  /** show toolbar buttons (both left and right) */
  toolbarButtons: boolean;
  /** invert feature label text color (for dark backgrounds) */
  invertColor: boolean;
  /** show / hide course data */
  showCourseData: boolean;
  /** show / hide AIS targets */
  showAisTargets: boolean;
  /** show / hide Notes */
  showNotes: boolean;
  autoNightMode: boolean;
  /** AIS vessel count past which the WebGL points layer replaces the canvas layer */
  webglAISThreshold: number;
  /** opt-in WebGL fragment-shader night-mode for WebGLTileLayer raster chart layers */
  useWebGLNightMode: boolean;
}

export interface FeatureFlagsState {
  anchorApi: boolean;
  autopilotApi: boolean;
  weatherApi: boolean;
  radarApi: boolean;
  notificationApi: boolean;
  /** ability to store resource groups */
  resourceGroups: boolean;
  /** ability to store track resources */
  resourceTracks: boolean;
  /** ability to store map information overlays */
  infoLayers: boolean;
  buddyList: boolean;
}

export interface InstrumentPanelState {
  open: boolean;
  activate: boolean;
}

const LINE_DASH_MAP = new Map<string, string>([
  ['none', 'none'],
  ['short', '2 2'],
  ['medium', '4 4'],
  ['long', '8 4'],
  ['alt', '8 4 2 4']
]);

/**
 * Phase 3 Batch 3: owns the persisted-config-derived signals (uiConfig,
 * uiCtrl, featureFlags), the auth and session flags, the instrument-panel
 * frame, and the unit-preference helpers that all read from IAppConfig.
 *
 * Methods that need IAppConfig take it as an argument rather than injecting
 * AppFacade: the shim injects the stores, not the other way around, which
 * avoids the circular DI that `providedIn: 'root'` would otherwise throw.
 */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly signalk = inject(SignalKClient);

  // ----- persisted UI configuration -----
  readonly uiConfig = signal<UiConfigState>({
    mapNorthUp: true,
    mapMove: false,
    mapConstrainZoom: false,
    toolbarButtons: false,
    invertColor: false,
    showCourseData: true,
    showAisTargets: true,
    showNotes: true,
    autoNightMode: false,
    webglAISThreshold: 50,
    useWebGLNightMode: false
  });

  // ----- non-persisted UI state -----
  readonly uiCtrl = signal<UiCtrlState>({
    alertList: false,
    autopilotConsole: false,
    radarLayer: false,
    routeBuilder: false,
    suppressContextMenu: false,
    forceNightMode: false
  });

  // ----- Signal K server feature flags -----
  readonly featureFlags = signal<FeatureFlagsState>({
    anchorApi: true,
    autopilotApi: false,
    weatherApi: false,
    radarApi: false,
    notificationApi: false,
    resourceGroups: false,
    resourceTracks: false,
    infoLayers: false,
    buddyList: false
  });

  // ----- session flags -----
  /** kiosk mode flag */
  readonly kioskMode = signal<boolean>(false);
  /** auth token has been presented */
  readonly hasAuthToken = signal<boolean>(false);
  /** logged in to SK Server */
  readonly isLoggedIn = signal<boolean>(false);
  /** show instrument panel button */
  readonly instrumentPanelAvailable = signal<boolean>(true);
  /** Signal K cookie change event */
  readonly skAuthChange = signal<string | undefined>(undefined);

  /** show progress for fetching data from server */
  readonly sIsFetching = signal<boolean>(false);
  /** preferred path True / Magnetic */
  readonly sTrueMagChoice = signal<string>('');

  readonly instrumentPanel = signal<InstrumentPanelState>({
    open: false,
    activate: false
  });

  // ----- server-supplied unit preferences -----
  readonly serverConfig = {
    unitPreferences: signal<SKServerUnitPrefs | undefined>(undefined)
  };

  // ----- line-dash style helpers -----
  get lineDashMap(): Map<string, string> {
    return LINE_DASH_MAP;
  }

  formatLineDashArray(value: LineStyleDash): number[] | null {
    if (value === 'none') return null;
    const raw = LINE_DASH_MAP.get(value);
    if (!raw) return null;
    return raw.split(' ').map(Number);
  }

  /** Retrieve unit preferences from the Signal K server. */
  fetchUnitPrefsFromSKServer(): void {
    this.signalk.get('/signalk/v1/unitpreferences/active').subscribe({
      next: (res: SKServerUnitPrefs) => {
        this.serverConfig.unitPreferences.set(res);
      },
      error: () => {
        // No server unit preferences; fall back to local config.
      }
    });
  }

  /**
   * Align server unit-preference settings with FB units config. Mutates
   * `config.units` and reports the unit symbols back to Convert.
   */
  alignUnitPrefs(config: IAppConfig, units: SKServerUnitPrefs): void {
    if (!config.units.useServerPrefs) return;
    if (!units?.categories) return;

    const speed = units.categories['speed'];
    if (speed) {
      config.units.speed = ['kn', 'm/s', 'km/h', 'mph'].includes(
        speed.targetUnit
      )
        ? (speed.targetUnit as SpeedUnitDef)
        : config.units.speed;
      Convert.setSymbol(speed.targetUnit as TARGET_UNIT, speed.symbol);
    }
    const temperature = units.categories['temperature'];
    if (temperature) {
      config.units.temperature = ['C', 'F'].includes(temperature.targetUnit)
        ? (temperature.targetUnit as TemperatureUnitDef)
        : config.units.temperature;
      Convert.setSymbol(
        temperature.targetUnit as TARGET_UNIT,
        temperature.symbol
      );
    }
    const distance = units.categories['distance'];
    if (distance) {
      config.units.distance = ['kilometer', 'naut-mile'].includes(
        distance.targetUnit
      )
        ? (distance.targetUnit as DistanceUnitDef)
        : config.units.distance;
      Convert.setSymbol(distance.targetUnit as TARGET_UNIT, distance.symbol);
    }
    const depth = units.categories['depth'];
    if (depth) {
      config.units.depth = ['m', 'foot'].includes(depth.targetUnit)
        ? (depth.targetUnit as DepthUnitDef)
        : config.units.depth;
      Convert.setSymbol(depth.targetUnit as TARGET_UNIT, depth.symbol);
    }
    const length = units.categories['length'];
    if (length) {
      config.units.length = ['m', 'foot'].includes(length.targetUnit)
        ? (length.targetUnit as LengthUnitDef)
        : config.units.length;
      Convert.setSymbol(length.targetUnit as TARGET_UNIT, length.symbol);
    }
  }

  // ----- number formatting -----

  /**
   * Format a value for display in the user's preferred units (e.g. 12.5 kn,
   * 8.8 m/s). Numbers default to 1 decimal place. Strings are returned
   * unchanged when they look like ISO timestamps; otherwise the raw value
   * plus unit suffix is returned.
   */
  formatValueForDisplay(
    config: IAppConfig,
    value: number,
    sourceUnit: SI_BASE_UNIT,
    options?: {
      category?: string;
      noSymbol?: boolean;
      precision?: number;
    }
  ): string {
    if (typeof (value as unknown) !== 'number') {
      const s = value as unknown as string;
      if (typeof s === 'string' && s.endsWith('Z') && s[10] === 'T') {
        return new Date(s).toLocaleString();
      }
      return `${s}${sourceUnit}`;
    }
    const precision = options?.precision ?? 1;
    let symbol = '';
    let nv: string;

    if (sourceUnit === 'K') {
      symbol = Convert.getSymbol(config.units.temperature);
      nv = this.formatNumericDisplay(
        Convert.transform(
          value,
          sourceUnit,
          config.units.temperature as TARGET_UNIT
        ) ?? NaN,
        precision
      );
    } else if (sourceUnit === 'rad') {
      symbol = Convert.getSymbol('degree');
      nv = this.formatNumericDisplay(
        Convert.transform(value, sourceUnit, 'degree') ?? NaN,
        precision
      );
    } else if (sourceUnit === 'm/s') {
      symbol = Convert.getSymbol(config.units.speed);
      nv = this.formatNumericDisplay(
        Convert.transform(
          value,
          sourceUnit,
          config.units.speed as TARGET_UNIT
        ) ?? NaN,
        precision
      );
    } else if (sourceUnit === 'ratio') {
      symbol = Convert.getSymbol('percent');
      nv =
        Math.abs(value) <= 1
          ? this.formatNumericDisplay(value * 100, precision)
          : this.formatNumericDisplay(value, 4);
    } else if (sourceUnit === 'deg') {
      symbol = Convert.getSymbol('degree');
      nv = this.formatNumericDisplay(value, precision);
    } else if (sourceUnit === 'm') {
      ({ symbol, nv } = this.formatMeters(config, value, options, precision));
    } else if (sourceUnit === 's') {
      return this.formatSeconds(value);
    } else {
      nv = this.formatNumericDisplay(value, precision);
    }
    return `${nv}${options?.noSymbol ? '' : symbol}`;
  }

  private formatMeters(
    config: IAppConfig,
    value: number,
    options: { category?: string } | undefined,
    precision: number
  ): { symbol: string; nv: string } {
    if (options?.category === 'depth') {
      const symbol = Convert.getSymbol(config.units.depth);
      const nv = this.formatNumericDisplay(
        Convert.transform(value, 'm', config.units.depth as TARGET_UNIT) ?? NaN,
        precision
      );
      return { symbol, nv };
    }
    if (options?.category === 'length') {
      const symbol = Convert.getSymbol(config.units.length);
      const nv = this.formatNumericDisplay(
        Convert.transform(value, 'm', config.units.length as TARGET_UNIT) ??
          NaN,
        precision
      );
      return { symbol, nv };
    }
    // distance
    if (config.units.distance === 'kilometer' && value < 1000) {
      return {
        symbol: Convert.getSymbol('m'),
        nv: this.formatNumericDisplay(value, 0)
      };
    }
    if (config.units.distance === 'naut-mile') {
      const nm = Convert.transform(value, 'm', config.units.distance) ?? NaN;
      if (nm < 0.5) {
        return {
          symbol: Convert.getSymbol(config.units.length),
          nv: this.formatNumericDisplay(nm, 0)
        };
      }
      return {
        symbol: Convert.getSymbol(config.units.distance),
        nv: this.formatNumericDisplay(nm, precision)
      };
    }
    return {
      symbol: Convert.getSymbol(config.units.distance),
      nv: this.formatNumericDisplay(
        Convert.transform(value, 'm', config.units.distance as TARGET_UNIT) ??
          NaN,
        precision
      )
    };
  }

  private formatSeconds(value: number): string {
    const minutes = Math.floor(value / 60);
    const hr = minutes / 60;
    if (hr >= 24) {
      const fh = Math.floor(hr % 24);
      const fhs = fh !== 0 ? `${fh}`.slice(-2) + `h` : '';
      return `${Math.floor(hr / 24)}d ${fhs}`;
    }
    if (minutes >= 60) {
      const fm = Math.floor((hr % 1) * 60);
      const fms = fm !== 0 ? `00${fm}`.slice(-2) + `m` : '';
      return `${Math.floor(hr)}h ${fms}`;
    }
    return `${minutes} min`;
  }

  /**
   * Formats numeric value as text for display. Returns the placeholder
   * `'---'` (trimmed to the requested precision) for non-finite inputs.
   */
  formatNumericDisplay(value: number, precision?: number): string {
    const p = Number.isFinite(precision) ? precision! : 1;
    if (!Number.isFinite(value)) {
      return '---'.slice(-p);
    }
    return value.toFixed(p);
  }

  /**
   * Convert a speed value to the configured unit. Returns `NaN` (numeric mode)
   * or the `'---'` placeholder (string mode) when the conversion fails, both
   * of which `Number.isFinite` and downstream consumers treat as "no value".
   */
  formatSpeed(
    config: IAppConfig,
    value: number,
    asString = false
  ): string | number {
    let converted: number | null;
    try {
      converted = Convert.transform(
        value,
        'm/s',
        config.units.speed as TARGET_UNIT
      );
    } catch {
      converted = null;
    }
    if (asString) {
      return this.formatNumericDisplay(converted ?? NaN);
    }
    return converted ?? NaN;
  }
}

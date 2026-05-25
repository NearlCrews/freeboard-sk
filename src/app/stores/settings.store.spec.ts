import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignalKClient } from 'src/lib/signalk-client';

import { SettingsStore } from './settings.store';
import type { IAppConfig, SKServerUnitPrefs } from 'src/app/types';

function minimalConfig(): IAppConfig {
  return {
    units: {
      distance: 'kilometer',
      depth: 'm',
      length: 'm',
      speed: 'kn',
      temperature: 'C',
      positionFormat: 'XY',
      headingAttribute: 'navigation.headingTrue',
      preferredPaths: {
        tws: 'environment.wind.speedTrue',
        twd: 'environment.wind.directionTrue',
        heading: 'navigation.courseOverGroundTrue',
        course: 'navigation.courseGreatCircle'
      },
      useServerPrefs: true
    }
  } as IAppConfig;
}

describe('SettingsStore', () => {
  let store: SettingsStore;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SignalKClient,
          useValue: {
            get: vi.fn(() => ({
              subscribe: (cb: { next?: (v: unknown) => void }) => {
                cb.next?.({});
              }
            }))
          }
        }
      ]
    });
    store = TestBed.inject(SettingsStore);
  });

  it('uiConfig signal defaults to mapNorthUp true and toolbarButtons false', () => {
    expect(store.uiConfig().mapNorthUp).toBe(true);
    expect(store.uiConfig().toolbarButtons).toBe(false);
  });

  it('lineDashMap exposes the known styles', () => {
    expect(store.lineDashMap.get('none')).toBe('none');
    expect(store.lineDashMap.get('short')).toBe('2 2');
    expect(store.lineDashMap.get('long')).toBe('8 4');
  });

  it('formatLineDashArray returns null for "none" and numeric array otherwise', () => {
    expect(store.formatLineDashArray('none')).toBeNull();
    expect(store.formatLineDashArray('short')).toEqual([2, 2]);
    expect(store.formatLineDashArray('alt')).toEqual([8, 4, 2, 4]);
  });

  it('formatNumericDisplay returns "---" sliced to precision for non-finite', () => {
    expect(store.formatNumericDisplay(NaN, 1)).toBe('-');
    expect(store.formatNumericDisplay(Infinity, 2)).toBe('--');
    expect(store.formatNumericDisplay(3.14159, 2)).toBe('3.14');
  });

  it('formatValueForDisplay converts m/s using the configured speed unit', () => {
    const cfg = minimalConfig();
    cfg.units.speed = 'kn';
    const out = store.formatValueForDisplay(cfg, 10, 'm/s', { precision: 1 });
    expect(
      out.endsWith('kn') || out.endsWith('knot') || /^[\d.]+/.test(out)
    ).toBe(true);
    expect(out.startsWith('19')).toBe(true);
  });

  it('formatValueForDisplay formats seconds into h / d shorthand', () => {
    expect(store.formatValueForDisplay(minimalConfig(), 90, 's')).toBe('1 min');
    expect(store.formatValueForDisplay(minimalConfig(), 7200, 's')).toBe('2h ');
  });

  it('formatSpeed asString returns the formatted numeric, otherwise the number', () => {
    const cfg = minimalConfig();
    const asNumber = store.formatSpeed(cfg, 10);
    expect(typeof asNumber).toBe('number');
    const asString = store.formatSpeed(cfg, 10, true);
    expect(typeof asString).toBe('string');
  });

  it('alignUnitPrefs is a no-op when useServerPrefs is false', () => {
    const cfg = minimalConfig();
    cfg.units.useServerPrefs = false;
    cfg.units.speed = 'kn';
    const prefs = {
      categories: {
        speed: { targetUnit: 'm/s', symbol: 'm/s' }
      }
    } as unknown as SKServerUnitPrefs;
    store.alignUnitPrefs(cfg, prefs);
    expect(cfg.units.speed).toBe('kn');
  });

  it('alignUnitPrefs aligns each unit category when useServerPrefs is true', () => {
    const cfg = minimalConfig();
    const prefs = {
      categories: {
        speed: { targetUnit: 'm/s', symbol: 'm/s' },
        temperature: { targetUnit: 'F', symbol: '°F' },
        distance: { targetUnit: 'naut-mile', symbol: 'nmi' },
        depth: { targetUnit: 'foot', symbol: 'ft' },
        length: { targetUnit: 'foot', symbol: 'ft' }
      }
    } as unknown as SKServerUnitPrefs;
    store.alignUnitPrefs(cfg, prefs);
    expect(cfg.units.speed).toBe('m/s');
    expect(cfg.units.temperature).toBe('F');
    expect(cfg.units.distance).toBe('naut-mile');
    expect(cfg.units.depth).toBe('foot');
    expect(cfg.units.length).toBe('foot');
  });

  it('fetchUnitPrefsFromSKServer pushes the response into serverConfig.unitPreferences', () => {
    const sample = {
      categories: { speed: { targetUnit: 'kn', symbol: 'kn' } }
    } as unknown as SKServerUnitPrefs;
    const skMock = TestBed.inject(SignalKClient) as unknown as {
      get: ReturnType<typeof vi.fn>;
    };
    skMock.get.mockReturnValue({
      subscribe: (cb: { next?: (v: unknown) => void }) => cb.next?.(sample)
    });
    store.fetchUnitPrefsFromSKServer();
    expect(store.serverConfig.unitPreferences()).toBe(sample);
  });
});

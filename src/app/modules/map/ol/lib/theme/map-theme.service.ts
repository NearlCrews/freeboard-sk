import { Injectable, OnDestroy, Signal, computed, signal } from '@angular/core';

/**
 * Palette consumed by canvas-side OL styling. Values are resolved CSS color
 * strings (rgb / rgba / oklch, whatever the token holds) suitable for
 * direct use as `Fill`, `Stroke`, or `Text` color in OpenLayers styles.
 */
export interface MapThemePalette {
  readonly chartLand: string;
  readonly chartDepthShallow: string;
  readonly chartDepthMid: string;
  readonly chartDepthDeep: string;
  readonly vesselSelf: string;
  readonly vesselSelfMuted: string;
  readonly vesselAis: string;
  readonly vesselAisMoored: string;
  readonly routeActive: string;
  readonly routeInactive: string;
  readonly trailSelf: string;
  readonly trailAis: string;
  readonly anchorOk: string;
  readonly anchorBreached: string;
  readonly note: string;
  readonly region: string;
  readonly waypoint: string;
}

type PaletteField = keyof MapThemePalette;

/**
 * Mapping from palette field to the CSS custom property that supplies its
 * value. The token set in src/tokens.css does not yet have purpose-specific
 * names (no --vessel-self, --route-active, etc.); this layer projects the
 * existing --safety-* and --color-* tokens onto purpose-specific fields so
 * canvas code stops asking the design system for tokens that do not yet
 * exist. When the token set grows, only this map changes.
 */
const TOKEN_MAP: Readonly<Record<PaletteField, string>> = {
  chartLand: '--color-surface-raised',
  chartDepthShallow: '--safety-depth-shallow',
  chartDepthMid: '--safety-depth-safe',
  chartDepthDeep: '--safety-depth-safe',
  vesselSelf: '--color-primary',
  vesselSelfMuted: '--color-text-muted',
  vesselAis: '--safety-ais-safe',
  vesselAisMoored: '--color-text-muted',
  routeActive: '--safety-route-active',
  routeInactive: '--color-text-muted',
  trailSelf: '--color-primary',
  trailAis: '--safety-ais-safe',
  anchorOk: '--safety-anchor',
  anchorBreached: '--safety-alert-alarm',
  note: '--color-accent',
  region: '--color-warning',
  waypoint: '--color-accent'
};

/**
 * Last-resort literals. Used only when the CSS custom property is missing
 * or computed-style returns an empty string. They mirror the light-theme
 * intent so a canvas never renders transparent black if the stylesheet
 * fails to load.
 */
const FALLBACKS: Readonly<MapThemePalette> = {
  chartLand: '#e8e6df',
  chartDepthShallow: '#d94f4f',
  chartDepthMid: '#4a78c4',
  chartDepthDeep: '#3155a0',
  vesselSelf: '#3b82c4',
  vesselSelfMuted: '#7a7a7a',
  vesselAis: '#3aa54a',
  vesselAisMoored: '#7a7a7a',
  routeActive: '#7a3ed1',
  routeInactive: '#7a7a7a',
  trailSelf: '#3b82c4',
  trailAis: '#3aa54a',
  anchorOk: '#3aa54a',
  anchorBreached: '#d94f4f',
  note: '#e0a52d',
  region: '#e0c52d',
  waypoint: '#e0a52d'
};

const PALETTE_FIELDS = Object.keys(TOKEN_MAP) as readonly PaletteField[];

@Injectable({ providedIn: 'root' })
export class MapThemeService implements OnDestroy {
  private readonly resolved = signal<MapThemePalette>(FALLBACKS);
  private readonly override = signal<Partial<MapThemePalette> | null>(null);

  readonly palette: Signal<MapThemePalette> = computed(() => {
    const base = this.resolved();
    const ov = this.override();
    if (!ov) {
      return base;
    }
    return { ...base, ...ov };
  });

  private observer: MutationObserver | null = null;

  constructor() {
    if (typeof document === 'undefined') {
      return;
    }
    this.resolved.set(this.readPalette());

    this.observer = new MutationObserver(() => {
      this.resolved.set(this.readPalette());
    });
    this.observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style']
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  /**
   * Replace one or more palette entries with literal values. Pass null to
   * clear the override and return to theme-driven resolution. Intended for
   * debug overlays and Playwright fixtures, not for normal theme switching.
   */
  setOverride(palette: Partial<MapThemePalette> | null): void {
    this.override.set(palette);
  }

  private readPalette(): MapThemePalette {
    const styles = getComputedStyle(document.documentElement);
    const next: Record<PaletteField, string> = { ...FALLBACKS };
    for (const field of PALETTE_FIELDS) {
      const token = TOKEN_MAP[field];
      const raw = styles.getPropertyValue(token).trim();
      next[field] = raw.length > 0 ? raw : FALLBACKS[field];
    }
    return next as MapThemePalette;
  }
}

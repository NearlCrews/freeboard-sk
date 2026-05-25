import { Signal, WritableSignal, computed, signal } from '@angular/core';

import {
  AgeThresholds,
  DEFAULT_THRESHOLDS,
  Delta,
  FreshnessState,
  Path,
  PathState,
  PathValueOf,
  SourceRef
} from './types';

interface RawState {
  value: unknown;
  lastUpdate: number;
  sourceRef: SourceRef | undefined;
}

const MISSING_RAW: RawState = {
  value: undefined,
  lastUpdate: 0,
  sourceRef: undefined
};

export interface SignalKStoreOptions {
  // Wall clock the store derives age from. Override in tests so age and state
  // transitions are deterministic.
  now?: () => number;
  // Default thresholds applied when thresholdsFor returns undefined.
  thresholds?: AgeThresholds;
  // Per-path family override. Returning undefined falls back to thresholds.
  thresholdsFor?: (path: Path) => AgeThresholds | undefined;
}

/**
 * Path-keyed reactive store for Signal K delta state.
 *
 * Holds one WritableSignal<RawState> per Path, allocated lazily on first
 * access via select() or applyDeltas(). select() returns a computed wrapper
 * that re-derives age and freshness from a monotonic clock plus a tick
 * signal, so age and state stay live between deltas when pulse() is driven
 * by an external scheduler (rAF, setInterval, or test code).
 *
 * Buffering of WS deltas lives in the WS bridge, not in this class:
 * applyDeltas() is synchronous and exists to be called from a bufferTime
 * flush.
 */
// Phase 1 ships the store as a plain class. Phase 3 wires it into Angular
// DI via an InjectionToken (or a factory provider) so callers can read
// configurable thresholds without coupling to the constructor.
export class SignalKStore {
  private readonly raw = new Map<Path, WritableSignal<RawState>>();
  private readonly selectors = new Map<Path, Signal<PathState<unknown>>>();
  private readonly tick = signal(0);
  private readonly now: () => number;
  private readonly defaultThresholds: AgeThresholds;
  // Explicit `| undefined` rather than `?:` so the constructor can assign
  // `options.thresholdsFor` directly under exactOptionalPropertyTypes.
  private readonly thresholdsFor:
    | ((path: Path) => AgeThresholds | undefined)
    | undefined;

  constructor(options: SignalKStoreOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.defaultThresholds = options.thresholds ?? DEFAULT_THRESHOLDS;
    this.thresholdsFor = options.thresholdsFor;
  }

  /**
   * Lazily allocate (or reuse) the selector for a path. Repeated calls with
   * the same Path return the identical Signal reference, so consumers can
   * compare by identity in effects and memoize on it.
   */
  select<P extends Path>(path: P): Signal<PathState<PathValueOf<P>>> {
    const cached = this.selectors.get(path);
    if (cached) {
      return cached as Signal<PathState<PathValueOf<P>>>;
    }
    const raw = this.getOrCreateRaw(path);
    const selector = computed<PathState<unknown>>(() => {
      this.tick();
      return this.derive(path, raw());
    });
    this.selectors.set(path, selector);
    return selector as Signal<PathState<PathValueOf<P>>>;
  }

  /**
   * Apply a batch of deltas in one synchronous pass. Intended to be invoked
   * by the WS bridge after a bufferTime(16) flush. Each unique path is
   * written once with the last value in the batch, then the freshness tick
   * fires once so all derived selectors recompute together.
   */
  applyDeltas(deltas: readonly Delta[]): void {
    if (deltas.length === 0) {
      return;
    }
    const updated = new Map<Path, RawState>();
    for (const delta of deltas) {
      for (const update of delta.updates) {
        const values = update.values;
        if (!values || values.length === 0) {
          continue;
        }
        const sourceRef = update.$source;
        const timestamp = this.parseTimestamp(update.timestamp);
        for (const v of values) {
          updated.set(v.path, {
            value: v.value,
            lastUpdate: timestamp,
            sourceRef
          });
        }
      }
    }
    if (updated.size === 0) {
      return;
    }
    for (const [path, next] of updated) {
      const sig = this.getOrCreateRaw(path);
      sig.set(next);
    }
    this.bumpTick();
  }

  /**
   * Force every selector to recompute age and freshness from the current
   * clock without applying new data. The WS bridge or a host scheduler
   * should call this on a steady cadence (rAF or 1 Hz) so 'fresh' to
   * 'stale' to 'missing' transitions are visible to consumers.
   */
  pulse(): void {
    this.bumpTick();
  }

  /**
   * Test and diagnostic helper: returns true if the underlying signal for
   * a path has been allocated. Distinguishes lazy untouched paths from
   * paths with explicit missing state.
   */
  has(path: Path): boolean {
    return this.raw.has(path);
  }

  /**
   * Test and diagnostic helper: clear all path state. Selector identities
   * are preserved so live consumers do not lose their reference.
   */
  reset(): void {
    for (const sig of this.raw.values()) {
      sig.set(MISSING_RAW);
    }
    this.bumpTick();
  }

  private getOrCreateRaw(path: Path): WritableSignal<RawState> {
    const existing = this.raw.get(path);
    if (existing) {
      return existing;
    }
    const created = signal<RawState>(MISSING_RAW);
    this.raw.set(path, created);
    return created;
  }

  private derive(path: Path, raw: RawState): PathState<unknown> {
    if (raw.lastUpdate === 0) {
      return {
        value: undefined,
        lastUpdate: 0,
        age: Number.POSITIVE_INFINITY,
        state: 'missing',
        sourceRef: undefined
      };
    }
    const age = Math.max(0, this.now() - raw.lastUpdate);
    const thresholds = this.thresholdsFor?.(path) ?? this.defaultThresholds;
    const state: FreshnessState =
      age > thresholds.missingMs
        ? 'missing'
        : age > thresholds.staleMs
          ? 'stale'
          : 'fresh';
    return {
      value: raw.value,
      lastUpdate: raw.lastUpdate,
      age,
      state,
      sourceRef: raw.sourceRef
    };
  }

  private parseTimestamp(ts: string | undefined): number {
    if (!ts) {
      return this.now();
    }
    const parsed = Date.parse(ts);
    return Number.isFinite(parsed) ? parsed : this.now();
  }

  private bumpTick(): void {
    this.tick.update((n) => n + 1);
  }
}

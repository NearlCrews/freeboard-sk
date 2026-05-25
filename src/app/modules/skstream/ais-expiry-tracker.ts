/**
 * AIS target expiry tracking.
 *
 * Phase 1 (Batch 3) extraction from skstream.worker.ts: pure, importable, and
 * deterministically testable. The slim worker drives this with an injected
 * interval; tests drive it with a manual clock and explicit tick() calls.
 *
 * No DOM, no Web Worker globals, no Angular DI: safe to import from worker
 * scope or main thread.
 */

export interface AisExpiryConfig {
  /** ms since lastUpdated after which a target is treated as expired and dropped. */
  maxAge: number;
  /** ms since lastUpdated after which a target is reported stale, still tracked. */
  staleAge: number;
}

export interface AisExpiryResult {
  /** Targets that transitioned to stale on this tick. Emitted once per stale run. */
  stale: string[];
  /** Targets that transitioned to expired on this tick. Removed from the tracker. */
  expired: string[];
}

export interface AisExpiryOptions extends Partial<AisExpiryConfig> {
  /** Injectable clock for deterministic tests. Defaults to Date.now. */
  now?: () => number;
}

const DEFAULT_MAX_AGE_MS = 540_000;
const DEFAULT_STALE_AGE_MS = 360_000;
const MIN_TTL_MS = 1;

export class AisExpiryTracker {
  private readonly lastSeen = new Map<string, number>();
  private readonly reportedStale = new Set<string>();
  private readonly now: () => number;
  private maxAge: number;
  private staleAge: number;

  constructor(options: AisExpiryOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.maxAge =
      typeof options.maxAge === 'number' && options.maxAge >= MIN_TTL_MS
        ? options.maxAge
        : DEFAULT_MAX_AGE_MS;
    this.staleAge =
      typeof options.staleAge === 'number' && options.staleAge >= MIN_TTL_MS
        ? options.staleAge
        : DEFAULT_STALE_AGE_MS;
  }

  /** Record that the given target ids were observed at the current clock time. */
  touch(ids: readonly string[]): void {
    if (ids.length === 0) {
      return;
    }
    const t = this.now();
    for (const id of ids) {
      this.lastSeen.set(id, t);
      this.reportedStale.delete(id);
    }
  }

  /** Drop a single target (e.g., explicit unsubscribe). */
  remove(id: string): void {
    this.lastSeen.delete(id);
    this.reportedStale.delete(id);
  }

  /** Drop every tracked target. */
  clear(): void {
    this.lastSeen.clear();
    this.reportedStale.clear();
  }

  /** Update TTL thresholds at runtime; preserves already-tracked targets. */
  setConfig(next: Partial<AisExpiryConfig>): void {
    if (typeof next.maxAge === 'number' && next.maxAge >= MIN_TTL_MS) {
      this.maxAge = next.maxAge;
    }
    if (typeof next.staleAge === 'number' && next.staleAge >= MIN_TTL_MS) {
      this.staleAge = next.staleAge;
    }
  }

  /** Number of tracked targets. Exposed for tests and diagnostics. */
  size(): number {
    return this.lastSeen.size;
  }

  /**
   * Walk the tracker once and report transitions.
   *
   * A target reports `stale` only the first time it crosses the staleAge
   * threshold; subsequent ticks while still stale do not re-emit. Touching the
   * target re-arms staleness so a later expiry will report again.
   */
  tick(): AisExpiryResult {
    const t = this.now();
    const staleCutoff = t - this.staleAge;
    const expiredCutoff = t - this.maxAge;
    const stale: string[] = [];
    const expired: string[] = [];

    for (const [id, seen] of this.lastSeen) {
      if (seen < expiredCutoff) {
        expired.push(id);
        this.lastSeen.delete(id);
        this.reportedStale.delete(id);
      } else if (seen < staleCutoff && !this.reportedStale.has(id)) {
        stale.push(id);
        this.reportedStale.add(id);
      }
    }

    return { stale, expired };
  }
}

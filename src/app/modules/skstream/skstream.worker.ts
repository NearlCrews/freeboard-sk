/// <reference lib="webworker" />

/**
 * Slim SignalK stream worker.
 *
 * Phase 1 (Batch 3) trim from ~1255 LOC to two responsibilities only:
 *   1) Off-thread SimplifyAP for autopilot path optimisation.
 *   2) Deterministic AIS target TTL expiry tracking.
 *
 * Everything else moved to main-thread services in this folder:
 *   - signalk-delta-processor.ts: WebSocket lifecycle, delta parsing,
 *     vessel / aircraft / aton / sar / meteo object assembly, watchdog timer.
 *   - vessel-trail.fetcher.ts: `/self/track` fetch and segmentation.
 * Per-path delta caching is handled by src/lib/signalk-store (Batch 2).
 *
 * Constraints (per CLAUDE.md):
 *   - Import-light: no OpenLayers, no Angular DI.
 *   - AIS expiry deterministic: TTLs and clock injectable for testing.
 */

import { SimplifyAP } from 'src/lib/simplify-ts';

import { AisExpiryTracker } from './ais-expiry-tracker';

const DEFAULT_TICK_INTERVAL_MS = 30_000;
const DEFAULT_SIMPLIFY_TOLERANCE = 0.0005;
const DEFAULT_SIMPLIFY_HIGH_QUALITY = true;

interface SimplifyCmd {
  cmd: 'simplify';
  requestId: number | string;
  coords: [number, number][];
  tolerance?: number;
  highQuality?: boolean;
}
interface AisTouchCmd {
  cmd: 'ais-touch';
  ids: string[];
}
interface AisRemoveCmd {
  cmd: 'ais-remove';
  id: string;
}
interface AisClearCmd {
  cmd: 'ais-clear';
}
interface AisConfigCmd {
  cmd: 'ais-config';
  maxAge?: number;
  staleAge?: number;
  intervalMs?: number;
}
interface CloseCmd {
  cmd: 'close';
}

type WorkerCmd =
  | SimplifyCmd
  | AisTouchCmd
  | AisRemoveCmd
  | AisClearCmd
  | AisConfigCmd
  | CloseCmd;

const tracker = new AisExpiryTracker();
let tickHandle: ReturnType<typeof setInterval> | null = null;
let tickIntervalMs = DEFAULT_TICK_INTERVAL_MS;

addEventListener('message', ({ data }: MessageEvent<WorkerCmd>) => {
  if (!data || !data.cmd) {
    return;
  }
  switch (data.cmd) {
    case 'simplify':
      runSimplify(data);
      return;
    case 'ais-touch':
      tracker.touch(data.ids);
      ensureTick();
      return;
    case 'ais-remove':
      tracker.remove(data.id);
      return;
    case 'ais-clear':
      tracker.clear();
      stopTick();
      return;
    case 'ais-config':
      tracker.setConfig({ maxAge: data.maxAge, staleAge: data.staleAge });
      if (typeof data.intervalMs === 'number' && data.intervalMs > 0) {
        tickIntervalMs = data.intervalMs;
        if (tickHandle) {
          restartTick();
        }
      }
      return;
    case 'close':
      stopTick();
      tracker.clear();
      return;
  }
});

function runSimplify(c: SimplifyCmd): void {
  const tolerance = c.tolerance ?? DEFAULT_SIMPLIFY_TOLERANCE;
  const highQuality = c.highQuality ?? DEFAULT_SIMPLIFY_HIGH_QUALITY;
  const result = SimplifyAP(c.coords, tolerance, highQuality);
  postMessage({ action: 'simplified', requestId: c.requestId, result });
}

function ensureTick(): void {
  if (tickHandle) {
    return;
  }
  tickHandle = setInterval(emitExpiry, tickIntervalMs);
}

function restartTick(): void {
  if (!tickHandle) {
    return;
  }
  clearInterval(tickHandle);
  tickHandle = setInterval(emitExpiry, tickIntervalMs);
}

function stopTick(): void {
  if (!tickHandle) {
    return;
  }
  clearInterval(tickHandle);
  tickHandle = null;
}

function emitExpiry(): void {
  const r = tracker.tick();
  if (r.stale.length === 0 && r.expired.length === 0) {
    return;
  }
  postMessage({ action: 'ais-expiry', result: r });
}

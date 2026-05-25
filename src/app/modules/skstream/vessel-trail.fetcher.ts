/**
 * Vessel trail fetcher (main-thread).
 *
 * Phase 1 (Batch 3) extraction from skstream.worker.ts. Pulls `/self/track`
 * segments from the SignalK API and hands the CPU-heavy SimplifyAP step to the
 * slim worker via a requestId / simplified roundtrip.
 */

import { Subject } from 'rxjs';

import { TrailMessage } from 'src/app/types/stream';

export interface VesselTrailConfig {
  trailDuration: number;
  trailResolution: {
    lastHour: string;
    next23: string;
    beyond24: string;
  };
}

export interface VesselTrailFetcherDeps {
  /** Resolves the SignalK REST base, e.g. `https://host:port/signalk/v1/api`. */
  apiUrl: () => string;
  playback: () => boolean;
  /** Posts a simplify request to the slim worker. */
  postSimplify: (req: {
    requestId: number;
    coords: [number, number][];
    tolerance: number;
    highQuality: boolean;
  }) => void;
  /** Subject the fetcher emits TrailMessage on. */
  trail$: Subject<TrailMessage>;
}

interface PendingSimplify {
  resolve: (coords: [number, number][]) => void;
  reject: (err: unknown) => void;
}

const SIMPLIFY_TOLERANCE = 0.0005;
const SIMPLIFY_HIGH_QUALITY = true;
const SEGMENT_LEN = 60;
const POINT_OFFSET = 0.000_000_005;

export class VesselTrailFetcher {
  private requestSeq = 0;
  private readonly pending = new Map<number, PendingSimplify>();

  constructor(private readonly deps: VesselTrailFetcherDeps) {}

  /** Receive a `{action: 'simplified', requestId, result}` event from the worker. */
  onSimplified(event: { requestId: number; result: [number, number][] }): void {
    const p = this.pending.get(event.requestId);
    if (!p) {
      return;
    }
    this.pending.delete(event.requestId);
    p.resolve(event.result);
  }

  async fetchTrail(opt: VesselTrailConfig): Promise<void> {
    const url = this.deps.apiUrl() + '/self/track?';
    const reqs: Promise<unknown>[] = [];
    if (opt.trailDuration > 24) {
      reqs.push(
        this.apiGet(
          `${url}timespan=${opt.trailDuration - 24}h&resolution=${opt.trailResolution.beyond24}&timespanOffset=24`
        )
      );
      reqs.push(
        this.apiGet(
          `${url}timespan=23h&resolution=${opt.trailResolution.next23}&timespanOffset=1`
        )
      );
    }
    if (opt.trailDuration > 1 && opt.trailDuration < 25) {
      reqs.push(
        this.apiGet(
          `${url}timespan=${opt.trailDuration - 1}h&resolution=${opt.trailResolution.next23}&timespanOffset=1`
        )
      );
    }
    reqs.push(
      this.apiGet(
        `${url}timespan=1h&resolution=${opt.trailResolution.lastHour}`
      )
    );

    const msg = new TrailMessage();
    msg.playback = this.deps.playback();

    try {
      const res = await Promise.all(reqs);
      let trail: [number, number][][] = [];
      const lastIdx = reqs.length - 1;
      for (let idx = 0; idx < res.length; idx++) {
        const r = res[idx] as {
          type?: string;
          coordinates?: [number, number][][];
        };
        if (r?.type !== 'MultiLineString' || !Array.isArray(r.coordinates)) {
          continue;
        }
        if (idx !== lastIdx) {
          // > 1hr: simplify via worker, then segment for OL rendering
          let coords: [number, number][] = await this.simplify(
            r.coordinates.flat()
          );
          while (coords.length > SEGMENT_LEN) {
            const ls = coords.slice(0, SEGMENT_LEN);
            trail.push(ls);
            coords = coords.slice(SEGMENT_LEN - 1);
            // offset first point so OL renders the segment join
            coords[0] = [
              coords[0][0] + POINT_OFFSET,
              coords[0][1] + POINT_OFFSET
            ];
          }
          if (coords.length !== 0) {
            trail.push(coords);
          }
        } else {
          // last hour: no simplification
          trail = trail.concat(r.coordinates);
        }
      }
      msg.result = trail as never;
      this.deps.trail$.next(msg);
    } catch {
      msg.result = null;
      this.deps.trail$.next(msg);
    }
  }

  private simplify(coords: [number, number][]): Promise<[number, number][]> {
    const requestId = ++this.requestSeq;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.deps.postSimplify({
        requestId,
        coords,
        tolerance: SIMPLIFY_TOLERANCE,
        highQuality: SIMPLIFY_HIGH_QUALITY
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private apiGet(url: string): Promise<any> {
    return fetch(url).then((r) => r.json());
  }
}
